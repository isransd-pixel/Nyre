import { addDays } from "./metrics";
import { shortDate } from "./dates";

export type Frequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "yearly";
export type BillKind = "service" | "subscription" | "card" | "loan" | "school" | "other";

export const FREQUENCIES: Record<Frequency, { label: string; perMonth: number }> = {
  weekly: { label: "Cada semana", perMonth: 52 / 12 },
  biweekly: { label: "Cada quincena", perMonth: 2 },
  monthly: { label: "Cada mes", perMonth: 1 },
  bimonthly: { label: "Cada 2 meses", perMonth: 0.5 },
  yearly: { label: "Cada año", perMonth: 1 / 12 },
};

export const BILL_KINDS: Record<BillKind, string> = {
  service: "Servicio (luz, agua, gas, internet)",
  subscription: "Suscripción (Netflix, Spotify…)",
  card: "Tarjeta de crédito",
  loan: "Préstamo o crédito",
  school: "Colegiatura",
  other: "Otro",
};

function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)));
  return target.toISOString().slice(0, 10);
}

/** Siguiente fecha de pago después de `date`. */
export function advanceDue(date: string, frequency: Frequency): string {
  switch (frequency) {
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 15);
    case "monthly":
      return addMonths(date, 1);
    case "bimonthly":
      return addMonths(date, 2);
    case "yearly":
      return addMonths(date, 12);
  }
}

export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  return Math.round(amount * FREQUENCIES[frequency].perMonth);
}

export function daysUntil(due: string, today: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function dueLabel(due: string, today: string): { text: string; tone: "bad" | "warn" | "muted" } {
  const d = daysUntil(due, today);
  if (d < -1) return { text: `Venció hace ${-d} días`, tone: "bad" };
  if (d === -1) return { text: "Venció ayer", tone: "bad" };
  if (d === 0) return { text: "Vence hoy", tone: "warn" };
  if (d === 1) return { text: "Vence mañana", tone: "warn" };
  if (d <= 6) return { text: `Vence en ${d} días`, tone: d <= 3 ? "warn" : "muted" };
  return { text: `Vence el ${shortDate(due)}`, tone: "muted" };
}

/** Fechas de pago de un recibo entre `from` y `to` (inclusive). */
export function dueDatesBetween(nextDue: string, frequency: Frequency, from: string, to: string): string[] {
  const out: string[] = [];
  let d = nextDue;
  for (let i = 0; i < 400 && d <= to; i++) {
    if (d >= from) out.push(d);
    d = advanceDue(d, frequency);
  }
  return out;
}

/* ───────────── Detección de cargos que se repiten ───────────── */

export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(pago|cargo|compra|domiciliacion|domiciliado|recurrente|mx|com|www|sa|de|cv)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

export type RecurringCandidate = {
  key: string;
  name: string;
  amountCents: number;
  frequency: Frequency;
  nextDue: string;
  months: number;
};

/**
 * Busca gastos que aparecen en al menos 2 meses distintos con un monto parecido
 * (±20%) y a lo mucho una vez al mes: suscripciones, luz, internet…
 */
export function detectRecurring(
  txs: { date: string; description: string; amountCents: number; type: "income" | "expense" }[],
  knownNames: string[],
): RecurringCandidate[] {
  const known = knownNames.map(normalizeMerchant).filter(Boolean);
  const groups = new Map<string, { date: string; description: string; amountCents: number }[]>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const key = normalizeMerchant(t.description);
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const out: RecurringCandidate[] = [];
  for (const [key, items] of groups) {
    if (known.some((k) => k.includes(key) || key.includes(k))) continue;
    const months = [...new Set(items.map((i) => i.date.slice(0, 7)))].sort();
    if (months.length < 2 || items.length > months.length * 1.5) continue;

    const amounts = items.map((i) => i.amountCents).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (amounts.some((a) => Math.abs(a - median) > median * 0.2)) continue;

    // Si casi siempre hay un mes de por medio, es bimestral (como la luz).
    const gaps = months.slice(1).map((m, i) => {
      const [y1, m1] = months[i].split("-").map(Number);
      const [y2, m2] = m.split("-").map(Number);
      return (y2 - y1) * 12 + (m2 - m1);
    });
    const frequency: Frequency = gaps.every((g) => g >= 2) ? "bimonthly" : "monthly";
    const last = items.map((i) => i.date).sort().at(-1)!;
    const sample = items.find((i) => i.date === last)!;

    out.push({
      key,
      name: sample.description.trim().slice(0, 60),
      amountCents: median,
      frequency,
      nextDue: advanceDue(last, frequency),
      months: months.length,
    });
  }
  return out.sort((a, b) => b.amountCents - a.amountCents).slice(0, 8);
}

/* ───────────── Archivo de calendario (.ics) ───────────── */

const RRULE: Record<Frequency, string> = {
  weekly: "FREQ=WEEKLY",
  biweekly: "FREQ=DAILY;INTERVAL=15",
  monthly: "FREQ=MONTHLY",
  bimonthly: "FREQ=MONTHLY;INTERVAL=2",
  yearly: "FREQ=YEARLY",
};

const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

/** Parte líneas largas a 75 caracteres como pide el estándar. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? " " : "") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

/**
 * Un evento que se repite por cada pago, con aviso un día antes.
 * Al importarlo, el celular recuerda los pagos aunque la app esté cerrada.
 */
export function billsToIcs(
  bills: { id: number; name: string; amountLabel: string; frequency: Frequency; nextDue: string }[],
  stamp: string,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kipu//Pagos fijos//ES",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Pagos fijos",
  ];
  for (const b of bills) {
    const day = b.nextDue.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:nyre-bill-${b.id}@nyre`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `RRULE:${RRULE[b.frequency]}`,
      fold(`SUMMARY:${escapeIcs(`Pagar ${b.name} (${b.amountLabel})`)}`),
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${escapeIcs(`Mañana vence ${b.name}`)}`),
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

const SUBSCRIPTION_WORDS =
  /netflix|spotify|disney|amazon|prime|apple|icloud|google|youtube|hbo|max|paramount|vix|star|xbox|playstation|nintendo|crunchyroll|deezer|canva|microsoft|office|chatgpt|openai|claude|gym|smart ?fit|sports world/;
const SERVICE_WORDS = /cfe|luz|agua|gas|telmex|izzi|totalplay|megacable|internet|telcel|at ?t|movistar|bait|sky|dish|predial|mantenimiento/;

export function guessBillKind(description: string): BillKind {
  const d = description.toLowerCase();
  if (SUBSCRIPTION_WORDS.test(d)) return "subscription";
  if (SERVICE_WORDS.test(d)) return "service";
  if (/colegiatura|escuela|colegio|universidad/.test(d)) return "school";
  return "other";
}
