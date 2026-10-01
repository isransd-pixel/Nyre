import { describe, expect, it } from "vitest";
import { bucketAdvice, bucketSplit } from "./buckets";

describe("bucketSplit", () => {
  const buckets = new Map([
    [1, "need" as const],
    [2, "want" as const],
    [3, "save" as const],
    [4, null],
  ]);
  const tx = (amount: number, type: "income" | "expense", categoryId: number | null) => ({
    amountCents: amount,
    type,
    categoryId,
  });

  it("reparte y suma lo que sobró al ahorro", () => {
    const s = bucketSplit(
      [tx(1000, "income", null), tx(500, "expense", 1), tx(200, "expense", 2), tx(50, "expense", 3), tx(30, "expense", null), tx(20, "expense", 4)],
      buckets,
    );
    expect(s).toEqual({ income: 1000, need: 500, want: 200, save: 250, unclassified: 50 });
    expect(bucketAdvice(s)).toMatchObject({ tone: "good" });
  });

  it("advierte cuando las necesidades pesan mucho", () => {
    const s = bucketSplit([tx(1000, "income", null), tx(700, "expense", 1)], buckets);
    expect(bucketAdvice(s)?.text).toMatch(/necesidades se llevan el 70%/);
  });
});
