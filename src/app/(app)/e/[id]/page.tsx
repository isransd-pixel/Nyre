import Link from "next/link";
import { IncomeExpenseChart, MrrChart } from "@/components/charts";
import { MonthPicker } from "@/components/month-picker";
import { Card, Stat } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { isMonth, longMonth, shiftMonth, shortMonth, today } from "@/lib/dates";
import { categoryBreakdown, lastMonths, mrrHistory, monthlySummary, saasMetrics } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import { getCategories, getStripeConnection, getStripeSubs, getTxsBetween } from "@/lib/queries";

function pctChange(now: number, before: number) {
  if (before === 0) return undefined;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs mes anterior`;
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const { mes } = await searchParams;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const currentMonth = now.slice(0, 7);
  const month = isMonth(mes) && mes <= currentMonth ? mes : currentMonth;
  const fmt = (c: number) => formatMoney(c, workspace.currency);

  const months = lastMonths(`${month}-01`, 12);
  const txs = getTxsBetween([workspace.id], months[0], month);
  const summary = monthlySummary(txs, months);
  const cur = summary[summary.length - 1];
  const prev = summary[summary.length - 2];
  const monthTxs = txs.filter((t) => t.date.startsWith(month));
  const names = new Map(getCategories(workspace.id).map((c) => [c.id, c.name]));
  const byCategory = categoryBreakdown(monthTxs, "expense", names);
  const maxCat = byCategory[0]?.total ?? 0;
  const uncategorized = monthTxs.filter((t) => t.categoryId === null).length;
  const rate = cur.income > 0 ? Math.round((cur.net / cur.income) * 100) : null;

  const isBusiness = workspace.kind === "business";
  const stripe = isBusiness ? getStripeConnection(workspace.id) : undefined;
  const subs = stripe
    ? getStripeSubs(workspace.id).filter((s) => s.currency === workspace.currency.toLowerCase())
    : [];
  const saas = stripe ? saasMetrics(subs, now) : null;
  const mrrSeries = stripe ? mrrHistory(subs, lastMonths(now, 12), now) : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} current={currentMonth} basePath={`/e/${workspace.id}`} />
        <Link
          href={`/e/${workspace.id}/movimientos?mes=${month}`}
          className="text-sm text-accent hover:underline"
        >
          Ver movimientos de {longMonth(month)} →
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ingresos" value={fmt(cur.income)} tone="income" hint={pctChange(cur.income, prev.income)} />
        <Stat label="Gastos" value={fmt(cur.expense)} tone="expense" hint={pctChange(cur.expense, prev.expense)} />
        <Stat label="Balance" value={fmt(cur.net)} hint={`${shortMonth(shiftMonth(month, -1))}: ${fmt(prev.net)}`} />
        <Stat
          label={isBusiness ? "Margen" : "Tasa de ahorro"}
          value={rate === null ? "—" : `${rate}%`}
          hint={isBusiness ? "Balance ÷ ingresos" : "Lo que queda de cada peso que entra"}
        />
      </section>

      {uncategorized > 0 && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          Hay {uncategorized} movimientos sin categoría este mes.{" "}
          <Link
            className="text-accent hover:underline"
            href={`/e/${workspace.id}/movimientos?mes=${month}&categoria=none`}
          >
            Clasificarlos
          </Link>
        </p>
      )}

      {saas && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Métricas SaaS</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="MRR" value={fmt(saas.mrr)} hint={`ARR ${fmt(saas.arr)}`} />
            <Stat label="Clientes activos" value={String(saas.customers)} hint={`ARPU ${fmt(saas.arpu)}`} />
            <Stat
              label="Churn (30 días)"
              value={saas.customerChurn === null ? "—" : `${(saas.customerChurn * 100).toFixed(1)}%`}
              hint={`MRR nuevo ${fmt(saas.newMrr)} · perdido ${fmt(saas.churnedMrr)}`}
            />
            <Stat
              label="LTV estimado"
              value={saas.ltv === null ? "—" : fmt(saas.ltv)}
              hint="ARPU ÷ churn mensual"
            />
          </div>
          <Card>
            <h3 className="mb-2 font-medium">MRR, últimos 12 meses</h3>
            <MrrChart currency={workspace.currency} data={mrrSeries.map((r) => ({ label: shortMonth(r.month), mrr: r.mrr }))} />
            <p className="mt-2 text-xs text-muted">
              Reconstruido con los precios actuales de cada suscripción; no incluye descuentos.
            </p>
          </Card>
        </section>
      )}

      {isBusiness && !stripe && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">Conecta Stripe para ver MRR, churn y LTV</div>
            <div className="text-sm text-muted">Usa una llave restringida de solo lectura.</div>
          </div>
          <Link href={`/e/${workspace.id}/stripe`} className="text-sm text-accent hover:underline">
            Conectar →
          </Link>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-2 font-medium">Ingresos y gastos, últimos 12 meses</h2>
          <IncomeExpenseChart
            currency={workspace.currency}
            data={summary.map((s) => ({ ...s, label: shortMonth(s.month) }))}
          />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted">Ver como tabla</summary>
            <table className="mt-2 w-full tabular-nums">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 font-normal">Mes</th>
                  <th className="py-1 text-right font-normal">Ingresos</th>
                  <th className="py-1 text-right font-normal">Gastos</th>
                  <th className="py-1 text-right font-normal">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.month} className="border-t border-line">
                    <td className="py-1 capitalize">{longMonth(s.month)}</td>
                    <td className="py-1 text-right">{fmt(s.income)}</td>
                    <td className="py-1 text-right">{fmt(s.expense)}</td>
                    <td className="py-1 text-right">{fmt(s.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-medium">Gastos por categoría</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted">Sin gastos este mes.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {byCategory.map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-muted">
                      {fmt(c.total)} · {Math.round((c.total / cur.expense) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(c.total / maxCat) * 100}%`, background: "var(--series-2)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
