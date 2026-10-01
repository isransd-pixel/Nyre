import { describe, expect, it } from "vitest";
import { parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["123", 12300],
    ["1,234.56", 123456],
    ["1.234,56", 123456],
    ["$ -45.10", -4510],
    ["(45.00)", -4500],
    ["45.00-", -4500],
    ["12,5", 1250],
    ["1,234", 123400],
    ["1.234.567", 123456700],
    ["MXN 2,000.00", 200000],
  ])("%s → %d", (raw, cents) => {
    expect(parseAmount(raw)).toBe(cents);
  });

  it.each(["", "abc", "1-2"])("rechaza %j", (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});
