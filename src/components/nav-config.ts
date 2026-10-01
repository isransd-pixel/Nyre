import {
  ArrowLeftRight,
  BellRing,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tags,
  Target,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { title: string; items: NavItem[] };

/** Secciones del menú de un espacio; `href` es relativo a /e/[id]. */
export function navSections(kind: "family" | "business"): NavSection[] {
  const isFamily = kind === "family";
  return [
    {
      title: "General",
      items: [
        { href: "", label: "Resumen", icon: LayoutDashboard },
        { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
        { href: "/presupuesto", label: "Presupuesto", icon: Target },
      ],
    },
    {
      title: "Planear",
      items: [
        { href: "/metas", label: "Metas de ahorro", icon: PiggyBank },
        { href: "/pagos", label: "Pagos fijos", icon: BellRing },
        { href: "/deudas", label: "Deudas", icon: HandCoins },
        ...(isFamily ? [{ href: "/junta", label: "Junta familiar", icon: Users }] : []),
      ],
    },
    {
      title: "Herramientas",
      items: [
        { href: "/importar", label: "Importar CSV", icon: Upload },
        { href: "/categorias", label: "Categorías", icon: Tags },
        ...(isFamily ? [] : [{ href: "/stripe", label: "Stripe", icon: CreditCard }]),
        { href: "/ajustes", label: "Ajustes", icon: Settings },
      ],
    },
  ];
}

/** Las cuatro secciones de la barra inferior en el celular. */
export const MOBILE_TABS = ["", "/movimientos", "/metas", "/pagos"];

export type ShellWorkspace = { id: number; name: string; kind: "family" | "business" };
