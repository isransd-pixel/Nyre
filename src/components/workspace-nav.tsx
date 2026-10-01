"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  LayoutDashboard,
  Settings,
  Tags,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "": LayoutDashboard,
  "/movimientos": ArrowLeftRight,
  "/presupuesto": Target,
  "/importar": Upload,
  "/categorias": Tags,
  "/stripe": CreditCard,
  "/ajustes": Settings,
};

export function WorkspaceNav({ base, links }: { base: string; links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const href = `${base}${l.href}`;
        const active = l.href === "" ? pathname === base : pathname.startsWith(href);
        const Icon = ICONS[l.href];
        return (
          <Link
            key={l.href}
            href={href}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
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
