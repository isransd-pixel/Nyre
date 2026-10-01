import { describe, expect, it } from "vitest";
import { changeVs, monthVerdict } from "./insights";

describe("monthVerdict", () => {
  it("felicita si queda al menos 20%", () => {
    expect(monthVerdict(100000, 50000, "MXN", "family")).toMatchObject({
      tone: "good",
      detail: "De cada $100 que entraron te quedaron $50.",
    });
  });
  it("advierte si queda poco", () => {
    expect(monthVerdict(100000, 90000, "MXN", "family")?.tone).toBe("warn");
  });
  it("marca números rojos", () => {
    expect(monthVerdict(100000, 120000, "MXN", "business")).toMatchObject({
      tone: "bad",
      detail: "Gastaste $200.00 más de lo que entró.",
    });
  });
  it("sin movimientos no opina", () => {
    expect(monthVerdict(0, 0, "MXN", "family")).toBeNull();
  });
});

describe("changeVs", () => {
  it("calcula el cambio", () => {
    expect(changeVs(120, 100)).toEqual({ pct: 20, label: "+20%" });
    expect(changeVs(80, 100)).toEqual({ pct: -20, label: "−20%" });
    expect(changeVs(5, 0)).toBeNull();
  });
});
