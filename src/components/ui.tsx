import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Explain } from "./explain";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-line/70 bg-surface p-5 shadow-card print:shadow-none ${className}`}
      {...props}
    />
  );
}

/** Título de sección dentro de una tarjeta, con ícono opcional. */
export function CardTitle({
  icon: Icon,
  children,
  action,
  hint,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          {Icon && (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          )}
          {children}
        </h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Encabezado de cada sección: ícono grande, título, explicación corta y un
 * espacio a la derecha para un número o botón.
 */
export function IntroCard({
  icon: Icon,
  title,
  children,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-surface p-5 shadow-card sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center gap-5">
        <span className="bg-brand inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{children}</p>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
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
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}

const field =
  "rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-normal text-text outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${field} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${field} ${className}`} {...props} />;
}

export const buttonClass = {
  primary:
    "bg-brand inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium shadow-card transition hover:border-accent/40 hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg px-2 py-1 text-sm text-expense transition hover:bg-expense/10 disabled:opacity-50",
};

/** Ícono dentro de un cuadrito de color suave. */
export function IconTile({
  icon: Icon,
  className = "bg-accent-soft text-accent",
  size = "md",
}: {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = { sm: "h-8 w-8 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-12 w-12 rounded-2xl" }[size];
  const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center ${box} ${className}`}>
      <Icon className={icon} />
    </span>
  );
}

const STAT_TONE = {
  income: { value: "text-income", tile: "bg-income/10 text-income" },
  expense: { value: "text-expense", tile: "bg-expense/10 text-expense" },
  neutral: { value: "", tile: "bg-accent-soft text-accent" },
};

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
  explain,
  footer,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "income" | "expense";
  icon?: LucideIcon;
  /** Explicación en lenguaje sencillo que se abre con el "?". */
  explain?: ReactNode;
  footer?: ReactNode;
}) {
  const t = STAT_TONE[tone ?? "neutral"];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon && <IconTile icon={icon} size="sm" className={t.tile} />}
        <span className="font-medium">{label}</span>
        {explain && <Explain title={label}>{explain}</Explain>}
      </div>
      <div>
        <div className={`text-2xl font-semibold tracking-tight tabular-nums ${t.value}`}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>
      {footer}
    </Card>
  );
}

/** Pastilla de cambio: "↑ 12% vs sep". */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "bad" | "neutral" }) {
  const cls = {
    good: "bg-income/10 text-income",
    bad: "bg-expense/10 text-expense",
    neutral: "bg-surface-2 text-muted",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">
      {message}
    </p>
  );
}
