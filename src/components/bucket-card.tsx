import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { bucketAdvice, REFERENCE, type BucketSplit } from "@/lib/buckets";
import { formatMoney } from "@/lib/money";
import { Explain } from "./explain";
import { Card } from "./ui";

const ROWS = [
  { key: "need", label: "Necesidades", hint: "renta, súper, luz, transporte", color: "var(--series-1)" },
  { key: "want", label: "Gustos", hint: "salidas, antojos, ropa, streaming", color: "var(--series-2)" },
  { key: "save", label: "Ahorro y deudas", hint: "lo que guardan o abonan, y lo que sobró", color: "var(--series-3)" },
] as const;

/** La regla 50/30/20 como una sola barra con su referencia. */
export function BucketCard({ split, currency, base }: { split: BucketSplit; currency: string; base: string }) {
  const fmt = (c: number) => formatMoney(c, currency);
  const total = Math.max(split.income, split.need + split.want + split.save + split.unclassified);
  const advice = bucketAdvice(split);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          Necesidades, gustos y ahorro
          <Explain title="La regla 50/30/20">
            Una guía sencilla: de lo que entra, más o menos 50% para lo necesario, 30% para gustos y 20%
            para ahorrar o pagar deudas. No es una ley; sirve para ver si algo está desbalanceado.
          </Explain>
        </h2>
        <p className="text-sm text-muted">De cada peso que entró este mes.</p>
      </div>
      {split.income === 0 ? (
        <p className="text-sm text-muted">Anota los ingresos del mes para ver el reparto.</p>
      ) : (
        <>
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Reparto del ingreso">
            {ROWS.map((r) => {
              const v = split[r.key];
              return v > 0 ? <div key={r.key} style={{ width: `${(v / total) * 100}%`, background: r.color }} /> : null;
            })}
            {split.unclassified > 0 && (
              <div className="bg-muted/30" style={{ width: `${(split.unclassified / total) * 100}%` }} />
            )}
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {ROWS.map((r) => {
              const pct = Math.round((split[r.key] / split.income) * 100);
              return (
                <li key={r.key} className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: r.color }} aria-hidden />
                  <span className="flex-1">
                    {r.label} <span className="text-xs text-muted">· {r.hint}</span>
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                  <span className="w-24 text-right text-xs text-muted">ref. {REFERENCE[r.key] * 100}%</span>
                </li>
              );
            })}
          </ul>
          {split.unclassified > 0 && (
            <p className="text-xs text-muted">
              {fmt(split.unclassified)} están en categorías sin clasificar.{" "}
              <Link href={`${base}/categorias`} className="text-accent hover:underline">
                Clasificarlas
              </Link>
            </p>
          )}
          {advice && (
            <p className={`flex gap-1.5 text-sm ${advice.tone === "good" ? "text-income" : "text-warn"}`}>
              {advice.tone === "good" ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              {advice.text}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
