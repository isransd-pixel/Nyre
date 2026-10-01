export const DEFAULT_CATEGORIES = {
  family: {
    income: ["Sueldo", "Ingresos extra", "Reembolsos"],
    expense: [
      "Vivienda",
      "Supermercado",
      "Restaurantes",
      "Transporte",
      "Servicios",
      "Salud",
      "Educación",
      "Entretenimiento",
      "Ropa",
      "Suscripciones",
      "Ahorro e inversión",
      "Otros",
    ],
  },
  business: {
    income: ["Suscripciones", "Pagos únicos", "Otros ingresos"],
    expense: [
      "Infraestructura",
      "Software y herramientas",
      "Comisiones de pago",
      "Reembolsos",
      "Marketing",
      "Nómina y contratistas",
      "Impuestos",
      "Legal y contabilidad",
      "Otros",
    ],
  },
} as const;
