type Tx = { date: string; amountCents: number; type: "income" | "expense" };

export type MonthSummary = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
};

/** Los últimos `count` meses terminando en el mes de `today`, en orden cronológico. */
export function lastMonths(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthlySummary(txs: Tx[], months: string[]): MonthSummary[] {
  const byMonth = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0, net: 0 }]));
  for (const t of txs) {
    const row = byMonth.get(t.date.slice(0, 7));
    if (!row) continue;
    if (t.type === "income") row.income += t.amountCents;
    else row.expense += t.amountCents;
  }
  for (const row of byMonth.values()) row.net = row.income - row.expense;
  return [...byMonth.values()];
}

/** Gasto (o ingreso) total por categoría, de mayor a menor. */
export function categoryBreakdown(
  txs: (Tx & { categoryId: number | null })[],
  type: "income" | "expense",
  names: Map<number, string>,
): { name: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    const name = (t.categoryId !== null && names.get(t.categoryId)) || "Sin categoría";
    totals.set(name, (totals.get(name) ?? 0) + t.amountCents);
  }
  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export type Sub = {
  customerId: string;
  status: string;
  mrrCents: number;
  startDate: string; // YYYY-MM-DD
  endedDate: string | null;
};

// Suscripciones que nunca pagaron o que no están cobrando no cuentan para MRR.
const NOT_PAYING = new Set(["trialing", "incomplete", "incomplete_expired", "paused", "unpaid"]);

export function isActiveAt(sub: Sub, date: string): boolean {
  if (NOT_PAYING.has(sub.status)) return false;
  return sub.startDate <= date && (sub.endedDate === null || sub.endedDate > date);
}

export function mrrAt(subs: Sub[], date: string): number {
  return subs.reduce((sum, s) => (isActiveAt(s, date) ? sum + s.mrrCents : sum), 0);
}

function activeCustomers(subs: Sub[], date: string): Set<string> {
  return new Set(subs.filter((s) => isActiveAt(s, date)).map((s) => s.customerId));
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export type SaasMetrics = {
  mrr: number;
  arr: number;
  customers: number;
  arpu: number;
  /** Fracción de clientes perdidos en los últimos 30 días (0–1). */
  customerChurn: number | null;
  newMrr: number;
  churnedMrr: number;
  /** Valor de vida estimado: ARPU / churn mensual. */
  ltv: number | null;
};

export function saasMetrics(subs: Sub[], today: string): SaasMetrics {
  const start = addDays(today, -30);
  const mrr = mrrAt(subs, today);
  const customersNow = activeCustomers(subs, today);
  const customersBefore = activeCustomers(subs, start);
  const lost = [...customersBefore].filter((c) => !customersNow.has(c)).length;
  const customerChurn = customersBefore.size > 0 ? lost / customersBefore.size : null;

  let newMrr = 0;
  let churnedMrr = 0;
  for (const s of subs) {
    const before = isActiveAt(s, start);
    const now = isActiveAt(s, today);
    if (now && !before) newMrr += s.mrrCents;
    if (before && !now) churnedMrr += s.mrrCents;
  }

  const arpu = customersNow.size > 0 ? Math.round(mrr / customersNow.size) : 0;
  return {
    mrr,
    arr: mrr * 12,
    customers: customersNow.size,
    arpu,
    customerChurn,
    newMrr,
    churnedMrr,
    ltv: customerChurn ? Math.round(arpu / customerChurn) : null,
  };
}

export function mrrHistory(subs: Sub[], months: string[], today: string) {
  return months.map((month) => {
    const end = monthEnd(month);
    return { month, mrr: mrrAt(subs, end < today ? end : today) };
  });
}

const PER_MONTH: Record<string, number> = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };

/** Normaliza un precio recurrente de Stripe a su equivalente mensual en centavos. */
export function monthlyAmount(
  unitAmount: number,
  quantity: number,
  interval: string,
  intervalCount: number,
): number {
  const perMonth = PER_MONTH[interval];
  if (perMonth === undefined || intervalCount <= 0) return 0;
  return Math.round((unitAmount * quantity * perMonth) / intervalCount);
}
