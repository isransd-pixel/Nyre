export const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"] as const;

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Convierte texto de un banco o formulario a centavos con signo.
 * Acepta "1,234.56", "1.234,56", "$-45", "(45.00)", "45-" y espacios.
 * Devuelve null si no es un número.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[^\d.,-]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!s || /-/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    // El separador que aparece al final es el decimal.
    normalized =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // Solo comas: decimal si hay 1-2 dígitos después de una única coma.
    const parts = s.split(",");
    normalized =
      parts.length === 2 && parts[1].length <= 2 ? parts.join(".") : parts.join("");
  } else if (lastDot >= 0) {
    // Solo puntos: varios puntos son separadores de miles ("1.234.567").
    const parts = s.split(".");
    normalized = parts.length > 2 ? parts.join("") : s;
  } else {
    normalized = s;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
}

/** Sin centavos, para frases: "$100", "€100". */
export function formatMoneyWhole(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
