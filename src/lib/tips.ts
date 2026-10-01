export type Tip = {
  id: string;
  tone: "bad" | "warn" | "info" | "good";
  title: string;
  detail: string;
  href?: string;
  cta?: string;
};

type Fmt = (cents: number) => string;

/** Recordatorios por temporada pensados para familias en México. */
export function seasonalTip(month: number, fmt: Fmt): Tip | null {
  if (month === 11 || month === 12) {
    return {
      id: "aguinaldo",
      tone: "info",
      title: "Llega el aguinaldo",
      detail:
        "CONDUSEF sugiere dividirlo en tres: gastos de temporada con presupuesto, pagar deudas (empezando por la tarjeta) y ahorrar para la cuesta de enero.",
      href: "metas",
      cta: "Crear meta",
    };
  }
  if (month === 1 || month === 2) {
    return {
      id: "cuesta-enero",
      tone: "info",
      title: "Cuesta de enero",
      detail: "Predial, tenencia, seguros y colegiaturas llegan juntos. Anótalos en pagos fijos para que no te sorprendan.",
      href: "pagos",
      cta: "Ver pagos fijos",
    };
  }
  if (month >= 5 && month <= 7) {
    return {
      id: "regreso-clases",
      tone: "info",
      title: "Se acerca el regreso a clases",
      detail: `Útiles, uniformes e inscripciones pueden pasar de ${fmt(1600000)}. Si apartan un poco cada quincena, agosto pesa menos.`,
      href: "metas",
      cta: "Crear meta",
    };
  }
  if (month === 9 || month === 10) {
    return {
      id: "fin-de-ano",
      tone: "info",
      title: "Faltan pocos meses para diciembre",
      detail: "Apartar desde ahora para regalos y fiestas evita endeudarse con la tarjeta en diciembre.",
      href: "metas",
      cta: "Crear meta",
    };
  }
  return null;
}

export type TipInput = {
  fmt: Fmt;
  month: number;
  bills: { name: string; amount: number; daysUntil: number }[];
  overBudget: { name: string; over: number }[];
  emergency: { saved: number; monthlyBasic: number } | null;
  hasEmergencyGoal: boolean;
  minimumTraps: { name: string; years: number | null }[];
  hormigaYearly: number;
  subscriptionsYearly: number;
  /** Recordatorios de temporada (aguinaldo, cuesta de enero…). */
  seasonal?: boolean;
};

/** Junta en una lista corta lo que más conviene atender, de lo urgente a lo útil. */
export function buildTips(input: TipInput): Tip[] {
  const { fmt } = input;
  const tips: Tip[] = [];

  const overdue = input.bills.filter((b) => b.daysUntil < 0);
  const soon = input.bills.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 3);
  if (overdue.length) {
    tips.push({
      id: "bills-overdue",
      tone: "bad",
      title: overdue.length === 1 ? `Se pasó la fecha de ${overdue[0].name}` : `${overdue.length} pagos vencidos`,
      detail: "Págalos cuanto antes para evitar recargos o intereses moratorios.",
      href: "pagos",
      cta: "Ver pagos",
    });
  }
  if (soon.length) {
    const total = soon.reduce((a, b) => a + b.amount, 0);
    tips.push({
      id: "bills-soon",
      tone: "warn",
      title:
        soon.length === 1
          ? `${soon[0].name} vence ${soon[0].daysUntil === 0 ? "hoy" : soon[0].daysUntil === 1 ? "mañana" : `en ${soon[0].daysUntil} días`}`
          : `${soon.length} pagos vencen en los próximos 3 días`,
      detail: `Ten listos ${fmt(total)}.`,
      href: "pagos",
      cta: "Ver pagos",
    });
  }

  if (input.overBudget.length) {
    const worst = [...input.overBudget].sort((a, b) => b.over - a.over)[0];
    tips.push({
      id: "over-budget",
      tone: "warn",
      title:
        input.overBudget.length === 1
          ? `Te pasaste del presupuesto en ${worst.name}`
          : `Te pasaste en ${input.overBudget.length} categorías`,
      detail: `${worst.name}: ${fmt(worst.over)} de más. Compénsalo bajando otra categoría lo que queda del mes.`,
      href: "presupuesto",
      cta: "Ver presupuesto",
    });
  }

  const trap = input.minimumTraps.find((t) => t.years === null || t.years >= 3);
  if (trap) {
    tips.push({
      id: "minimum-trap",
      tone: "warn",
      title: `Pagar solo el mínimo de ${trap.name} sale muy caro`,
      detail:
        trap.years === null
          ? "Con ese pago mínimo la deuda nunca baja: casi todo se va en intereses."
          : `Tardarías unos ${trap.years} años en liquidarla. CONDUSEF recomienda el pago mínimo solo en emergencias.`,
      href: "deudas",
      cta: "Ver plan",
    });
  }

  if (input.emergency && input.emergency.monthlyBasic > 0) {
    const covered = input.emergency.saved / input.emergency.monthlyBasic;
    if (!input.hasEmergencyGoal) {
      tips.push({
        id: "emergency-start",
        tone: "info",
        title: "Empiecen su fondo de emergencia",
        detail: `Lo recomendable es tener 3 meses de gastos básicos: unos ${fmt(input.emergency.monthlyBasic * 3)}.`,
        href: "metas",
        cta: "Crear fondo",
      });
    } else if (covered < 3) {
      tips.push({
        id: "emergency-progress",
        tone: "info",
        title: `Su fondo de emergencia cubre ${covered.toFixed(1)} meses`,
        detail: "La meta son 3 meses de gastos básicos. Cada abono los acerca.",
        href: "metas",
        cta: "Abonar",
      });
    }
  }

  if (input.hormigaYearly >= input.subscriptionsYearly && input.hormigaYearly > 0) {
    tips.push({
      id: "hormiga",
      tone: "info",
      title: `Los gastos hormiga suman ${fmt(input.hormigaYearly)} al año`,
      detail: "Son compras chicas que no se sienten. Recortar la mitad ya es un buen ahorro.",
    });
  } else if (input.subscriptionsYearly > 0) {
    tips.push({
      id: "subscriptions",
      tone: "info",
      title: `Sus suscripciones cuestan ${fmt(input.subscriptionsYearly)} al año`,
      detail: "Revisen si todas se usan. Mucha gente paga alguna que ya olvidó.",
      href: "pagos",
      cta: "Revisar",
    });
  }

  const season = input.seasonal === false ? null : seasonalTip(input.month, fmt);
  if (season) tips.push(season);
  return tips;
}
