import { CircleHelp } from "lucide-react";

/** Botón "?" que despliega una explicación en lenguaje sencillo. No necesita JavaScript. */
export function Explain({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        className="inline-flex cursor-pointer list-none items-center rounded-full text-muted hover:text-accent [&::-webkit-details-marker]:hidden"
        aria-label={`¿Qué es ${title}?`}
      >
        <CircleHelp className="h-4 w-4" />
      </summary>
      <div className="absolute left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-left text-sm font-normal text-text shadow-lg">
        <div className="mb-1 font-medium">{title}</div>
        <div className="text-muted">{children}</div>
      </div>
    </details>
  );
}
