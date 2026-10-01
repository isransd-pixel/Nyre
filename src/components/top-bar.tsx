import Link from "next/link";
import { logout } from "@/app/(auth)/actions";

export function TopBar({ userName }: { userName: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Nyre
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{userName}</span>
          <form action={logout}>
            <button className="text-muted hover:text-text">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
