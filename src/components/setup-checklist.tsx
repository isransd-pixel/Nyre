import Link from "next/link";
import { CircleCheck, Circle, Sparkles } from "lucide-react";
import { Card } from "./ui";

export type Step = { done: boolean; title: string; detail: string; href: string };

/** Guía de primeros pasos; desaparece cuando todo está hecho. */
export function SetupChecklist({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          Primeros pasos
        </h2>
        <span className="text-sm text-muted">
          {done} de {steps.length} listos
        </span>
      </div>
      <div className="mb-4 h-1.5 rounded-full bg-bg">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className={`flex gap-3 rounded-lg border border-line p-3 hover:border-accent ${s.done ? "opacity-60" : ""}`}
            >
              {s.done ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-label="Hecho" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-label="Pendiente" />
              )}
              <span>
                <span className={`block text-sm font-medium ${s.done ? "line-through" : ""}`}>{s.title}</span>
                <span className="block text-xs text-muted">{s.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
