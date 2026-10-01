export type Bucket = "need" | "want" | "save";

/** Categorías iniciales. En familia, cada gasto lleva su lugar en la regla 50/30/20. */
export const DEFAULT_CATEGORIES = {
  family: {
    income: ["Sueldo", "Ingresos extra", "Reembolsos"],
    expense: [
      ["Vivienda", "need"],
      ["Supermercado", "need"],
      ["Transporte", "need"],
      ["Servicios", "need"],
      ["Salud", "need"],
      ["Educación", "need"],
      ["Restaurantes", "want"],
      ["Entretenimiento", "want"],
      ["Ropa", "want"],
      ["Suscripciones", "want"],
      ["Otros", "want"],
      ["Ahorro e inversión", "save"],
      ["Pago de deudas", "save"],
    ],
  },
  business: {
    income: ["Suscripciones", "Pagos únicos", "Otros ingresos"],
    expense: [
      ["Infraestructura", null],
      ["Software y herramientas", null],
      ["Comisiones de pago", null],
      ["Reembolsos", null],
      ["Marketing", null],
      ["Nómina y contratistas", null],
      ["Impuestos", null],
      ["Legal y contabilidad", null],
      ["Otros", null],
    ],
  },
} as const satisfies Record<
  "family" | "business",
  { income: readonly string[]; expense: readonly (readonly [string, Bucket | null])[] }
>;

export const DEBT_CATEGORY = "Pago de deudas";

export const BUCKET_LABEL: Record<Bucket, string> = {
  need: "Necesidad",
  want: "Gusto",
  save: "Ahorro y deudas",
};
