"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNav({ base, links }: { base: string; links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const href = `${base}${l.href}`;
        const active = l.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={l.href}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
