import type { Bucket } from "./categories";

export type BucketSplit = {
  income: number;
  need: number;
  want: number;
  /** Gasto en ahorro/deudas + lo que sobró del mes. */
  save: number;
  unclassified: number;
};

/** Reparte el gasto del mes en necesidades, gustos y ahorro (regla 50/30/20). */
export function bucketSplit(
  txs: { amountCents: number; type: "income" | "expense"; categoryId: number | null }[],
  buckets: Map<number, Bucket | null>,
): BucketSplit {
  const split: BucketSplit = { income: 0, need: 0, want: 0, save: 0, unclassified: 0 };
  for (const t of txs) {
    if (t.type === "income") {
      split.income += t.amountCents;
      continue;
    }
    const bucket = t.categoryId === null ? null : (buckets.get(t.categoryId) ?? null);
    if (bucket) split[bucket] += t.amountCents;
    else split.unclassified += t.amountCents;
  }
  const leftover = split.income - split.need - split.want - split.save - split.unclassified;
  split.save += Math.max(0, leftover);
  return split;
}

export const REFERENCE = { need: 0.5, want: 0.3, save: 0.2 };

/** Una frase para leer el reparto. */
export function bucketAdvice(s: BucketSplit): { tone: "good" | "warn"; text: string } | null {
  if (s.income === 0) return null;
  const pct = (v: number) => Math.round((v / s.income) * 100);
  if (pct(s.need) > 60) {
    return {
      tone: "warn",
      text: `Las necesidades se llevan el ${pct(s.need)}% de lo que entra. Revisa renta, servicios o transporte: ahí suele estar el mayor ahorro.`,
    };
  }
  if (pct(s.want) > 30) {
    return {
      tone: "warn",
      text: `Los gustos se llevan el ${pct(s.want)}%. La referencia es 30%: recortar un poco aquí es lo más fácil.`,
    };
  }
  if (pct(s.save) >= 20) return { tone: "good", text: `Están guardando o pagando deudas con el ${pct(s.save)}%. ¡Muy bien!` };
  return {
    tone: "warn",
    text: `Solo el ${pct(s.save)}% va a ahorro o deudas. La referencia es 20%.`,
  };
}
