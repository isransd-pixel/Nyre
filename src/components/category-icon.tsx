import { createElement } from "react";
import {
  Banknote,
  Briefcase,
  Car,
  Clapperboard,
  CreditCard,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Megaphone,
  Package,
  Percent,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  Server,
  Shirt,
  ShoppingCart,
  Undo2,
  Users,
  Utensils,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Íconos para las categorías por defecto; las que crea el usuario usan uno genérico.
const ICONS: Record<string, LucideIcon> = {
  sueldo: Banknote,
  "ingresos extra": Gift,
  reembolsos: Undo2,
  vivienda: House,
  supermercado: ShoppingCart,
  restaurantes: Utensils,
  transporte: Car,
  servicios: Zap,
  salud: HeartPulse,
  "educación": GraduationCap,
  entretenimiento: Clapperboard,
  ropa: Shirt,
  suscripciones: Repeat,
  "ahorro e inversión": PiggyBank,
  "pago de deudas": HandCoins,
  "pagos únicos": Receipt,
  "otros ingresos": Wallet,
  infraestructura: Server,
  "software y herramientas": Wrench,
  "comisiones de pago": Percent,
  marketing: Megaphone,
  "nómina y contratistas": Users,
  impuestos: Landmark,
  "legal y contabilidad": Scale,
  otros: Package,
};

export function categoryIcon(name: string | null | undefined, type: "income" | "expense"): LucideIcon {
  const icon = name ? ICONS[name.toLowerCase()] : undefined;
  return icon ?? (type === "income" ? Briefcase : CreditCard);
}

// Colores decorativos de los íconos (no codifican datos: el nombre siempre va al lado).
const TINTS = {
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  lime: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};
type Tint = keyof typeof TINTS;

const CATEGORY_TINT: Record<string, Tint> = {
  sueldo: "emerald",
  "ingresos extra": "lime",
  reembolsos: "teal",
  vivienda: "indigo",
  supermercado: "lime",
  restaurantes: "orange",
  transporte: "sky",
  servicios: "amber",
  salud: "rose",
  "educación": "violet",
  entretenimiento: "fuchsia",
  ropa: "pink",
  suscripciones: "cyan",
  "ahorro e inversión": "teal",
  "pago de deudas": "slate",
  otros: "slate",
  infraestructura: "sky",
  "software y herramientas": "violet",
  "comisiones de pago": "amber",
  marketing: "pink",
  "nómina y contratistas": "indigo",
  impuestos: "slate",
  "legal y contabilidad": "teal",
  "pagos únicos": "lime",
  "otros ingresos": "teal",
};

export function categoryTint(name: string | null | undefined): string {
  if (!name) return TINTS.slate;
  const known = CATEGORY_TINT[name.toLowerCase()];
  if (known) return TINTS[known];
  const keys = Object.keys(TINTS) as Tint[];
  const hash = [...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return TINTS[keys[hash % keys.length]];
}

export function CategoryIcon({
  name,
  type,
  size = "md",
}: {
  name: string | null | undefined;
  type: "income" | "expense";
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  return (
    <span aria-hidden className={`inline-flex ${box} shrink-0 items-center justify-center ${categoryTint(name)}`}>
      {createElement(categoryIcon(name, type), { className: size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]" })}
    </span>
  );
}
