import { addDays } from "./metrics";

export type GoalKind = "emergency" | "school" | "holidays" | "january" | "vacation" | "custom";

export const GOAL_TEMPLATES: {
  kind: GoalKind;
  name: string;
  hint: string;
  /** Mes (1–12) en que suele llegar el gasto; sirve para proponer la fecha. */
  month: number | null;
}[] = [
  {
    kind: "emergency",
    name: "Fondo de emergencia",
    hint: "Para imprevistos: doctor, una reparación o quedarte sin trabajo. CONDUSEF recomienda juntar de 3 a 6 meses de gastos básicos.",
    month: null,
  },
  {
    kind: "school",
    name: "Regreso a clases",
    hint: "Inscripciones, útiles y uniformes. Llega en agosto y puede pasar de $16,000.",
    month: 8,
  },
  {
    kind: "holidays",
    name: "Fin de año",
    hint: "Regalos, posadas y la cena. Para no gastarte todo el aguinaldo.",
    month: 12,
  },
  {
    kind: "january",
    name: "Cuesta de enero",
    hint: "Predial, tenencia, seguros y colegiaturas que llegan juntos al empezar el año.",
    month: 1,
  },
  { kind: "vacation", name: "Vacaciones", hint: "El viaje en familia, sin deudas al regresar.", month: null },
  { kind: "custom", name: "", hint: "Lo que quieran: un coche, el enganche de la casa, una compu.", month: null },
];

/** Primer día del próximo mes `month` (hoy incluido si ya estamos en él, se va al siguiente año). */
export function nextMonthStart(month: number, today: string): string {
  const [y, m] = today.split("-").map(Number);
  const year = month > m ? y : y + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Meta del fondo de emergencia: N meses de gasto básico, redondeado hacia arriba a 1,000. */
export function emergencyTarget(monthlyBasic: number, months = 3): number {
  return Math.ceil((monthlyBasic * months) / 100000) * 100000;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function monthLabel(date: string): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

export type GoalProgress = {
  saved: number;
  target: number;
  pct: number;
  remaining: number;
  /** Cuánto apartar al mes para llegar a la fecha (si hay fecha). */
  perMonth: number | null;
  tone: "done" | "good" | "warn";
  message: string;
};

/**
 * Cómo va una meta. `recentMonthly` es lo que en promedio se ha apartado al mes
 * últimamente; con él se estima cuándo se llega.
 */
export function goalProgress(input: {
  saved: number;
  target: number;
  targetDate: string | null;
  today: string;
  recentMonthly: number;
  fmt: (cents: number) => string;
}): GoalProgress {
  const { saved, target, targetDate, today, recentMonthly, fmt } = input;
  const remaining = Math.max(0, target - saved);
  const base = { saved, target, pct: target > 0 ? Math.min(1, saved / target) : 0, remaining };

  if (remaining === 0) return { ...base, perMonth: null, tone: "done", message: "¡Meta cumplida!" };

  if (targetDate) {
    const days = daysBetween(today, targetDate);
    if (days <= 0) {
      return { ...base, perMonth: null, tone: "warn", message: `Ya llegó la fecha y faltan ${fmt(remaining)}` };
    }
    const months = Math.max(1, Math.round(days / 30.44));
    const perMonth = Math.ceil(remaining / months / 100) * 100;
    const onTrack = recentMonthly >= perMonth;
    return {
      ...base,
      perMonth,
      tone: onTrack ? "good" : "warn",
      message: onTrack
        ? `Vas a tiempo. Sigue apartando ${fmt(perMonth)} al mes`
        : `Aparta ${fmt(perMonth)} al mes para llegar en ${monthLabel(targetDate)}`,
    };
  }

  if (recentMonthly > 0) {
    const months = Math.ceil(remaining / recentMonthly);
    const eta = addDays(today, Math.round(months * 30.44));
    return { ...base, perMonth: null, tone: "good", message: `A este ritmo llegas en ${monthLabel(eta)}` };
  }
  return { ...base, perMonth: null, tone: "warn", message: "Aparta algo cada quincena: cada abono cuenta" };
}
