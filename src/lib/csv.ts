import { parseAmount } from "./money";

export type DateFormat = "YMD" | "DMY" | "MDY";

export type ColumnMapping = {
  date: string;
  description: string;
  dateFormat: DateFormat;
  /** Una sola columna con signo (negativo = gasto)… */
  amount?: string;
  /** …o dos columnas separadas de cargos y abonos. */
  debit?: string;
  credit?: string;
  /** Para bancos que reportan los gastos como positivos. */
  invertSign?: boolean;
};

export type NormalizedRow = {
  date: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  externalId: string;
};

export type RowError = { line: number; reason: string };

const pad = (n: number) => String(n).padStart(2, "0");

export function parseDate(raw: string, format: DateFormat): string | null {
  const s = raw.trim().split(/[ T]/)[0];
  let parts: string[];
  if (/^\d{8}$/.test(s) && format === "YMD") {
    parts = [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8)];
  } else {
    parts = s.split(/[/.-]/);
  }
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const [year, m, d] =
    format === "YMD"
      ? nums
      : format === "DMY"
        ? [nums[2], nums[1], nums[0]]
        : [nums[2], nums[0], nums[1]];
  const y = year < 100 ? year + 2000 : year;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Elige el formato de fecha que interpreta correctamente más muestras. */
export function guessDateFormat(samples: string[]): DateFormat {
  const formats: DateFormat[] = ["YMD", "DMY", "MDY"];
  let best: DateFormat = "DMY";
  let bestScore = -1;
  for (const f of formats) {
    const score = samples.filter((s) => parseDate(s, f) !== null).length;
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

const HEADER_HINTS: Record<"date" | "description" | "amount" | "debit" | "credit", RegExp> = {
  date: /fecha|date|dia|día/i,
  description: /desc|concepto|detalle|memo|referencia|payee|nombre|name/i,
  amount: /monto|importe|amount|cantidad|valor|total/i,
  debit: /cargo|retiro|debit|débito|debito|egreso|salida/i,
  credit: /abono|dep[oó]sito|credit|cr[eé]dito|ingreso|entrada/i,
};

export function guessMapping(headers: string[], sampleDates: string[] = []): Partial<ColumnMapping> {
  const find = (key: keyof typeof HEADER_HINTS) =>
    headers.find((h) => HEADER_HINTS[key].test(h));
  const mapping: Partial<ColumnMapping> = {
    date: find("date"),
    description: find("description"),
    dateFormat: guessDateFormat(sampleDates),
  };
  const debit = find("debit");
  const credit = find("credit");
  if (debit && credit && debit !== credit) {
    mapping.debit = debit;
    mapping.credit = credit;
  } else {
    mapping.amount = find("amount");
  }
  return mapping;
}

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): { rows: NormalizedRow[]; errors: RowError[] } {
  const out: NormalizedRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, i) => {
    const line = i + 2; // +1 por el encabezado, +1 porque las líneas empiezan en 1
    const date = parseDate(row[mapping.date] ?? "", mapping.dateFormat);
    if (!date) {
      errors.push({ line, reason: `Fecha inválida: "${row[mapping.date] ?? ""}"` });
      return;
    }

    let signed: number | null;
    if (mapping.amount) {
      signed = parseAmount(row[mapping.amount] ?? "");
    } else {
      const debit = parseAmount(row[mapping.debit ?? ""] ?? "") ?? 0;
      const credit = parseAmount(row[mapping.credit ?? ""] ?? "") ?? 0;
      signed = Math.abs(credit) - Math.abs(debit);
    }
    if (signed === null) {
      errors.push({ line, reason: "Monto inválido" });
      return;
    }
    if (mapping.invertSign) signed = -signed;
    if (signed === 0) return; // filas informativas (saldos, encabezados repetidos)

    const description = (row[mapping.description] ?? "").trim() || "(sin descripción)";
    const base = `csv:${date}|${signed}|${description.toLowerCase().replace(/\s+/g, " ")}`;
    // Dos compras idénticas el mismo día son movimientos distintos.
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);

    out.push({
      date,
      description,
      amountCents: Math.abs(signed),
      type: signed > 0 ? "income" : "expense",
      externalId: `${base}#${n}`.slice(0, 300),
    });
  });

  return { rows: out, errors };
}

export type Rule = { pattern: string; categoryId: number; type: "income" | "expense" };

/** Primera regla cuyo texto aparezca en la descripción (sin mayúsculas ni acentos). */
export function matchCategory(
  description: string,
  type: "income" | "expense",
  rules: Rule[],
): number | null {
  const fold = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const d = fold(description);
  const rule = rules.find((r) => r.type === type && r.pattern.trim() && d.includes(fold(r.pattern.trim())));
  return rule?.categoryId ?? null;
}
