import { formatMoney } from "@/lib/money";

/**
 * "De cada $100 que entraron, $X se gastaron y $Y te quedaron."
 * Una sola barra apilada: gastos (naranja) + lo que queda (azul).
 */
export function FlowBar({
  income,
  expense,
  currency,
  compact = false,
  keptLabel = "Te quedó",
}: {
  income: number;
  expense: number;
  currency: string;
  compact?: boolean;
  keptLabel?: string;
}) {
  if (income === 0 && expense === 0) {
    return <p className="text-sm text-muted">Todavía no hay movimientos este mes.</p>;
  }
  const overspent = expense > income;
  const spentPct = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 100;
  const keptPct = 100 - spentPct;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={
          overspent
            ? `Los gastos superaron a los ingresos por ${formatMoney(expense - income, currency)}`
            : `Se gastó el ${spentPct}% de lo que entró y quedó el ${keptPct}%`
        }
      >
        {spentPct > 0 && (
          <div className="h-full" style={{ width: `${spentPct}%`, background: "var(--series-2)" }} />
        )}
        {keptPct > 0 && (
          <div className="h-full" style={{ width: `${keptPct}%`, background: "var(--series-1)" }} />
        )}
      </div>
      {!compact && (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-2)" }} />
            Gastado: {formatMoney(expense, currency)}
            {income > 0 && <span className="text-muted">({Math.round((expense / income) * 100)}%)</span>}
          </span>
          {overspent ? (
            <span className="text-muted">Faltaron {formatMoney(expense - income, currency)}</span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-1)" }} />
              {keptLabel}: {formatMoney(income - expense, currency)}
              <span className="text-muted">({keptPct}%)</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
