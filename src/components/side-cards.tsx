import Link from "next/link";
import { BellRing, ChevronRight, PiggyBank, Target } from "lucide-react";
import type { BudgetStatus } from "@/lib/budgets";
import { dueLabel, type BillKind } from "@/lib/bills";
import type { GoalKind } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { BillIcon } from "./bill-icon";
import { GOAL_STYLE, GoalIcon } from "./goal-icon";
import { ProgressRing } from "./progress-ring";
import { Card, CardTitle } from "./ui";

const more = "inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:underline";
const DUE_TONE = { bad: "text-expense", warn: "text-warn", muted: "text-muted" };

export function UpcomingBillsCard({
  bills,
  today,
  currency,
  href,
}: {
  bills: { id: number; name: string; kind: BillKind; amountCents: number; nextDue: string }[];
  today: string;
  currency: string;
  href: string;
}) {
  const next = bills.slice(0, 4);
  return (
    <Card>
      <CardTitle icon={BellRing} action={<Link href={href} className={more}>Ver <ChevronRight className="h-4 w-4" aria-hidden /></Link>}>
        Próximos pagos
      </CardTitle>
      {next.length === 0 ? (
        <p className="text-sm text-muted">
          Anota la luz, el internet o la colegiatura y te avisamos antes de que venzan.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {next.map((b) => {
            const due = dueLabel(b.nextDue, today);
            return (
              <li key={b.id} className="flex items-center gap-3">
                <BillIcon kind={b.kind} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.name}</div>
                  <div className={`text-xs ${DUE_TONE[due.tone]}`}>{due.text}</div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{formatMoney(b.amountCents, currency)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const BUDGET_COLOR = { good: "var(--accent)", warn: "var(--warn)", bad: "var(--expense)" };

export function BudgetMiniCard({
  status,
  spent,
  total,
  currency,
  href,
}: {
  status: BudgetStatus;
  spent: number;
  total: number;
  currency: string;
  href: string;
}) {
  return (
    <Card>
      <CardTitle icon={Target} action={<Link href={href} className={more}>Ver <ChevronRight className="h-4 w-4" aria-hidden /></Link>}>
        Presupuesto
      </CardTitle>
      <div className="flex items-center gap-4">
        <ProgressRing value={status.pct} size={84} stroke={9} color={BUDGET_COLOR[status.tone]} label={`${Math.round(status.pct * 100)}% del presupuesto usado`}>
          <span className="text-lg font-semibold tabular-nums">{Math.round(status.pct * 100)}%</span>
        </ProgressRing>
        <div className="min-w-0 text-sm">
          <div className="font-semibold tabular-nums">{formatMoney(spent, currency)}</div>
          <div className="text-muted">de {formatMoney(total, currency)}</div>
          <div className={`mt-1 text-xs ${status.tone === "bad" ? "text-expense" : status.tone === "warn" ? "text-warn" : "text-income"}`}>
            {status.message}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function GoalsMiniCard({
  goals,
  currency,
  href,
}: {
  goals: { id: number; name: string; kind: GoalKind; saved: number; targetCents: number }[];
  currency: string;
  href: string;
}) {
  return (
    <Card>
      <CardTitle icon={PiggyBank} action={<Link href={href} className={more}>Ver <ChevronRight className="h-4 w-4" aria-hidden /></Link>}>
        Metas de ahorro
      </CardTitle>
      {goals.length === 0 ? (
        <p className="text-sm text-muted">Empieza con un fondo de emergencia: es la base de todo lo demás.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.slice(0, 3).map((g) => {
            const pct = g.targetCents > 0 ? Math.min(1, g.saved / g.targetCents) : 0;
            return (
              <li key={g.id} className="flex items-center gap-3">
                <ProgressRing value={pct} size={44} stroke={5} color={GOAL_STYLE[g.kind].ring} label={`${Math.round(pct * 100)}% de ${g.name}`}>
                  <GoalIcon kind={g.kind} size="sm" />
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{g.name}</div>
                  <div className="text-xs text-muted tabular-nums">
                    {formatMoney(g.saved, currency)} de {formatMoney(g.targetCents, currency)}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{Math.round(pct * 100)}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
