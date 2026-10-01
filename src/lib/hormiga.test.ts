import { describe, expect, it } from "vitest";
import { hormigaExpenses } from "./hormiga";

describe("hormigaExpenses", () => {
  it("suma gastos chicos fuera de necesidades y los agrupa", () => {
    const tx = (description: string, amount: number, categoryId: number | null = null) => ({
      description,
      amountCents: amount,
      type: "expense" as const,
      categoryId,
    });
    const h = hormigaExpenses(
      [
        tx("STARBUCKS 123", 8500),
        tx("STARBUCKS 456", 9200),
        tx("OXXO", 4500),
        tx("CAMION", 1200, 7), // transporte = necesidad
        tx("RENTA", 1200000),
        { ...tx("REEMBOLSO", 5000), type: "income" as const },
      ],
      15000,
      new Set([7]),
    );
    expect(h).toMatchObject({ count: 3, total: 22200, yearly: 266400 });
    expect(h.top[0]).toMatchObject({ total: 17700, count: 2 });
  });
});
