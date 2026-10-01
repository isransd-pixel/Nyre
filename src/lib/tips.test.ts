import { describe, expect, it } from "vitest";
import { buildTips, seasonalTip } from "./tips";

const fmt = (c: number) => `$${c / 100}`;
const empty = {
  fmt,
  month: 3,
  bills: [],
  overBudget: [],
  emergency: null,
  hasEmergencyGoal: false,
  minimumTraps: [],
  hormigaYearly: 0,
  subscriptionsYearly: 0,
};

describe("buildTips", () => {
  it("pone primero lo urgente", () => {
    const tips = buildTips({
      ...empty,
      bills: [
        { name: "Luz", amount: 89000, daysUntil: -2 },
        { name: "Internet", amount: 50000, daysUntil: 1 },
      ],
      overBudget: [{ name: "Restaurantes", over: 30000 }],
      emergency: { saved: 0, monthlyBasic: 1000000 },
    });
    expect(tips.map((t) => t.id)).toEqual(["bills-overdue", "bills-soon", "over-budget", "emergency-start"]);
    expect(tips[1].title).toBe("Internet vence mañana");
    expect(tips[3].detail).toContain("$30000");
  });

  it("avisa de la trampa del pago mínimo", () => {
    const tips = buildTips({ ...empty, minimumTraps: [{ name: "Tarjeta", years: null }] });
    expect(tips[0].id).toBe("minimum-trap");
  });

  it("sin datos no inventa consejos", () => {
    expect(buildTips(empty)).toEqual([]);
  });
});

describe("seasonalTip", () => {
  it("cambia según la época del año", () => {
    expect(seasonalTip(12, fmt)?.id).toBe("aguinaldo");
    expect(seasonalTip(1, fmt)?.id).toBe("cuesta-enero");
    expect(seasonalTip(6, fmt)?.id).toBe("regreso-clases");
    expect(seasonalTip(10, fmt)?.id).toBe("fin-de-ano");
    expect(seasonalTip(3, fmt)).toBeNull();
  });
});
