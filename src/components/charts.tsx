"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
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
            cursor={{ fill: "var(--grid)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as MonthRow;
              return (
                <TooltipBox
                  title={row.label}
                  rows={[
                    { label: "Ingresos", value: fmt(row.income), color: "var(--series-1)" },
                    { label: "Gastos", value: fmt(row.expense), color: "var(--series-2)" },
                    { label: "Balance", value: fmt(row.net) },
                  ]}
                />
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            itemSorter={null}
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 13, paddingBottom: 8, color: "var(--muted)" }}
          />
          <Bar dataKey="income" name="Ingresos" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Gastos" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
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
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
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
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
