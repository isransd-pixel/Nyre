import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Tags,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { BucketCard } from "@/components/bucket-card";
import { BudgetBar } from "@/components/budget-bar";
import { HormigaCard } from "@/components/hormiga-card";
import { TipsCard } from "@/components/tips-card";
import { CategoryIcon } from "@/components/category-icon";
import { IncomeExpenseChart, MrrChart } from "@/components/charts";
import { Explain } from "@/components/explain";
import { HeroCard } from "@/components/hero-card";
import { MonthPicker } from "@/components/month-picker";
import { SetupChecklist, type Step } from "@/components/setup-checklist";
import { BudgetMiniCard, GoalsMiniCard, UpcomingBillsCard } from "@/components/side-cards";
import { Sparkline } from "@/components/sparkline";
import { buttonClass, Card, CardTitle, IconTile, Stat } from "@/components/ui";
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

  const categoryCard = (
    <Card>
      <CardTitle icon={Wallet} hint={`Gastos de ${longMonth(month)}, de mayor a menor.`}>
        ¿En qué se fue el dinero?
      </CardTitle>
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
                  <div className="mb-1.5 flex justify-between gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="font-semibold tabular-nums">
                      {fmt(c.total)}
                      {budget && <span className="font-normal text-muted"> de {fmt(budget)}</span>}
                    </span>
                  </div>
                  {status ? (
                    <BudgetBar status={status} progress={progress} />
                  ) : (
                    <div className="h-2 rounded-full bg-surface-2">
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
      {uncategorized > 0 && (
        <Link
          href={`${base}/movimientos?mes=${month}&categoria=none`}
          className="mt-5 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent transition hover:brightness-95"
        >
          <Tags className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">
            <strong>{uncategorized} movimientos</strong> sin categoría. Clasifícalos para un resumen más claro.
          </span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </Card>
  );

  const monthlyCard = (
    <Card>
      <CardTitle icon={BarChart3} hint="Si la barra azul es más alta que la naranja, ese mes te sobró dinero.">
        Mes a mes
      </CardTitle>
      <IncomeExpenseChart currency={workspace.currency} data={summary.map((s) => ({ ...s, label: shortMonth(s.month) }))} />
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
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} current={currentMonth} basePath={base} />
        <Link
          href={`${base}/movimientos?mes=${month}`}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:underline"
        >
          Ver todos los movimientos <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <SetupChecklist steps={steps} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="contents lg:col-span-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <div className="order-1 min-w-0 lg:order-none">
          <HeroCard
            monthLabel={longMonth(month)}
            verdict={verdict}
            income={cur.income}
            expense={cur.expense}
            prevIncome={prev.income}
            prevExpense={prev.expense}
            currency={workspace.currency}
            keptLabel={isBusiness ? "Ganancia del mes" : "Te quedó este mes"}
          />
          </div>

          {saas && (
            <section className="order-3 flex min-w-0 flex-col gap-4 lg:order-none">
              <h2 className="text-lg font-semibold tracking-tight">Tu SaaS en números</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Stat
                  icon={Wallet}
                  label="Ingreso mensual (MRR)"
                  value={fmt(saas.mrr)}
                  hint={`Al año: ${fmt(saas.arr)}`}
                  explain="Lo que te pagan cada mes tus suscripciones activas, sumado. Es el número más importante de un SaaS: si sube, el negocio crece."
                  footer={<Sparkline id="spark-mrr" values={mrrSeries.map((r) => r.mrr)} color="var(--series-1)" label="Tendencia del MRR" />}
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
                  tone={saas.customerChurn !== null && saas.customerChurn > 0.05 ? "expense" : undefined}
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
              <Card>
                <CardTitle icon={TrendingUp} hint="Calculado con el precio actual de cada suscripción; no incluye descuentos.">
                  MRR, últimos 12 meses
                </CardTitle>
                <MrrChart currency={workspace.currency} data={mrrSeries.map((r) => ({ label: shortMonth(r.month), mrr: r.mrr }))} />
              </Card>
            </section>
          )}

          {isBusiness && !stripe && setup.manual && (
            <Card className="order-3 flex flex-wrap items-center gap-4 lg:order-none">
              <IconTile icon={CreditCard} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Conecta Stripe para ver MRR, cancelaciones y valor por cliente</div>
                <div className="text-sm text-muted">Solo lectura. Tarda un minuto.</div>
              </div>
              <Link href={`${base}/stripe`} className={buttonClass.secondary}>
                Conectar
              </Link>
            </Card>
          )}

          <div className="order-5 min-w-0 lg:order-none">{categoryCard}</div>
          {overview.split && (
            <div className="order-7 min-w-0 lg:order-none">
              <BucketCard split={overview.split} currency={workspace.currency} base={base} />
            </div>
          )}
          <div className="order-10 min-w-0 lg:order-none">{monthlyCard}</div>
        </div>

        <aside className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <div className="order-2 min-w-0 empty:hidden lg:order-none">
            <TipsCard tips={overview.tips} base={base} />
          </div>
          <div className="order-4 min-w-0 lg:order-none">
            <UpcomingBillsCard bills={overview.bills} today={now} currency={workspace.currency} href={`${base}/pagos`} />
          </div>
          {budgetTotal && (
            <div className="order-6 min-w-0 lg:order-none">
              <BudgetMiniCard status={budgetTotal} spent={spentBudgeted} total={totalBudget} currency={workspace.currency} href={`${base}/presupuesto`} />
            </div>
          )}
          <div className="order-8 min-w-0 lg:order-none">
            <GoalsMiniCard goals={overview.goals} currency={workspace.currency} href={`${base}/metas`} />
          </div>
          {overview.hormiga && (
            <div className="order-9 min-w-0 lg:order-none">
              <HormigaCard hormiga={overview.hormiga} currency={workspace.currency} limit={overview.hormigaLimit} />
            </div>
          )}
          {saas && (
            <Card className="order-3 flex flex-col gap-3 lg:order-none">
              <CardTitle icon={TrendingUp}>
                <span className="flex items-center gap-2">
                  Movimiento del MRR
                  <Explain title="Movimiento del MRR">
                    Cuánto MRR ganaste con clientes nuevos y cuánto perdiste por cancelaciones en los últimos
                    30 días. La diferencia es lo que realmente creció tu ingreso mensual.
                  </Explain>
                </span>
              </CardTitle>
              {[
                { label: "Nuevo", value: saas.newMrr, color: "var(--series-1)" },
                { label: "Perdido", value: saas.churnedMrr, color: "var(--series-2)" },
              ].map((r) => (
                <div key={r.label} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{r.label}</span>
                    <span className="font-semibold tabular-nums">{fmt(r.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(r.value / Math.max(saas.newMrr, saas.churnedMrr, 1)) * 100}%`, background: r.color }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-1 rounded-2xl bg-surface-2 p-3 text-sm">
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
          )}
        </aside>
      </div>
    </div>
  );
}
