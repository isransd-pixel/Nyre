import { formatMoney, formatMoneyWhole } from "./money";

// Referencia común: guardar al menos 20% de lo que entra (regla 50/30/20).
const HEALTHY_RATE = 0.2;

export type Verdict = { tone: "good" | "warn" | "bad"; title: string; detail: string };

/** Resumen en una frase de cómo va el mes, al estilo "Vas bien". */
export function monthVerdict(
  income: number,
  expense: number,
  currency: string,
  kind: "family" | "business",
): Verdict | null {
  if (income === 0 && expense === 0) return null;
  const fmt = (c: number) => formatMoney(c, currency);
  const net = income - expense;
  if (net < 0) {
    return {
      tone: "bad",
      title: "Saliste en números rojos",
      detail: `Gastaste ${fmt(-net)} más de lo que entró.`,
    };
  }
  const rate = income > 0 ? net / income : 0;
  const whole = (c: number) => formatMoneyWhole(c, currency);
  const kept = whole(Math.round(rate * 100) * 100);
  if (rate >= HEALTHY_RATE) {
    return {
      tone: "good",
      title: kind === "family" ? "¡Vas muy bien!" : "Negocio rentable",
      detail: `De cada ${whole(10000)} que entraron te quedaron ${kept}.`,
    };
  }
  return {
    tone: "warn",
    title: "Vas justo",
    detail: `De cada ${whole(10000)} que entraron te quedaron ${kept}. ${
      kind === "family" ? `Una meta común es guardar al menos ${whole(2000)}.` : "El margen está apretado."
    }`,
  };
}

/** "+12%" / "−5%" respecto a un valor anterior; null si no hay con qué comparar. */
export function changeVs(now: number, before: number): { pct: number; label: string } | null {
  if (before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { pct, label: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%` };
}
