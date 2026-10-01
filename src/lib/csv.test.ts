import { describe, expect, it } from "vitest";
import { guessDateFormat, guessMapping, matchCategory, normalizeRows, parseDate } from "./csv";

describe("parseDate", () => {
  it("lee los tres formatos", () => {
    expect(parseDate("2026-03-07", "YMD")).toBe("2026-03-07");
    expect(parseDate("07/03/2026", "DMY")).toBe("2026-03-07");
    expect(parseDate("03/07/26", "MDY")).toBe("2026-03-07");
    expect(parseDate("20260307", "YMD")).toBe("2026-03-07");
    expect(parseDate("07.03.2026 10:30", "DMY")).toBe("2026-03-07");
  });

  it("rechaza fechas imposibles", () => {
    expect(parseDate("31/02/2026", "DMY")).toBeNull();
    expect(parseDate("13/13/2026", "MDY")).toBeNull();
    expect(parseDate("hola", "YMD")).toBeNull();
  });

  it("adivina el formato", () => {
    expect(guessDateFormat(["25/01/2026", "03/02/2026"])).toBe("DMY");
    expect(guessDateFormat(["01/25/2026", "02/03/2026"])).toBe("MDY");
    expect(guessDateFormat(["2026-01-25"])).toBe("YMD");
  });
});

describe("guessMapping", () => {
  it("detecta columnas de cargo y abono", () => {
    const m = guessMapping(["Fecha", "Concepto", "Cargo", "Abono", "Saldo"]);
    expect(m).toMatchObject({ date: "Fecha", description: "Concepto", debit: "Cargo", credit: "Abono" });
    expect(m.amount).toBeUndefined();
  });

  it("detecta una columna de monto", () => {
    expect(guessMapping(["Date", "Description", "Amount"])).toMatchObject({
      date: "Date",
      description: "Description",
      amount: "Amount",
    });
  });
});

describe("normalizeRows", () => {
  it("convierte cargos y abonos, y separa duplicados legítimos", () => {
    const { rows, errors } = normalizeRows(
      [
        { Fecha: "01/03/2026", Concepto: "OXXO", Cargo: "50.00", Abono: "" },
        { Fecha: "01/03/2026", Concepto: "OXXO", Cargo: "50.00", Abono: "" },
        { Fecha: "02/03/2026", Concepto: "Nómina", Cargo: "", Abono: "20,000.00" },
        { Fecha: "", Concepto: "Saldo inicial", Cargo: "", Abono: "" },
      ],
      { date: "Fecha", description: "Concepto", debit: "Cargo", credit: "Abono", dateFormat: "DMY" },
    );
    expect(errors).toEqual([{ line: 5, reason: 'Fecha inválida: ""' }]);
    expect(rows.map((r) => [r.date, r.type, r.amountCents])).toEqual([
      ["2026-03-01", "expense", 5000],
      ["2026-03-01", "expense", 5000],
      ["2026-03-02", "income", 2000000],
    ]);
    expect(rows[0].externalId).not.toBe(rows[1].externalId);
  });

  it("invierte el signo si el banco reporta gastos en positivo", () => {
    const { rows } = normalizeRows([{ d: "2026-01-01", t: "Netflix", a: "199" }], {
      date: "d",
      description: "t",
      amount: "a",
      dateFormat: "YMD",
      invertSign: true,
    });
    expect(rows[0]).toMatchObject({ type: "expense", amountCents: 19900 });
  });
});

describe("matchCategory", () => {
  const rules = [
    { pattern: "uber eats", categoryId: 2, type: "expense" as const },
    { pattern: "uber", categoryId: 1, type: "expense" as const },
    { pattern: "nomina", categoryId: 3, type: "income" as const },
  ];

  it("usa la primera regla que coincide, sin acentos ni mayúsculas", () => {
    expect(matchCategory("UBER EATS *PEDIDO", "expense", rules)).toBe(2);
    expect(matchCategory("Uber viaje", "expense", rules)).toBe(1);
    expect(matchCategory("Pago de NÓMINA", "income", rules)).toBe(3);
    expect(matchCategory("Pago de NÓMINA", "expense", rules)).toBeNull();
  });
});
