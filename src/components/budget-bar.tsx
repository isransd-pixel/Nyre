import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { BudgetStatus } from "@/lib/budgets";

const TONE = {
  good: { Icon: CircleCheck, text: "text-income", fill: "var(--series-1)" },
  warn: { Icon: TriangleAlert, text: "text-warn", fill: "var(--warn)" },
  bad: { Icon: CircleAlert, text: "text-expense", fill: "var(--expense)" },
};

/**
 * Barra que se llena conforme gastas. La línea vertical marca qué tanto del mes
 * ya pasó: si la barra la rebasa, vas gastando más rápido que el calendario.
 */
export function BudgetBar({ status, progress }: { status: BudgetStatus; progress: number }) {
  const { Icon, text, fill } = TONE[status.tone];
  const width = Math.min(100, status.pct * 100);
  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative h-2.5 rounded-full bg-bg"
        role="img"
        aria-label={`${Math.round(status.pct * 100)}% del presupuesto usado. ${status.message}`}
      >
        <div className="h-2.5 rounded-full" style={{ width: `${width}%`, background: fill }} />
        {progress > 0 && progress < 1 && (
          <div
            className="absolute -top-1 h-4.5 w-0.5 rounded bg-text/60"
            style={{ left: `${progress * 100}%` }}
            title="Hoy"
            aria-hidden
          />
        )}
      </div>
      <div className={`flex items-center gap-1 text-xs ${text}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{status.message}</span>
      </div>
    </div>
  );
}
