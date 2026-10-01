"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (currency: string) => (cents: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);

/** Etiquetas cortas para el eje: "$36K", "€1.2M". */
const compactMoney = (currency: string) => {
  const symbol =
    new Intl.NumberFormat("es-MX", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";
  const num = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  return (cents: number) => `${symbol}${num.format(cents / 100)}`;
};

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-bg text-sm text-muted">
      {children}
    </div>
  );
}

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false };

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm shadow-card">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted">
            {r.color && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

type MonthRow = { label: string; income: number; expense: number; net: number };

export function IncomeExpenseChart({ data, currency }: { data: MonthRow[]; currency: string }) {
  const fmt = money(currency);
  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="h-72">
        <EmptyChart>Aún no hay movimientos. Agrégalos a mano o importa un CSV.</EmptyChart>
      </div>
    );
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="25%" margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={64} tickFormatter={compactMoney(currency)} />
          <Tooltip
            cursor={{ fill: "var(--grid)", opacity: 0.6, radius: 8 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as MonthRow;
              return (
                <TooltipBox
                  title={row.label}
                  rows={[
                    { label: "Entró", value: fmt(row.income), color: "var(--series-1)" },
                    { label: "Salió", value: fmt(row.expense), color: "var(--series-2)" },
                    { label: "Quedó", value: fmt(row.net) },
                  ]}
                />
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            itemSorter={null}
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ fontSize: 13, paddingBottom: 8, color: "var(--muted)" }}
          />
          <defs>
            <linearGradient id="bar-income" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="bar-expense" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--series-2)" />
              <stop offset="100%" stopColor="var(--series-2)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <Bar dataKey="income" name="Entró" fill="url(#bar-income)" radius={[6, 6, 2, 2]} maxBarSize={22} />
          <Bar dataKey="expense" name="Salió" fill="url(#bar-expense)" radius={[6, 6, 2, 2]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MrrChart({ data, currency }: { data: { label: string; mrr: number }[]; currency: string }) {
  const fmt = money(currency);
  if (data.every((d) => d.mrr === 0)) {
    return (
      <div className="h-64">
        <EmptyChart>Sin suscripciones activas en estos meses.</EmptyChart>
      </div>
    );
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <defs>
            <linearGradient id="mrr-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={64} tickFormatter={compactMoney(currency)} />
          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { label: string; mrr: number };
              return <TooltipBox title={row.label} rows={[{ label: "MRR", value: fmt(row.mrr) }]} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#mrr-fill)"
            dot={false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
