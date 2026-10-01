/**
 * Línea de tendencia mínima (sin ejes) para acompañar un número.
 * `id` debe ser único en la página: se usa para el degradado de relleno.
 */
export function Sparkline({
  values,
  id,
  color = "var(--accent)",
  height = 40,
  label,
}: {
  values: number[];
  id: string;
  color?: string;
  height?: number;
  label: string;
}) {
  const w = 120;
  if (values.length < 2 || values.every((v) => v === values[0])) {
    return <div style={{ height }} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 3;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const last = values.length - 1;
  return (
    <div className="relative" style={{ height }}>
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height }} role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
      {/* El punto final va fuera del SVG para que no se deforme al estirarse. */}
      <span
        aria-hidden
        className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
        style={{ left: "100%", top: `${(y(values[last]) / height) * 100}%`, background: color }}
      />
    </div>
  );
}
