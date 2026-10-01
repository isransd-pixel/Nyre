import Link from "next/link";
import { longMonth, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month, basePath, current }: { month: string; basePath: string; current: string }) {
  const link = (m: string) => `${basePath}?mes=${m}`;
  const btn = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg";
  return (
    <div className="flex items-center gap-2">
      <Link className={btn} href={link(shiftMonth(month, -1))} aria-label="Mes anterior">
        ←
      </Link>
      <span className="min-w-36 text-center font-medium capitalize">{longMonth(month)}</span>
      {month < current ? (
        <Link className={btn} href={link(shiftMonth(month, 1))} aria-label="Mes siguiente">
          →
        </Link>
      ) : (
        <span className={`${btn} opacity-40`} aria-hidden>
          →
        </span>
      )}
    </div>
  );
}
