import { CircleCheck, PiggyBank, Plus, TriangleAlert, Trophy } from "lucide-react";
import { deleteGoalAction } from "@/app/actions";
import { GOAL_STYLE, GoalIcon } from "@/components/goal-icon";
import { ProgressRing } from "@/components/progress-ring";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, IntroCard } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { longMonth, today } from "@/lib/dates";
import { emergencyTarget, GOAL_TEMPLATES, goalProgress, nextMonthStart } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { getGoals, monthlyBasicSpending } from "@/lib/queries";
import { GoalEntryForm, NewGoalForm, type Template } from "./goal-forms";

const TONE = {
  done: { Icon: Trophy, text: "text-income", bg: "bg-income/10" },
  good: { Icon: CircleCheck, text: "text-income", bg: "bg-income/10" },
  warn: { Icon: TriangleAlert, text: "text-warn", bg: "bg-warn/10" },
};

export default async function GoalsPage({ params }: PageProps<"/e/[id]/metas">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  const goals = getGoals(workspace.id, now);
  const basic = monthlyBasicSpending(workspace.id, now);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);

  const hasEmergency = goals.some((g) => g.kind === "emergency");
  const templates: Template[] = GOAL_TEMPLATES.filter((t) => !(t.kind === "emergency" && hasEmergency)).map((t) => ({
    kind: t.kind,
    name: t.name,
    hint:
      t.kind === "emergency" && basic > 0
        ? `${t.hint} Sus gastos básicos son de unos ${fmt(basic)} al mes, así que 3 meses serían ${fmt(emergencyTarget(basic))}.`
        : t.hint,
    defaultDate: t.month ? nextMonthStart(t.month, now) : "",
    defaultTarget: t.kind === "emergency" && basic > 0 ? String(emergencyTarget(basic) / 100) : "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <IntroCard
        icon={PiggyBank}
        title="Metas de ahorro"
        aside={
          goals.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted">Apartado en total</div>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(totalSaved)}</div>
            </div>
          )
        }
      >
        Ponerle nombre al dinero ayuda a no gastarlo: en estudios con familias, separar el ahorro “para algo”
        aumentó lo guardado cerca de 30%. Toda la familia ve el avance.
      </IntroCard>

      {goals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const p = goalProgress({
              saved: g.saved,
              target: g.targetCents,
              targetDate: g.targetDate,
              today: now,
              recentMonthly: g.recentMonthly,
              fmt,
            });
            const tone = TONE[p.tone];
            return (
              <Card key={g.id} className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight">{g.name}</h3>
                    <p className="text-sm text-muted">
                      {g.targetDate ? `Para ${longMonth(g.targetDate.slice(0, 7))}` : "Sin fecha límite"}
                    </p>
                  </div>
                  <form action={deleteGoalAction.bind(null, workspace.id, g.id)}>
                    <SubmitButton
                      variant="danger"
                      pendingText="…"
                      confirm={`¿Borrar la meta "${g.name}"? Se pierde su historial de abonos.`}
                    >
                      Borrar
                    </SubmitButton>
                  </form>
                </div>
                <div className="flex items-center gap-5">
                  <ProgressRing
                    value={p.pct}
                    size={108}
                    stroke={11}
                    color={GOAL_STYLE[g.kind].ring}
                    label={`${Math.round(p.pct * 100)}% de la meta`}
                  >
                    <GoalIcon kind={g.kind} />
                    <span className="mt-1 text-sm font-semibold tabular-nums">{Math.round(p.pct * 100)}%</span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <div className="text-sm text-muted">Llevan</div>
                    <div className="text-2xl font-semibold tracking-tight tabular-nums">{fmt(g.saved)}</div>
                    <div className="text-sm text-muted">de {fmt(g.targetCents)}</div>
                    {p.remaining > 0 && (
                      <div className="mt-1 text-xs text-muted">Faltan {fmt(p.remaining)}</div>
                    )}
                  </div>
                </div>
                <p className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${tone.bg} ${tone.text}`}>
                  <tone.Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {p.message}
                </p>
                {g.kind === "emergency" && basic > 0 && (
                  <p className="text-xs text-muted">
                    Hoy cubre {(g.saved / basic).toFixed(1)} meses de gastos básicos ({fmt(basic)} al mes).
                  </p>
                )}
                <GoalEntryForm workspaceId={workspace.id} goalId={g.id} name={g.name} />
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardTitle icon={Plus}>{goals.length ? "Nueva meta" : "Creen su primera meta"}</CardTitle>
        <NewGoalForm workspaceId={workspace.id} templates={templates} />
      </Card>

      <p className="text-xs text-muted">
        Las metas son dinero que apartan (en una cuenta, alcancía o tanda); no cuentan como gasto en el
        resumen.
      </p>
    </div>
  );
}
