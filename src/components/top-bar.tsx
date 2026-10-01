import Link from "next/link";
import { LogOut, PiggyBank } from "lucide-react";
import { logout } from "@/app/(auth)/actions";

export function TopBar({ userName }: { userName: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-text">
            <PiggyBank className="h-4 w-4" aria-hidden />
          </span>
          Nyre
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{userName}</span>
          <form action={logout}>
            <button className="flex items-center gap-1 text-muted hover:text-text">
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
