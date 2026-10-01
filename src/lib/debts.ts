export type DebtInput = {
  id: number;
  name: string;
  balanceCents: number;
  /** Tasa anual en centésimas de punto: 4550 = 45.50%. */
  annualRateBp: number;
  minPaymentCents: number;
};

export type Strategy = "snowball" | "avalanche";

export const STRATEGY_INFO: Record<Strategy, { name: string; short: string; why: string }> = {
  snowball: {
    name: "Bola de nieve",
    short: "Primero la deuda más chica",
    why: "Terminas una deuda pronto y eso motiva a seguir. Un estudio de Kellogg con 6,000 personas encontró que quienes pagan primero los saldos chicos tienen más probabilidad de salir de todas sus deudas.",
  },
  avalanche: {
    name: "Avalancha",
    short: "Primero la de interés más alto",
    why: "Es la que menos intereses te cobra en total. Conviene si eres constante y la diferencia de intereses es grande.",
  },
};

export type PlanResult =
  | { ok: false; reason: "below-minimums"; minimums: number }
  | { ok: false; reason: "too-long" }
  | {
      ok: true;
      months: number;
      totalInterest: number;
      /** En qué mes (1 = el próximo) termina cada deuda, en orden de liquidación. */
      payoffs: { id: number; name: string; month: number }[];
    };

const monthlyInterest = (balance: number, bp: number) => Math.round((balance * bp) / 10000 / 12);

/**
 * Simula pagar `monthlyPayment` cada mes: primero el mínimo de cada deuda y todo
 * lo que sobre a la deuda prioritaria. Al liquidar una, su mínimo pasa a la siguiente.
 */
export function simulatePlan(debts: DebtInput[], monthlyPayment: number, strategy: Strategy): PlanResult {
  const active = debts.filter((d) => d.balanceCents > 0).map((d) => ({ ...d, balance: d.balanceCents }));
  const minimums = active.reduce((a, d) => a + Math.min(d.minPaymentCents, d.balance), 0);
  if (monthlyPayment < minimums) return { ok: false, reason: "below-minimums", minimums };

  let totalInterest = 0;
  const payoffs: { id: number; name: string; month: number }[] = [];

  for (let month = 1; month <= 600; month++) {
    const open = active.filter((d) => d.balance > 0);
    if (open.length === 0) return { ok: true, months: month - 1, totalInterest, payoffs };

    for (const d of open) {
      const interest = monthlyInterest(d.balance, d.annualRateBp);
      d.balance += interest;
      totalInterest += interest;
    }
    let available = monthlyPayment;
    for (const d of open) {
      const pay = Math.min(d.minPaymentCents, d.balance, available);
      d.balance -= pay;
      available -= pay;
    }
    const priority = [...open].sort((a, b) =>
      strategy === "snowball" ? a.balance - b.balance : b.annualRateBp - a.annualRateBp || a.balance - b.balance,
    );
    for (const d of priority) {
      if (available <= 0) break;
      const pay = Math.min(d.balance, available);
      d.balance -= pay;
      available -= pay;
    }
    for (const d of open) {
      if (d.balance <= 0) payoffs.push({ id: d.id, name: d.name, month });
    }
  }
  return { ok: false, reason: "too-long" };
}

/** Cuánto tardarías y cuánto interés pagarías si solo das el pago mínimo (fijo). */
export function minimumOnly(debt: DebtInput): { months: number; totalInterest: number } | null {
  let balance = debt.balanceCents;
  let totalInterest = 0;
  for (let month = 1; month <= 600; month++) {
    const interest = monthlyInterest(balance, debt.annualRateBp);
    if (debt.minPaymentCents <= interest) return null; // nunca se termina de pagar
    balance += interest;
    totalInterest += interest;
    balance -= Math.min(debt.minPaymentCents, balance);
    if (balance <= 0) return { months: month, totalInterest };
  }
  return null;
}

/** "1 año y 3 meses", "8 meses". */
export function durationLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? "año" : "años"}`);
  if (m || !y) parts.push(`${m} ${m === 1 ? "mes" : "meses"}`);
  return parts.join(" y ");
}
