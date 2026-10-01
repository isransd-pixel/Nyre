import { CircleCheck, TriangleAlert, Trophy } from "lucide-react";
import { deleteGoalAction } from "@/app/actions";
import { GoalIcon } from "@/components/goal-icon";
import { SubmitButton } from "@/components/submit-button";
import { Card } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { longMonth, today } from "@/lib/dates";
import { emergencyTarget, GOAL_TEMPLATES, goalProgress, nextMonthStart } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { getGoals, monthlyBasicSpending } from "@/lib/queries";
import { GoalEntryForm, NewGoalForm, type Template } from "./goal-forms";

const TONE = {
  done: { Icon: Trophy, text: "text-income" },
  good: { Icon: CircleCheck, text: "text-income" },
  warn: { Icon: TriangleAlert, text: "text-warn" },
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
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-semibold">Metas de ahorro</h2>
          <p className="mt-1 text-sm text-muted">
            Ponerle nombre al dinero ayuda a no gastarlo: en estudios con familias, separar el ahorro
            “para algo” aumentó lo guardado cerca de 30%. Toda la familia ve el avance.
          </p>
        </div>
        {goals.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-muted">Apartado en total</div>
            <div className="text-2xl font-semibold tabular-nums">{fmt(totalSaved)}</div>
          </div>
        )}
      </Card>

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
              <Card key={g.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <GoalIcon kind={g.kind} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{g.name}</h3>
                    <p className="text-sm text-muted">
                      {g.targetDate ? `Para ${longMonth(g.targetDate.slice(0, 7))}` : "Sin fecha"}
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
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{fmt(g.saved)}</span>
                  <span className="text-sm text-muted">
                    de {fmt(g.targetCents)} · {Math.round(p.pct * 100)}%
                  </span>
                </div>
                <div
                  className="h-3 rounded-full bg-bg"
                  role="img"
                  aria-label={`${Math.round(p.pct * 100)}% de la meta`}
                >
                  <div className="h-3 rounded-full" style={{ width: `${p.pct * 100}%`, background: "var(--series-1)" }} />
                </div>
                <p className={`flex items-center gap-1.5 text-sm ${tone.text}`}>
                  <tone.Icon className="h-4 w-4" aria-hidden />
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
        <h2 className="mb-4 font-semibold">{goals.length ? "Nueva meta" : "Creen su primera meta"}</h2>
        <NewGoalForm workspaceId={workspace.id} templates={templates} />
      </Card>

      <p className="text-xs text-muted">
        Las metas son dinero que apartan (en una cuenta, alcancía o tanda); no cuentan como gasto en el
        resumen.
      </p>
    </div>
  );
}
