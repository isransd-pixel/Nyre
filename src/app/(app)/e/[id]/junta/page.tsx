import { CalendarClock, HandCoins, ListChecks, MessageCircle, PiggyBank, ReceiptText } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { TipsCard } from "@/components/tips-card";
import { Card } from "@/components/ui";
import { VerdictBanner } from "@/components/verdict";
import { requireWorkspace } from "@/lib/auth";
import { budgetStatus, monthProgress } from "@/lib/budgets";
import { isMonth, longMonth, shiftMonth, shortDate, today } from "@/lib/dates";
import { simulatePlan } from "@/lib/debts";
import { goalProgress } from "@/lib/goals";
import { changeVs, monthVerdict } from "@/lib/insights";
import { categoryBreakdown, monthlySummary } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import { workspaceOverview } from "@/lib/overview";
import { getBudgets, getCategories, getTxsBetween } from "@/lib/queries";
import { PrintButton } from "./print-button";

function Section({ icon: Icon, title, children }: { icon: typeof PiggyBank; title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 break-inside-avoid">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-accent" aria-hidden />
        {title}
      </h2>
      {children}
    </Card>
  );
}

export default async function FamilyMeetingPage({ params, searchParams }: PageProps<"/e/[id]/junta">) {
  const { id } = await params;
  const { mes } = await searchParams;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const currentMonth = now.slice(0, 7);
  const month = isMonth(mes) && mes <= currentMonth ? mes : currentMonth;
  const prevMonth = shiftMonth(month, -1);
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  const base = `/e/${workspace.id}`;

  const txs = getTxsBetween([workspace.id], prevMonth, month);
  const [prev, cur] = monthlySummary(txs, [prevMonth, month]);
  const verdict = monthVerdict(cur.income, cur.expense, workspace.currency, workspace.kind);
  const categories = getCategories(workspace.id);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const budgets = getBudgets(workspace.id);
  const idByName = new Map(categories.filter((c) => c.type === "expense").map((c) => [c.name, c.id]));
  const top = categoryBreakdown(txs.filter((t) => t.date.startsWith(month)), "expense", names).slice(0, 5);
  const progress = monthProgress(month, now);

  const o = workspaceOverview(workspace, month, now);
  const upcoming = o.bills.filter((b) => b.days <= 14).sort((a, b) => a.days - b.days);
  const upcomingTotal = upcoming.reduce((a, b) => a + b.amountCents, 0);
  const openDebts = o.debts.filter((d) => d.balanceCents > 0);
  const minimums = openDebts.reduce((a, d) => a + d.minPaymentCents, 0);
  const plan = openDebts.length ? simulatePlan(openDebts, Math.ceil((minimums * 1.25) / 10000) * 10000, "snowball") : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="text-xl font-semibold">Junta familiar de {longMonth(month)}</h1>
            <p className="mt-1 text-sm text-muted">
              Platicar de dinero seguido, aunque sea de gastos pequeños, ayuda a las parejas y evita
              pleitos. Reúnanse 20 a 30 minutos, repasen esta hoja de arriba a abajo y terminen con uno o
              dos acuerdos.
            </p>
          </div>
          <PrintButton />
        </div>
        <div className="print:hidden">
          <MonthPicker month={month} current={currentMonth} basePath={`${base}/junta`} />
        </div>
      </Card>

      <Section icon={MessageCircle} title="1. ¿Cómo nos fue?">
        {verdict ? <VerdictBanner verdict={verdict} /> : <p className="text-sm text-muted">Sin movimientos este mes.</p>}
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {[
            ["Entró", cur.income, prev.income],
            ["Salió", cur.expense, prev.expense],
            ["Quedó", cur.net, prev.net],
          ].map(([label, value, before]) => {
            const change = changeVs(value as number, before as number);
            return (
              <div key={label as string}>
                <dt className="text-muted">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{fmt(value as number)}</dd>
                {change && (
                  <dd className="text-xs text-muted">
                    {change.pct === 0 ? "Igual que el mes anterior" : `${change.label} vs mes anterior`}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </Section>

      <Section icon={ReceiptText} title="2. ¿En qué se fue el dinero?">
        {top.length === 0 ? (
          <p className="text-sm text-muted">Sin gastos.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {top.map((c) => {
              const catId = idByName.get(c.name);
              const budget = catId ? budgets.get(catId) : undefined;
              const status = budget ? budgetStatus(c.total, budget, progress, workspace.currency) : null;
              return (
                <li key={c.name} className="flex flex-wrap justify-between gap-x-3">
                  <span>{c.name}</span>
                  <span className="tabular-nums">
                    {fmt(c.total)}
                    {status && (
                      <span className={`ml-2 text-xs ${status.tone === "bad" ? "text-expense" : status.tone === "warn" ? "text-warn" : "text-muted"}`}>
                        {status.message}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {o.hormiga && o.hormiga.count > 0 && (
          <p className="text-sm text-muted">
            Gastos hormiga: {fmt(o.hormiga.total)} en {o.hormiga.count} compras chicas.
          </p>
        )}
      </Section>

      <Section icon={CalendarClock} title="3. Lo que viene (próximas 2 semanas)">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No hay pagos fijos en las próximas 2 semanas.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5 text-sm">
              {upcoming.map((b) => (
                <li key={b.id} className="flex justify-between gap-3">
                  <span>
                    {b.name}{" "}
                    <span className={`text-xs ${b.days < 0 ? "text-expense" : "text-muted"}`}>
                      {b.days < 0 ? "vencido" : shortDate(b.nextDue)}
                    </span>
                  </span>
                  <span className="tabular-nums">{fmt(b.amountCents)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Necesitan tener listos <strong>{fmt(upcomingTotal)}</strong>.
            </p>
          </>
        )}
      </Section>

      <Section icon={PiggyBank} title="4. Nuestras metas">
        {o.goals.length === 0 ? (
          <p className="text-sm text-muted">Aún no tienen metas. ¿Empezamos con el fondo de emergencia?</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {o.goals.map((g) => {
              const p = goalProgress({ saved: g.saved, target: g.targetCents, targetDate: g.targetDate, today: now, recentMonthly: g.recentMonthly, fmt });
              return (
                <li key={g.id}>
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular-nums">
                      {fmt(g.saved)} de {fmt(g.targetCents)}
                    </span>
                  </div>
                  <div className="text-xs text-muted">{p.message}</div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section icon={HandCoins} title="5. Deudas">
        {openDebts.length === 0 ? (
          <p className="text-sm text-muted">Sin deudas registradas.</p>
        ) : (
          <div className="text-sm">
            <p>
              Deben <strong>{fmt(openDebts.reduce((a, d) => a + d.balanceCents, 0))}</strong> entre {openDebts.length}{" "}
              {openDebts.length === 1 ? "deuda" : "deudas"}.
            </p>
            {plan?.ok && plan.payoffs[0] && (
              <p className="text-muted">
                Siguiente en liquidar (bola de nieve): <strong className="text-text">{plan.payoffs[0].name}</strong>.
              </p>
            )}
          </div>
        )}
      </Section>

      {o.tips.length > 0 && <TipsCard tips={o.tips} base={base} limit={10} title="6. Para platicar" />}

      <Section icon={ListChecks} title={`${o.tips.length > 0 ? 7 : 6}. Nuestros acuerdos`}>
        <p className="text-sm text-muted">
          Ideas: ¿qué gasto vamos a recortar? ¿Cuánto apartamos y para qué meta? ¿Quién se encarga de qué
          pago?
        </p>
        <div className="flex flex-col gap-6 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border-b border-dashed border-line pb-1 text-sm text-muted">
              {n}.
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
