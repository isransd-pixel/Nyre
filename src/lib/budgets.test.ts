import { describe, expect, it } from "vitest";
import { budgetStatus, monthProgress, suggestBudget } from "./budgets";

describe("monthProgress", () => {
  it("calcula el avance del mes actual", () => {
    expect(monthProgress("2026-09", "2026-09-15")).toBe(0.5);
    expect(monthProgress("2026-08", "2026-09-15")).toBe(1);
    expect(monthProgress("2026-10", "2026-09-15")).toBe(0);
  });
});

describe("budgetStatus", () => {
  const s = (spent: number, progress: number) => budgetStatus(spent, 500000, progress, "MXN");

  it("marca cuando te pasas", () => {
    expect(s(600000, 0.5)).toMatchObject({ tone: "bad", message: "Te pasaste por $1,000.00", pct: 1.2 });
  });
  it("avisa si gastas más rápido de lo que avanza el mes", () => {
    expect(s(300000, 0.3)).toMatchObject({ tone: "warn", message: "Vas rápido: llevas 60% y el mes va en 30%" });
  });
  it("no juzga el ritmo en la primera semana", () => {
    expect(s(300000, 0.1).tone).toBe("good");
  });
  it("está bien si el gasto va al ritmo del mes", () => {
    expect(s(300000, 0.6)).toMatchObject({ tone: "good", message: "Vas bien: quedan $2,000.00" });
  });
  it("dice cuando llegas justo al límite", () => {
    expect(s(500000, 0.1)).toMatchObject({ tone: "warn", message: "Justo en el límite" });
  });
  it("avisa cerca del límite", () => {
    expect(s(470000, 0.95).tone).toBe("warn");
  });
  it("en meses cerrados dice si cumpliste", () => {
    expect(s(400000, 1)).toMatchObject({ tone: "good", message: "Cumpliste: sobraron $1,000.00" });
  });
});

describe("suggestBudget", () => {
  it("promedia los meses con gasto y redondea a 100", () => {
    expect(suggestBudget([0, 432550, 380000])).toBe(410000);
    expect(suggestBudget([0, 0])).toBeNull();
  });
});
