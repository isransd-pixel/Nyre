import Link from "next/link";
import { ArrowDown, ArrowUp, PiggyBank, Tags, Target, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { BucketCard } from "@/components/bucket-card";
import { BudgetBar } from "@/components/budget-bar";
import { HormigaCard } from "@/components/hormiga-card";
import { TipsCard } from "@/components/tips-card";
import { CategoryIcon } from "@/components/category-icon";
import { IncomeExpenseChart, MrrChart } from "@/components/charts";
import { Explain } from "@/components/explain";
import { FlowBar } from "@/components/flow-bar";
import { MonthPicker } from "@/components/month-picker";
import { SetupChecklist, type Step } from "@/components/setup-checklist";
import { Card, Stat } from "@/components/ui";
import { VerdictBanner } from "@/components/verdict";
import { requireWorkspace } from "@/lib/auth";
import { isMonth, longMonth, shiftMonth, shortMonth, today } from "@/lib/dates";
import { budgetStatus, monthProgress } from "@/lib/budgets";
import { changeVs, monthVerdict } from "@/lib/insights";
import { workspaceOverview } from "@/lib/overview";
import { categoryBreakdown, lastMonths, mrrHistory, monthlySummary, saasMetrics } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import {
  getBudgets,
  getCategories,
  getSetupStatus,
  getStripeConnection,
  getStripeSubs,
  getTxsBetween,
} from "@/lib/queries";

function ChangeHint({ now, before, month, goodWhenUp }: { now: number; before: number; month: string; goodWhenUp: boolean }) {
  const change = changeVs(now, before);
  if (!change || change.pct === 0) return <>Igual que en {shortMonth(month)}</>;
  const Arrow = change.pct > 0 ? ArrowUp : ArrowDown;
  const good = change.pct > 0 === goodWhenUp;
  return (
    <span className="inline-flex items-center gap-1">
      <Arrow className={`h-3 w-3 ${good ? "text-income" : "text-expense"}`} aria-hidden />
      {change.label} vs {shortMonth(month)}
    </span>
  );
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const { mes } = await searchParams;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const currentMonth = now.slice(0, 7);
  const month = isMonth(mes) && mes <= currentMonth ? mes : currentMonth;
  const prevMonth = shiftMonth(month, -1);
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  const base = `/e/${workspace.id}`;
  const isBusiness = workspace.kind === "business";

  const months = lastMonths(`${month}-01`, 12);
  const txs = getTxsBetween([workspace.id], months[0], month);
  const summary = monthlySummary(txs, months);
  const cur = summary[summary.length - 1];
  const prev = summary[summary.length - 2];
  const verdict = monthVerdict(cur.income, cur.expense, workspace.currency, workspace.kind);

  const categories = getCategories(workspace.id);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const budgets = getBudgets(workspace.id);
  const budgetByName = new Map(
    categories.filter((c) => c.type === "expense" && budgets.has(c.id)).map((c) => [c.name, budgets.get(c.id)!]),
  );
  const progress = monthProgress(month, now);
  const monthTxs = txs.filter((t) => t.date.startsWith(month));
  const byCategory = categoryBreakdown(monthTxs, "expense", names);
  const prevByCategory = new Map(
    categoryBreakdown(txs.filter((t) => t.date.startsWith(prevMonth)), "expense", names).map((c) => [c.name, c.total]),
  );
  const maxCat = byCategory[0]?.total ?? 0;
  const uncategorized = monthTxs.filter((t) => t.categoryId === null).length;
  const totalBudget = [...budgets.values()].reduce((a, b) => a + b, 0);
  const spentBudgeted = monthTxs
    .filter((t) => t.type === "expense" && t.categoryId !== null && budgets.has(t.categoryId))
    .reduce((a, t) => a + t.amountCents, 0);
  const budgetTotal =
    totalBudget > 0 ? budgetStatus(spentBudgeted, totalBudget, progress, workspace.currency) : null;

  const setup = getSetupStatus(workspace.id);
  const steps: Step[] = isBusiness
    ? [
        { done: setup.manual, title: "Anota un movimiento", detail: "Un gasto o ingreso, a mano.", href: `${base}/movimientos` },
        { done: setup.csv, title: "Sube el CSV del banco", detail: "Trae todos tus movimientos de golpe.", href: `${base}/importar` },
        { done: setup.budgets, title: "Ponte un presupuesto", detail: "Un tope al mes por categoría.", href: `${base}/presupuesto` },
        { done: setup.stripe, title: "Conecta Stripe", detail: "Para ver MRR, churn y LTV.", href: `${base}/stripe` },
      ]
    : [
        { done: setup.manual || setup.csv, title: "Anota tus gastos", detail: "A mano o subiendo el CSV del banco.", href: `${base}/movimientos` },
        { done: setup.budgets, title: "Ponte un presupuesto", detail: "Un tope al mes por categoría.", href: `${base}/presupuesto` },
        { done: setup.bills, title: "Anota tus pagos fijos", detail: "Luz, internet, colegiaturas… con aviso antes de que venzan.", href: `${base}/pagos` },
        { done: setup.goals, title: "Empieza tu fondo de emergencia", detail: "Para imprevistos, sin endeudarse.", href: `${base}/metas` },
        { done: setup.members, title: "Invita a tu familia", detail: "Que cada quien anote sus gastos.", href: `${base}/ajustes` },
      ];
  const overview = workspaceOverview(workspace, month, now);

  const stripe = isBusiness ? getStripeConnection(workspace.id) : undefined;
  const subs = stripe
    ? getStripeSubs(workspace.id).filter((s) => s.currency === workspace.currency.toLowerCase())
    : [];
  const saas = stripe ? saasMetrics(subs, now) : null;
  const mrrSeries = stripe ? mrrHistory(subs, lastMonths(now, 12), now) : [];
  const netNewMrr = saas ? saas.newMrr - saas.churnedMrr : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} current={currentMonth} basePath={base} />
        <Link href={`${base}/movimientos?mes=${month}`} className="text-sm text-accent hover:underline">
          Ver todos los movimientos →
        </Link>
      </div>

      {/* 1. El mes en una frase */}
      <Card className="flex flex-col gap-5">
        {verdict ? (
          <VerdictBanner verdict={verdict} />
        ) : (
          <div>
            <div className="text-lg font-semibold">Aún no hay movimientos en {longMonth(month)}</div>
            <div className="text-sm text-muted">Sigue los primeros pasos de abajo para empezar.</div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Entró", value: cur.income, before: prev.income, Icon: TrendingUp, color: "text-income", up: true },
            { label: "Salió", value: cur.expense, before: prev.expense, Icon: TrendingDown, color: "text-expense", up: false },
            { label: isBusiness ? "Ganancia" : "Te quedó", value: cur.net, before: prev.net, Icon: PiggyBank, color: "", up: true },
          ].map((k) => (
            <div key={k.label}>
              <div className="flex items-center gap-2 text-sm text-muted">
                <k.Icon className="h-4 w-4" aria-hidden />
                {k.label}
              </div>
              <div className={`text-3xl font-semibold tabular-nums ${k.color}`}>{fmt(k.value)}</div>
              <div className="mt-0.5 text-xs text-muted">
                <ChangeHint now={k.value} before={k.before} month={prevMonth} goodWhenUp={k.up} />
              </div>
            </div>
          ))}
        </div>
        <FlowBar
          income={cur.income}
          expense={cur.expense}
          currency={workspace.currency}
          keptLabel={isBusiness ? "Ganancia" : "Te quedó"}
        />
      </Card>

      <TipsCard tips={overview.tips} base={base} />

      <SetupChecklist steps={steps} />

      {budgetTotal && (
        <Link href={`${base}/presupuesto`} className="group">
          <Card className="flex flex-col gap-3 transition group-hover:border-accent">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Target className="h-4 w-4 text-accent" aria-hidden />
                Presupuesto
              </h2>
              <span className="text-sm text-muted">
                <span className="font-medium text-text tabular-nums">{fmt(spentBudgeted)}</span> de{" "}
                {fmt(totalBudget)}
              </span>
            </div>
            <BudgetBar status={budgetTotal} progress={progress} />
          </Card>
        </Link>
      )}

      {overview.split && overview.hormiga && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BucketCard split={overview.split} currency={workspace.currency} base={base} />
          <HormigaCard hormiga={overview.hormiga} currency={workspace.currency} limit={overview.hormigaLimit} />
        </div>
      )}

      {uncategorized > 0 && (
        <Link
          href={`${base}/movimientos?mes=${month}&categoria=none`}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:border-accent"
        >
          <Tags className="h-4 w-4 text-accent" aria-hidden />
          <span className="flex-1">
            <strong>{uncategorized} movimientos</strong> no tienen categoría. Clasifícalos para que el
            resumen sea más claro.
          </span>
          <span className="text-accent">Clasificar →</span>
        </Link>
      )}

      {/* 2. SaaS */}
      {saas && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Tu SaaS en números</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={Wallet}
              label="Ingreso mensual (MRR)"
              value={fmt(saas.mrr)}
              hint={`Al año: ${fmt(saas.arr)}`}
              explain="Lo que te pagan cada mes tus suscripciones activas, sumado. Es el número más importante de un SaaS: si sube, el negocio crece."
            />
            <Stat
              icon={Users}
              label="Clientes que pagan"
              value={String(saas.customers)}
              hint={`Cada uno paga en promedio ${fmt(saas.arpu)} al mes`}
              explain="Clientes con al menos una suscripción activa. El promedio (ARPU) es tu MRR dividido entre ellos."
            />
            <Stat
              icon={TrendingDown}
              label="Cancelaciones (churn)"
              value={saas.customerChurn === null ? "—" : `${(saas.customerChurn * 100).toFixed(1)}%`}
              hint="Clientes que se fueron en los últimos 30 días"
              explain="De los clientes que tenías hace 30 días, qué porcentaje canceló. Mientras más bajo, mejor. Como referencia general, en SaaS pequeños menos de 5% al mes se considera sano."
            />
            <Stat
              icon={PiggyBank}
              label="Valor de un cliente (LTV)"
              value={saas.ltv === null ? "—" : fmt(saas.ltv)}
              hint="Lo que te deja un cliente en toda su vida"
              explain="Estimación de cuánto te paga un cliente desde que entra hasta que cancela: lo que paga al mes ÷ el churn mensual. Te dice cuánto puedes gastar para conseguir un cliente nuevo."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 font-medium">
                Movimiento del MRR (30 días)
                <Explain title="Movimiento del MRR">
                  Cuánto MRR ganaste con clientes nuevos y cuánto perdiste por cancelaciones. La
                  diferencia es lo que realmente creció tu ingreso mensual.
                </Explain>
              </h3>
              {[
                { label: "Nuevo", value: saas.newMrr, color: "var(--series-1)" },
                { label: "Perdido", value: saas.churnedMrr, color: "var(--series-2)" },
              ].map((r) => (
                <div key={r.label} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{r.label}</span>
                    <span className="tabular-nums">{fmt(r.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(r.value / Math.max(saas.newMrr, saas.churnedMrr, 1)) * 100}%`,
                        background: r.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-auto border-t border-line pt-3 text-sm">
                Crecimiento neto:{" "}
                <strong className={netNewMrr >= 0 ? "text-income" : "text-expense"}>
                  {netNewMrr >= 0 ? "+" : "−"}
                  {fmt(Math.abs(netNewMrr))}
                </strong>
                <p className="mt-1 text-xs text-muted">
                  {netNewMrr > 0
                    ? "Entraron más clientes de los que se fueron: tu ingreso mensual está creciendo."
                    : netNewMrr < 0
                      ? "Se fue más ingreso del que entró. Vale la pena preguntar por qué cancelan."
                      : "Lo que entró y lo que se fue quedaron empatados."}
                </p>
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="mb-2 font-medium">MRR, últimos 12 meses</h3>
              <MrrChart currency={workspace.currency} data={mrrSeries.map((r) => ({ label: shortMonth(r.month), mrr: r.mrr }))} />
              <p className="mt-2 text-xs text-muted">
                Calculado con el precio actual de cada suscripción; no incluye descuentos.
              </p>
            </Card>
          </div>
        </section>
      )}

      {isBusiness && !stripe && setup.manual && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">Conecta Stripe para ver MRR, cancelaciones y valor por cliente</div>
            <div className="text-sm text-muted">Solo lectura. Tarda un minuto.</div>
          </div>
          <Link href={`${base}/stripe`} className="text-sm text-accent hover:underline">
            Conectar →
          </Link>
        </Card>
      )}

      {/* 3. ¿En qué se fue el dinero? */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-semibold">¿En qué se fue el dinero?</h2>
          <p className="mb-4 text-sm text-muted">Gastos de {longMonth(month)}, de mayor a menor.</p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted">Sin gastos este mes.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {byCategory.map((c) => {
                const change = changeVs(c.total, prevByCategory.get(c.name) ?? 0);
                const budget = budgetByName.get(c.name);
                const status = budget ? budgetStatus(c.total, budget, progress, workspace.currency) : null;
                return (
                  <li key={c.name} className="flex items-center gap-3 text-sm">
                    <CategoryIcon name={c.name === "Sin categoría" ? null : c.name} type="expense" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between gap-2">
                        <span className="truncate">{c.name}</span>
                        <span className="tabular-nums">
                          {fmt(c.total)}
                          {budget && <span className="text-muted"> de {fmt(budget)}</span>}
                        </span>
                      </div>
                      {status ? (
                        <BudgetBar status={status} progress={progress} />
                      ) : (
                        <div className="h-2 rounded-full bg-bg">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${(c.total / maxCat) * 100}%`, background: "var(--series-2)" }}
                          />
                        </div>
                      )}
                      <div className="mt-1 flex justify-between text-xs text-muted">
                        <span>{Math.round((c.total / cur.expense) * 100)}% del gasto</span>
                        {change && change.pct !== 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            {change.pct > 0 ? (
                              <ArrowUp className="h-3 w-3 text-expense" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-income" aria-hidden />
                            )}
                            {change.label} vs {shortMonth(prevMonth)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="mb-1 font-semibold">Mes a mes</h2>
          <p className="mb-2 text-sm text-muted">
            Si la barra azul es más alta que la naranja, ese mes te sobró dinero.
          </p>
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
                  <th className="py-1 text-right font-normal">Entró</th>
                  <th className="py-1 text-right font-normal">Salió</th>
                  <th className="py-1 text-right font-normal">Quedó</th>
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
      </div>
    </div>
  );
}
