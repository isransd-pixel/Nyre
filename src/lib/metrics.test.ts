import { describe, expect, it } from "vitest";
import {
  categoryBreakdown,
  lastMonths,
  monthlyAmount,
  monthlySummary,
  mrrHistory,
  saasMetrics,
  type Sub,
} from "./metrics";

describe("monthlySummary", () => {
  it("agrupa por mes", () => {
    const months = lastMonths("2026-03-15", 3);
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"]);
    const summary = monthlySummary(
      [
        { date: "2026-03-01", amountCents: 1000, type: "income" },
        { date: "2026-03-02", amountCents: 300, type: "expense" },
        { date: "2026-01-31", amountCents: 50, type: "expense" },
        { date: "2025-12-31", amountCents: 999, type: "expense" },
      ],
      months,
    );
    expect(summary).toEqual([
      { month: "2026-01", income: 0, expense: 50, net: -50 },
      { month: "2026-02", income: 0, expense: 0, net: 0 },
      { month: "2026-03", income: 1000, expense: 300, net: 700 },
    ]);
  });

  it("cruza el cambio de año", () => {
    expect(lastMonths("2026-01-10", 2)).toEqual(["2025-12", "2026-01"]);
  });
});

describe("categoryBreakdown", () => {
  it("suma por categoría y ordena", () => {
    const names = new Map([[1, "Comida"], [2, "Renta"]]);
    expect(
      categoryBreakdown(
        [
          { date: "2026-01-01", amountCents: 100, type: "expense", categoryId: 1 },
          { date: "2026-01-02", amountCents: 900, type: "expense", categoryId: 2 },
          { date: "2026-01-03", amountCents: 50, type: "expense", categoryId: null },
          { date: "2026-01-03", amountCents: 5000, type: "income", categoryId: null },
        ],
        "expense",
        names,
      ),
    ).toEqual([
      { name: "Renta", total: 900 },
      { name: "Comida", total: 100 },
      { name: "Sin categoría", total: 50 },
    ]);
  });
});

describe("saasMetrics", () => {
  const subs: Sub[] = [
    { customerId: "a", status: "active", mrrCents: 10000, startDate: "2025-01-01", endedDate: null },
    { customerId: "b", status: "canceled", mrrCents: 10000, startDate: "2025-01-01", endedDate: "2026-03-10" },
    { customerId: "c", status: "active", mrrCents: 20000, startDate: "2026-03-05", endedDate: null },
    { customerId: "d", status: "past_due", mrrCents: 10000, startDate: "2025-06-01", endedDate: null },
    { customerId: "e", status: "trialing", mrrCents: 50000, startDate: "2026-03-01", endedDate: null },
  ];

  it("calcula MRR, churn y LTV", () => {
    const m = saasMetrics(subs, "2026-03-20");
    expect(m.mrr).toBe(40000);
    expect(m.arr).toBe(480000);
    expect(m.customers).toBe(3);
    expect(m.newMrr).toBe(20000);
    expect(m.churnedMrr).toBe(10000);
    // Al inicio había a, b, d; se fue b.
    expect(m.customerChurn).toBeCloseTo(1 / 3);
    expect(m.arpu).toBe(13333);
    expect(m.ltv).toBe(39999);
  });

  it("reconstruye el MRR histórico", () => {
    expect(mrrHistory(subs, ["2026-01", "2026-02", "2026-03"], "2026-03-20")).toEqual([
      { month: "2026-01", mrr: 30000 },
      { month: "2026-02", mrr: 30000 },
      { month: "2026-03", mrr: 40000 },
    ]);
  });

  it("sin clientes no inventa churn", () => {
    expect(saasMetrics([], "2026-03-20")).toMatchObject({ mrr: 0, customerChurn: null, ltv: null });
  });
});

describe("monthlyAmount", () => {
  it("normaliza intervalos", () => {
    expect(monthlyAmount(12000, 1, "year", 1)).toBe(1000);
    expect(monthlyAmount(1000, 3, "month", 1)).toBe(3000);
    expect(monthlyAmount(3000, 1, "month", 3)).toBe(1000);
    expect(monthlyAmount(1200, 1, "week", 1)).toBe(5200);
  });
});
