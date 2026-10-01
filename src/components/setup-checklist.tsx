import Link from "next/link";
import { ArrowRight, CircleCheck, Rocket } from "lucide-react";
import { ProgressRing } from "./progress-ring";
import { Card } from "./ui";

export type Step = { done: boolean; title: string; detail: string; href: string };

/** Guía de primeros pasos; desaparece cuando todo está hecho. */
export function SetupChecklist({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <ProgressRing value={done / steps.length} size={64} stroke={7} label={`${done} de ${steps.length} pasos listos`}>
          <span className="text-sm font-semibold tabular-nums">
            {done}/{steps.length}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <Rocket className="h-4 w-4 text-accent" aria-hidden />
            Primeros pasos
          </h2>
          <p className="text-sm text-muted">
            Siguiente: <strong className="text-text">{next.title}</strong>. {next.detail}
          </p>
        </div>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className={`group flex h-full items-center gap-3 rounded-2xl p-3 ring-1 transition ${
                s.done ? "bg-surface-2 ring-transparent" : "bg-surface ring-line hover:ring-accent/50"
              }`}
            >
              {s.done ? (
                <CircleCheck className="h-6 w-6 shrink-0 text-income" aria-label="Hecho" />
              ) : (
                <span className="bg-brand inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                  {i + 1}
                </span>
              )}
              <span className={`flex-1 text-sm font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.title}</span>
              {!s.done && <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
