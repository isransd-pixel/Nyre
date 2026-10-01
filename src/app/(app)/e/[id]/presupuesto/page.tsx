import { CalendarDays, Target } from "lucide-react";
import { setBudgetAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryIcon } from "@/components/category-icon";
import { SubmitButton } from "@/components/submit-button";
import { Card, Input } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { budgetStatus, monthProgress, suggestBudget } from "@/lib/budgets";
import { longMonth, shiftMonth, today } from "@/lib/dates";
import { formatMoney, formatMoneyWhole } from "@/lib/money";
import { getBudgets, getCategories, getTxsBetween } from "@/lib/queries";

export default async function BudgetPage({ params }: PageProps<"/e/[id]/presupuesto">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const month = now.slice(0, 7);
  const progress = monthProgress(month, now);
  const fmt = (c: number) => formatMoney(c, workspace.currency);

  const categories = getCategories(workspace.id).filter((c) => c.type === "expense");
  const budgets = getBudgets(workspace.id);
  const pastMonths = [1, 2, 3].map((n) => shiftMonth(month, -n));
  const txs = getTxsBetween([workspace.id], pastMonths[2], month).filter((t) => t.type === "expense");

  const spentIn = (categoryId: number | null, m: string) =>
    txs.filter((t) => t.categoryId === categoryId && t.date.startsWith(m)).reduce((a, t) => a + t.amountCents, 0);

  const rows = categories.map((c) => {
    const budget = budgets.get(c.id);
    const spent = spentIn(c.id, month);
    return {
      category: c,
      budget,
      spent,
      status: budget ? budgetStatus(spent, budget, progress, workspace.currency) : null,
      suggestion: suggestBudget(pastMonths.map((m) => spentIn(c.id, m))),
    };
  });
  // Primero las que tienen presupuesto (las más usadas arriba), luego el resto por gasto.
  rows.sort((a, b) =>
    a.status && b.status ? b.status.pct - a.status.pct : a.status ? -1 : b.status ? 1 : b.spent - a.spent,
  );

  const totalBudget = rows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const totalSpent = rows.reduce((a, r) => a + (r.budget ? r.spent : 0), 0);
  const outside =
    txs.filter((t) => t.date.startsWith(month)).reduce((a, t) => a + t.amountCents, 0) - totalSpent;
  const total = totalBudget > 0 ? budgetStatus(totalSpent, totalBudget, progress, workspace.currency) : null;
  const daysLeft = Math.round((1 - progress) * new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate());

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Target className="h-4 w-4 text-accent" aria-hidden />
              Presupuesto de {longMonth(month)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ponle un tope a cada categoría. La barra se llena conforme gastas, y la rayita marca
              el día de hoy: si la barra la pasa, vas gastando más rápido que el mes.
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Faltan {daysLeft} días
          </span>
        </div>
        {total ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tabular-nums">{fmt(totalSpent)}</span>
              <span className="text-muted">de {fmt(totalBudget)} presupuestados</span>
            </div>
            <BudgetBar status={total} progress={progress} />
            {outside > 0 && (
              <p className="text-xs text-muted">
                Además gastaste {fmt(outside)} en categorías sin presupuesto o sin categoría.
              </p>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-bg px-3 py-2 text-sm">
            Aún no tienes presupuesto. Empieza por las categorías donde más gastas; te sugerimos un
            monto según tus últimos 3 meses.
          </p>
        )}
      </Card>

      <Card className="p-0">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <CategoryIcon name={r.category.name} type="expense" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{r.category.name}</span>
                    <span className="tabular-nums text-muted">
                      {fmt(r.spent)}
                      {r.budget ? ` de ${fmt(r.budget)}` : ""}
                    </span>
                  </div>
                  {r.status ? (
                    <div className="mt-1.5">
                      <BudgetBar status={r.status} progress={progress} />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted">
                      Sin presupuesto
                      {r.suggestion
                        ? ` · en promedio gastas ${formatMoneyWhole(r.suggestion, workspace.currency)} al mes`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:w-64 sm:justify-end">
                <ActionForm
                  action={setBudgetAction.bind(null, workspace.id, r.category.id)}
                  resetOnSuccess={false}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Input
                    name="amount"
                    inputMode="decimal"
                    aria-label={`Presupuesto mensual de ${r.category.name}`}
                    placeholder={r.suggestion ? String(r.suggestion / 100) : "Monto al mes"}
                    defaultValue={r.budget ? String(r.budget / 100) : ""}
                    className="w-32"
                  />
                  <SubmitButton variant="secondary" pendingText="…">
                    Guardar
                  </SubmitButton>
                </ActionForm>
                {!r.budget && r.suggestion && (
                  <ActionForm
                    action={setBudgetAction.bind(null, workspace.id, r.category.id)}
                    resetOnSuccess={false}
                  >
                    <input type="hidden" name="amount" value={String(r.suggestion / 100)} />
                    <button className="text-xs text-accent hover:underline">
                      Usar {formatMoneyWhole(r.suggestion, workspace.currency)}
                    </button>
                  </ActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-muted">Para quitar un presupuesto, deja el monto vacío y guarda.</p>
    </div>
  );
}
