"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const ICONS: Record<string, LucideIcon> = {
  "": LayoutDashboard,
  "/movimientos": ArrowLeftRight,
  "/presupuesto": Target,
  "/metas": PiggyBank,
  "/pagos": BellRing,
  "/deudas": HandCoins,
  "/junta": Users,
  "/importar": Upload,
  "/categorias": Tags,
  "/stripe": CreditCard,
  "/ajustes": Settings,
};

export type NavLink = { href: string; label: string };

function useActive(base: string) {
  const pathname = usePathname();
  return (href: string) => (href === "" ? pathname === base : pathname.startsWith(`${base}${href}`));
}

/** Pestañas principales. */
export function WorkspaceNav({ base, links }: { base: string; links: NavLink[] }) {
  const isActive = useActive(base);
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const Icon = ICONS[l.href];
        return (
          <Link
            key={l.href}
            href={`${base}${l.href}`}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              isActive(l.href) ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Ligas de herramientas (importar, categorías, ajustes) en la esquina del encabezado. */
export function WorkspaceTools({ base, links }: { base: string; links: NavLink[] }) {
  const isActive = useActive(base);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {links.map((l) => {
        const Icon = ICONS[l.href];
        return (
          <Link
            key={l.href}
            href={`${base}${l.href}`}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
              isActive(l.href) ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-bg hover:text-text"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
