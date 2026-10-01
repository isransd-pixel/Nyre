import { normalizeMerchant } from "./bills";

/** Monto máximo para considerar un gasto "hormiga", por moneda (en centavos). */
const LIMITS: Record<string, number> = {
  MXN: 15000,
  USD: 1000,
  EUR: 1000,
  COP: 3000000,
  ARS: 1000000,
  CLP: 800000,
  PEN: 3000,
};

export function hormigaLimit(currency: string): number {
  return LIMITS[currency] ?? 1000;
}

export type Hormiga = {
  count: number;
  total: number;
  /** Si cada mes fuera igual. */
  yearly: number;
  top: { name: string; total: number; count: number }[];
};

/**
 * Gastos chicos y frecuentes (café, antojos, tienda de la esquina) que CONDUSEF
 * llama "gastos hormiga". No cuenta categorías de necesidad ni de ahorro.
 */
export function hormigaExpenses(
  txs: { description: string; amountCents: number; type: "income" | "expense"; categoryId: number | null }[],
  limit: number,
  excludedCategoryIds: Set<number>,
): Hormiga {
  const small = txs.filter(
    (t) =>
      t.type === "expense" &&
      t.amountCents <= limit &&
      (t.categoryId === null || !excludedCategoryIds.has(t.categoryId)),
  );
  const groups = new Map<string, { name: string; total: number; count: number }>();
  for (const t of small) {
    const key = normalizeMerchant(t.description) || t.description.toLowerCase();
    const g = groups.get(key) ?? { name: t.description.trim().slice(0, 40), total: 0, count: 0 };
    g.total += t.amountCents;
    g.count += 1;
    groups.set(key, g);
  }
  const total = small.reduce((a, t) => a + t.amountCents, 0);
  return {
    count: small.length,
    total,
    yearly: total * 12,
    top: [...groups.values()].sort((a, b) => b.total - a.total).slice(0, 3),
  };
}
