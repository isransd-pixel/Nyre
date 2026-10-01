import { describe, expect, it } from "vitest";
import { emergencyTarget, goalProgress, nextMonthStart } from "./goals";

const fmt = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;

describe("nextMonthStart", () => {
  it("propone la próxima vez que llega el mes", () => {
    expect(nextMonthStart(8, "2026-10-01")).toBe("2027-08-01");
    expect(nextMonthStart(12, "2026-10-01")).toBe("2026-12-01");
    expect(nextMonthStart(10, "2026-10-15")).toBe("2027-10-01");
  });
});

describe("emergencyTarget", () => {
  it("3 meses de gasto básico redondeado a 1,000", () => {
    expect(emergencyTarget(1234500)).toBe(3800000);
  });
});

describe("goalProgress", () => {
  const base = { today: "2026-10-01", fmt };

  it("dice cuánto apartar al mes para llegar a la fecha", () => {
    const p = goalProgress({ ...base, saved: 0, target: 1200000, targetDate: "2027-08-01", recentMonthly: 0 });
    expect(p.perMonth).toBe(120000);
    expect(p.tone).toBe("warn");
    expect(p.message).toBe("Aparta $1,200 al mes para llegar en agosto 2027");
  });

  it("reconoce que vas a tiempo", () => {
    const p = goalProgress({ ...base, saved: 0, target: 1200000, targetDate: "2027-08-01", recentMonthly: 150000 });
    expect(p.tone).toBe("good");
  });

  it("estima la fecha sin meta de fecha", () => {
    const p = goalProgress({ ...base, saved: 100000, target: 400000, targetDate: null, recentMonthly: 100000 });
    expect(p.message).toBe("A este ritmo llegas en diciembre 2026");
  });

  it("celebra la meta cumplida", () => {
    expect(goalProgress({ ...base, saved: 5, target: 5, targetDate: null, recentMonthly: 0 })).toMatchObject({
      tone: "done",
      pct: 1,
    });
  });

  it("avisa si ya pasó la fecha", () => {
    const p = goalProgress({ ...base, saved: 0, target: 1000, targetDate: "2026-09-01", recentMonthly: 0 });
    expect(p.message).toBe("Ya llegó la fecha y faltan $10");
  });
});
