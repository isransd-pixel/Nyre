import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { longMonth, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month, basePath, current }: { month: string; basePath: string; current: string }) {
  const link = (m: string) => `${basePath}?mes=${m}`;
  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text";
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-line/70 bg-surface p-1 shadow-card">
      <Link className={btn} href={link(shiftMonth(month, -1))} aria-label="Mes anterior">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Link>
      <span className="flex min-w-40 items-center justify-center gap-2 px-2 text-sm font-semibold capitalize">
        <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
        {longMonth(month)}
      </span>
      {month < current ? (
        <Link className={btn} href={link(shiftMonth(month, 1))} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={`${btn} opacity-30`} aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
