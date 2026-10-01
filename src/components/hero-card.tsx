import { ArrowDown, ArrowUp, CircleAlert, Sparkles, ThumbsUp, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import type { Verdict } from "@/lib/insights";
import { changeVs } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { ProgressRing } from "./progress-ring";

const VERDICT_ICON = { good: ThumbsUp, warn: TriangleAlert, bad: CircleAlert };

function Change({ now, before, goodWhenUp }: { now: number; before: number; goodWhenUp: boolean }) {
  if (now === 0) return <span className="text-white/70">Aún sin movimientos</span>;
  const c = changeVs(now, before);
  if (!c || c.pct === 0) return <span className="text-white/70">Igual que el mes pasado</span>;
  const Arrow = c.pct > 0 ? ArrowUp : ArrowDown;
  const good = c.pct > 0 === goodWhenUp;
  return (
    <span className="inline-flex items-center gap-1 text-white/80">
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${good ? "bg-emerald-400/25" : "bg-rose-400/25"}`}>
        <Arrow className="h-3 w-3" aria-hidden />
      </span>
      {c.label} vs mes pasado
    </span>
  );
}

/** La tarjeta principal: cómo va el mes, en grande y con el degradado de marca. */
export function HeroCard({
  monthLabel,
  verdict,
  income,
  expense,
  prevIncome,
  prevExpense,
  currency,
  keptLabel,
}: {
  monthLabel: string;
  verdict: Verdict | null;
  income: number;
  expense: number;
  prevIncome: number;
  prevExpense: number;
  currency: string;
  keptLabel: string;
}) {
  const fmt = (c: number) => formatMoney(c, currency);
  const net = income - expense;
  const rate = income > 0 ? net / income : 0;
  const VIcon = verdict ? VERDICT_ICON[verdict.tone] : Sparkles;

  return (
    <section className="bg-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-glow sm:p-8 print:shadow-none">
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full border-[40px] border-white/5" />
      <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize backdrop-blur">
              {monthLabel}
            </span>
            <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <VIcon className="h-6 w-6 shrink-0" aria-hidden />
              {verdict ? verdict.title : "Empecemos el mes"}
            </h2>
            <p className="mt-1 text-white/80">
              {verdict ? verdict.detail : "Anota tus gastos o sube el CSV de tu banco para ver cómo vas."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-sm text-white/75">{keptLabel}</div>
            <div className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{fmt(net)}</div>
          </div>
          <ProgressRing
            value={rate}
            size={112}
            stroke={12}
            color="#ffffff"
            track="rgb(255 255 255 / 0.18)"
            label={`Te quedó el ${Math.round(Math.max(0, rate) * 100)}% de lo que entró`}
          >
            <span className="text-2xl font-semibold tabular-nums">{net < 0 ? "—" : `${Math.round(rate * 100)}%`}</span>
            <span className="text-[11px] text-white/75">{net < 0 ? "en rojo" : "de lo que entró"}</span>
          </ProgressRing>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Entró", value: income, before: prevIncome, up: true, Icon: TrendingUp },
            { label: "Salió", value: expense, before: prevExpense, up: false, Icon: TrendingDown },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <k.Icon className="h-4 w-4" aria-hidden />
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{fmt(k.value)}</div>
              <div className="mt-1 text-xs">
                <Change now={k.value} before={k.before} goodWhenUp={k.up} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
