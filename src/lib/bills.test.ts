import { describe, expect, it } from "vitest";
import { advanceDue, billsToIcs, detectRecurring, dueDatesBetween, dueLabel, monthlyEquivalent } from "./bills";

describe("advanceDue", () => {
  it("avanza según la frecuencia sin pasarse del fin de mes", () => {
    expect(advanceDue("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advanceDue("2026-10-05", "bimonthly")).toBe("2026-12-05");
    expect(advanceDue("2026-12-20", "monthly")).toBe("2027-01-20");
    expect(advanceDue("2026-10-01", "biweekly")).toBe("2026-10-16");
    expect(advanceDue("2026-10-01", "yearly")).toBe("2027-10-01");
  });
});

describe("monthlyEquivalent", () => {
  it("convierte a mensual", () => {
    expect(monthlyEquivalent(90000, "bimonthly")).toBe(45000);
    expect(monthlyEquivalent(120000, "yearly")).toBe(10000);
  });
});

describe("dueLabel", () => {
  it("habla en días", () => {
    expect(dueLabel("2026-10-01", "2026-10-01").text).toBe("Vence hoy");
    expect(dueLabel("2026-10-02", "2026-10-01").text).toBe("Vence mañana");
    expect(dueLabel("2026-09-28", "2026-10-01")).toEqual({ text: "Venció hace 3 días", tone: "bad" });
    expect(dueLabel("2026-10-20", "2026-10-01").text).toBe("Vence el 20 oct 2026");
  });
});

describe("dueDatesBetween", () => {
  it("lista las fechas dentro del rango", () => {
    expect(dueDatesBetween("2026-10-01", "weekly", "2026-10-01", "2026-10-20")).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
    ]);
  });
});

describe("detectRecurring", () => {
  const tx = (date: string, description: string, amount: number) => ({
    date,
    description,
    amountCents: amount,
    type: "expense" as const,
  });

  it("encuentra suscripciones y servicios bimestrales", () => {
    const found = detectRecurring(
      [
        tx("2026-07-12", "NETFLIX.COM", 21900),
        tx("2026-08-12", "NETFLIX.COM", 21900),
        tx("2026-09-12", "NETFLIX.COM", 21900),
        tx("2026-05-05", "CFE SUMINISTRADOR", 85000),
        tx("2026-07-05", "CFE SUMINISTRADOR", 92000),
        tx("2026-09-05", "CFE SUMINISTRADOR", 89000),
        // montos muy distintos: no es pago fijo
        tx("2026-08-03", "WALMART SUPERCENTER", 234550),
        tx("2026-09-21", "WALMART SUPERCENTER", 98000),
        // solo un mes
        tx("2026-09-10", "FARMACIA", 35000),
      ],
      [],
    );
    expect(found.map((f) => [f.key, f.frequency, f.nextDue, f.amountCents])).toEqual([
      ["cfe suministrador", "bimonthly", "2026-11-05", 89000],
      ["netflix", "monthly", "2026-10-12", 21900],
    ]);
  });

  it("no sugiere lo que ya está registrado", () => {
    const found = detectRecurring(
      [tx("2026-08-12", "NETFLIX.COM", 21900), tx("2026-09-12", "NETFLIX.COM", 21900)],
      ["Netflix"],
    );
    expect(found).toEqual([]);
  });
});

describe("billsToIcs", () => {
  it("genera eventos que se repiten con aviso un día antes", () => {
    const ics = billsToIcs(
      [{ id: 3, name: "Luz, CFE", amountLabel: "$890", frequency: "bimonthly", nextDue: "2026-11-05" }],
      "20261001T000000Z",
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261105");
    expect(ics).toContain("RRULE:FREQ=MONTHLY;INTERVAL=2");
    expect(ics).toContain("SUMMARY:Pagar Luz\\, CFE ($890)");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});

import { guessBillKind } from "./bills";

describe("guessBillKind", () => {
  it("reconoce suscripciones y servicios comunes", () => {
    expect(guessBillKind("NETFLIX.COM")).toBe("subscription");
    expect(guessBillKind("CFE SUMINISTRADOR")).toBe("service");
    expect(guessBillKind("TOTALPLAY")).toBe("service");
    expect(guessBillKind("COLEGIATURA OCTUBRE")).toBe("school");
    expect(guessBillKind("FARMACIA")).toBe("other");
  });
});
