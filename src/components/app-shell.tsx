"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, PiggyBank, Plus, X } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { MOBILE_TABS, navSections, type ShellWorkspace } from "./nav-config";
import { WorkspaceBadge } from "./workspace-badge";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
      <span className="bg-brand inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow">
        <PiggyBank className="h-5 w-5" aria-hidden />
      </span>
      Kipu
    </Link>
  );
}

function useCurrent(workspaces: ShellWorkspace[]) {
  const pathname = usePathname();
  const match = pathname.match(/^\/e\/(\d+)(\/[^/]*)?/);
  const active = match ? workspaces.find((w) => w.id === Number(match[1])) : undefined;
  const section = match?.[2] ?? "";
  return { active, section };
}

function NavContent({
  workspaces,
  onNavigate,
}: {
  workspaces: ShellWorkspace[];
  onNavigate?: () => void;
}) {
  const { active, section } = useCurrent(workspaces);
  const item = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition";
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">Espacios</div>
        <div className="flex flex-col gap-0.5">
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/e/${w.id}`}
              onClick={onNavigate}
              className={`${item} ${active?.id === w.id ? "bg-surface-2 font-semibold" : "text-muted hover:bg-surface-2 hover:text-text"}`}
            >
              <WorkspaceBadge kind={w.kind} size="sm" />
              <span className="truncate">{w.name}</span>
            </Link>
          ))}
          <Link
            href="/#nuevo-espacio"
            onClick={onNavigate}
            className={`${item} text-muted hover:bg-surface-2 hover:text-text`}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-line">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </span>
            Nuevo espacio
          </Link>
        </div>
      </div>

      {active &&
        navSections(active.kind).map((s) => (
          <div key={s.title}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{s.title}</div>
            <div className="flex flex-col gap-0.5">
              {s.items.map((it) => {
                const on = it.href === section;
                return (
                  <Link
                    key={it.href}
                    href={`/e/${active.id}${it.href}`}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={`${item} ${on ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-text"}`}
                  >
                    <it.icon className="h-[18px] w-[18px]" aria-hidden />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

function UserBox({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
      <span className="bg-brand inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted">{email}</div>
      </div>
      <form action={logout}>
        <button className="rounded-lg p-2 text-muted hover:bg-surface hover:text-text" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  user,
  workspaces,
  children,
}: {
  user: { name: string; email: string };
  workspaces: ShellWorkspace[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { active, section } = useCurrent(workspaces);

  return (
    <div className="min-h-full">
      {/* Menú lateral (computadora) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/70 bg-surface px-4 py-5 lg:flex print:hidden">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex-1 overflow-y-auto" aria-label="Menú">
          <NavContent workspaces={workspaces} />
        </nav>
        <UserBox name={user.name} email={user.email} />
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-surface/85 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl p-2 text-muted hover:bg-surface-2"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8 print:m-0 print:p-0">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Barra inferior (celular) */}
      {active && (
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line/70 bg-surface/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden print:hidden"
        >
          {navSections(active.kind)
            .flatMap((s) => s.items)
            .filter((it) => MOBILE_TABS.includes(it.href))
            .map((it) => {
              const on = it.href === section;
              return (
                <Link
                  key={it.href}
                  href={`/e/${active.id}${it.href}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] ${on ? "font-semibold text-accent" : "text-muted"}`}
                >
                  <it.icon className="h-5 w-5" aria-hidden />
                  {it.label.replace(" de ahorro", "")}
                </Link>
              );
            })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] text-muted">
            <Menu className="h-5 w-5" aria-hidden />
            Más
          </button>
        </nav>
      )}

      {/* Menú completo (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Cerrar menú">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <NavContent workspaces={workspaces} onNavigate={() => setOpen(false)} />
            <div className="mt-6">
              <UserBox name={user.name} email={user.email} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
