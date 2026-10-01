import { formatMoney } from "./money";

/** Qué fracción del mes ya pasó (0–1). Meses pasados cuentan como completos. */
export function monthProgress(month: string, today: string): number {
  const current = today.slice(0, 7);
  if (month < current) return 1;
  if (month > current) return 0;
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Number(today.slice(8, 10)) / days;
}

export type BudgetStatus = {
  spent: number;
  budget: number;
  /** spent / budget, sin tope (1.2 = 120%). */
  pct: number;
  tone: "good" | "warn" | "bad";
  message: string;
};

/**
 * Compara lo gastado contra el presupuesto y contra el avance del mes:
 * gastar 60% del presupuesto el día 10 es ir rápido; el día 25 está bien.
 */
export function budgetStatus(spent: number, budget: number, progress: number, currency: string): BudgetStatus {
  const fmt = (c: number) => formatMoney(c, currency);
  const pct = budget > 0 ? spent / budget : 0;
  const base = { spent, budget, pct };
  if (spent > budget) {
    return { ...base, tone: "bad", message: `Te pasaste por ${fmt(spent - budget)}` };
  }
  if (spent === budget) {
    return { ...base, tone: progress >= 1 ? "good" : "warn", message: "Justo en el límite" };
  }
  if (progress >= 1) {
    return { ...base, tone: "good", message: `Cumpliste: sobraron ${fmt(budget - spent)}` };
  }
  if (pct >= 0.9) {
    return { ...base, tone: "warn", message: `Casi al límite: quedan ${fmt(budget - spent)}` };
  }
  // La primera semana no se juzga el ritmo: rentas y pagos fijos suelen caer al inicio.
  if (progress >= 0.2 && pct > progress + 0.1) {
    return {
      ...base,
      tone: "warn",
      message: `Vas rápido: llevas ${Math.round(pct * 100)}% y el mes va en ${Math.round(progress * 100)}%`,
    };
  }
  return { ...base, tone: "good", message: `Vas bien: quedan ${fmt(budget - spent)}` };
}

/** Sugerencia: el promedio de los meses con gasto, redondeado hacia arriba a 100. */
export function suggestBudget(monthlyTotals: number[]): number | null {
  const withSpending = monthlyTotals.filter((t) => t > 0);
  if (withSpending.length === 0) return null;
  const avg = withSpending.reduce((a, b) => a + b, 0) / withSpending.length;
  return Math.ceil(avg / 10000) * 10000;
}
