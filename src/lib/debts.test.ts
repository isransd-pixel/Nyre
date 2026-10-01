import { describe, expect, it } from "vitest";
import { durationLabel, minimumOnly, simulatePlan, type DebtInput } from "./debts";

const debts: DebtInput[] = [
  { id: 1, name: "Tarjeta A", balanceCents: 3000000, annualRateBp: 6000, minPaymentCents: 150000 },
  { id: 2, name: "Tarjeta B", balanceCents: 500000, annualRateBp: 3000, minPaymentCents: 50000 },
  { id: 3, name: "Préstamo", balanceCents: 1500000, annualRateBp: 2000, minPaymentCents: 80000 },
];

describe("simulatePlan", () => {
  it("bola de nieve liquida primero la más chica", () => {
    const r = simulatePlan(debts, 500000, "snowball");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payoffs[0].name).toBe("Tarjeta B");
  });

  it("avalancha liquida primero la de más interés y paga menos intereses", () => {
    const snow = simulatePlan(debts, 500000, "snowball");
    const ava = simulatePlan(debts, 500000, "avalanche");
    expect(ava.ok && snow.ok).toBe(true);
    if (ava.ok && snow.ok) {
      expect(ava.payoffs[0].name).toBe("Tarjeta A");
      expect(ava.totalInterest).toBeLessThan(snow.totalInterest);
      // Pagando lo mismo cada mes, ambas terminan en un plazo parecido.
      expect(Math.abs(ava.months - snow.months)).toBeLessThanOrEqual(2);
    }
  });

  it("pagar más termina antes", () => {
    const a = simulatePlan(debts, 500000, "snowball");
    const b = simulatePlan(debts, 800000, "snowball");
    expect(a.ok && b.ok && b.months < a.months).toBe(true);
  });

  it("no alcanza si el pago es menor a los mínimos", () => {
    expect(simulatePlan(debts, 100000, "snowball")).toEqual({
      ok: false,
      reason: "below-minimums",
      minimums: 280000,
    });
  });
});

describe("minimumOnly", () => {
  it("calcula plazo e intereses pagando el mínimo", () => {
    const r = minimumOnly({ id: 1, name: "T", balanceCents: 1000000, annualRateBp: 4800, minPaymentCents: 50000 });
    expect(r).not.toBeNull();
    expect(r!.months).toBeGreaterThan(24);
    expect(r!.totalInterest).toBeGreaterThan(400000);
  });

  it("detecta cuando el mínimo no cubre ni los intereses", () => {
    expect(minimumOnly({ id: 1, name: "T", balanceCents: 1000000, annualRateBp: 6000, minPaymentCents: 40000 })).toBeNull();
  });
});

describe("durationLabel", () => {
  it("lo dice en años y meses", () => {
    expect(durationLabel(8)).toBe("8 meses");
    expect(durationLabel(12)).toBe("1 año");
    expect(durationLabel(27)).toBe("2 años y 3 meses");
    expect(durationLabel(1)).toBe("1 mes");
  });
});
