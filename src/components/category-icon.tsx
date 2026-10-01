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

export function CategoryIcon({
  name,
  type,
  size = "md",
}: {
  name: string | null | undefined;
  type: "income" | "expense";
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <span
      aria-hidden
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full bg-bg text-muted`}
    >
      {createElement(categoryIcon(name, type), { className: size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4" })}
    </span>
  );
}
