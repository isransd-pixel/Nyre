import "server-only";
import type { Workspace } from "@/db/schema";
import { daysUntil, monthlyEquivalent } from "./bills";
import { bucketSplit } from "./buckets";
import { minimumOnly } from "./debts";
import { hormigaExpenses, hormigaLimit } from "./hormiga";
import { formatMoney } from "./money";
import {
  getBills,
  getBudgets,
  getCategories,
  getDebts,
  getGoals,
  getTransactions,
  monthlyBasicSpending,
} from "./queries";
import { buildTips } from "./tips";

/**
 * Todo lo que el resumen y la junta familiar necesitan saber de un mes:
 * consejos, gastos hormiga, reparto 50/30/20, pagos que vienen, metas y deudas.
 */
export function workspaceOverview(workspace: Workspace, month: string, now: string) {
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  const isFamily = workspace.kind === "family";
  const categories = getCategories(workspace.id);
  const monthTxs = getTransactions(workspace.id, { month });

  const bills = getBills(workspace.id).map((b) => ({ ...b, days: daysUntil(b.nextDue, now) }));
  const subscriptionsYearly =
    bills.filter((b) => b.kind === "subscription").reduce((a, b) => a + monthlyEquivalent(b.amountCents, b.frequency), 0) * 12;

  const budgets = getBudgets(workspace.id);
  const spentByCategory = new Map<number, number>();
  for (const t of monthTxs) {
    if (t.type === "expense" && t.categoryId !== null) {
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amountCents);
    }
  }
  const overBudget = categories
    .filter((c) => budgets.has(c.id) && (spentByCategory.get(c.id) ?? 0) > budgets.get(c.id)!)
    .map((c) => ({ name: c.name, over: (spentByCategory.get(c.id) ?? 0) - budgets.get(c.id)! }));

  const goals = getGoals(workspace.id, now);
  const emergencyGoal = goals.find((g) => g.kind === "emergency");
  const basic = isFamily ? monthlyBasicSpending(workspace.id, now) : 0;

  const debts = getDebts(workspace.id);
  const minimumTraps = debts
    .filter((d) => d.balanceCents > 0)
    .map((d) => {
      const r = minimumOnly(d);
      return { name: d.name, years: r ? Math.floor(r.months / 12) : null };
    });

  const bucketById = new Map(categories.map((c) => [c.id, c.bucket]));
  const notHormiga = new Set(categories.filter((c) => c.bucket === "need" || c.bucket === "save").map((c) => c.id));
  const hormiga = isFamily
    ? hormigaExpenses(monthTxs, hormigaLimit(workspace.currency), notHormiga)
    : null;
  const split = isFamily ? bucketSplit(monthTxs, bucketById) : null;

  const isCurrent = month === now.slice(0, 7);
  const tips = isCurrent
    ? buildTips({
        fmt,
        month: Number(month.slice(5, 7)),
        bills: bills.map((b) => ({ name: b.name, amount: b.amountCents, daysUntil: b.days })),
        overBudget,
        emergency: isFamily ? { saved: emergencyGoal?.saved ?? 0, monthlyBasic: basic } : null,
        hasEmergencyGoal: !!emergencyGoal,
        minimumTraps,
        hormigaYearly: hormiga?.yearly ?? 0,
        subscriptionsYearly,
        seasonal: isFamily,
      })
    : [];

  return { tips, hormiga, split, bills, goals, debts, basic, overBudget, hormigaLimit: hormigaLimit(workspace.currency) };
}
