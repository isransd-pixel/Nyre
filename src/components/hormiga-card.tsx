import { Coffee, PartyPopper } from "lucide-react";
import type { Hormiga } from "@/lib/hormiga";
import { formatMoney, formatMoneyWhole } from "@/lib/money";
import { Explain } from "./explain";
import { Card, CardTitle } from "./ui";

export function HormigaCard({ hormiga, currency, limit }: { hormiga: Hormiga; currency: string; limit: number }) {
  const fmt = (c: number) => formatMoney(c, currency);
  return (
    <Card className="flex flex-col gap-3 [&>div:first-child]:mb-0">
      <CardTitle icon={Coffee}>
        <span className="flex items-center gap-2">
        Gastos hormiga
        <Explain title="Gastos hormiga">
          Así llama CONDUSEF a las compras chicas y frecuentes (café, antojos, la tiendita) que no se sienten
          pero suman mucho. Contamos gastos de menos de {formatMoneyWhole(limit, currency)} que no son
          necesidades.
        </Explain>
        </span>
      </CardTitle>
      {hormiga.count === 0 ? (
        <p className="flex items-center gap-2 text-sm text-income">
          <PartyPopper className="h-4 w-4" aria-hidden /> Sin gastos hormiga este mes.
        </p>
      ) : (
        <>
          <div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(hormiga.total)}</div>
            <div className="text-sm text-muted">
              en {hormiga.count} compras chicas. Si cada mes es igual, al año son{" "}
              <strong className="text-text">{formatMoneyWhole(hormiga.yearly, currency)}</strong>.
            </div>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {hormiga.top.map((t) => (
              <li key={t.name} className="flex justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <span className="truncate">
                  {t.name} <span className="text-xs text-muted">×{t.count}</span>
                </span>
                <span className="tabular-nums text-muted">{fmt(t.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
