import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Explain } from "./explain";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 ${className}`}
      {...props}
    />
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {action}
    </div>
  );
}

export function Label({ children, className = "", ...props }: ComponentProps<"label">) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`} {...props}>
      {children}
    </label>
  );
}

const field =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${field} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${field} ${className}`} {...props} />;
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:opacity-90 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-bg disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg px-2 py-1 text-sm text-expense hover:bg-expense/10 disabled:opacity-50",
};

export function Stat({
  label,
  value,
  hint,
  tone,
  icon: Icon,
  explain,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "income" | "expense";
  icon?: LucideIcon;
  /** Explicación en lenguaje sencillo que se abre con el "?". */
  explain?: ReactNode;
}) {
  const color = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
        <span>{label}</span>
        {explain && <Explain title={label}>{explain}</Explain>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
      {message}
    </p>
  );
}
