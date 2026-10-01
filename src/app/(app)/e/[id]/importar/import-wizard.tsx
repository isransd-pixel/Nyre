"use client";

import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { importCsvAction, type ImportResult } from "@/app/actions";
import { buttonClass, Card, FormError, Label, Select } from "@/components/ui";
import { guessMapping, normalizeRows, type ColumnMapping, type DateFormat } from "@/lib/csv";

type Parsed = { fileName: string; headers: string[]; rows: Record<string, string>[] };

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "DMY", label: "Día/Mes/Año (31/01/2026)" },
  { value: "MDY", label: "Mes/Día/Año (01/31/2026)" },
  { value: "YMD", label: "Año-Mes-Día (2026-01-31)" },
];

export function ImportWizard({ workspaceId }: { workspaceId: number }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [amountMode, setAmountMode] = useState<"single" | "split">("single");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();
  const [pending, start] = useTransition();

  function onFile(file: File, encoding = "UTF-8") {
    setError(undefined);
    setResult(undefined);
    Papa.parse<Record<string, string>>(file, {
      encoding,
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: ({ data, meta }) => {
        // Muchos bancos exportan en Latin-1: si UTF-8 deja "�", se vuelve a leer.
        if (encoding === "UTF-8" && JSON.stringify([meta.fields, data.slice(0, 50)]).includes("\uFFFD")) {
          onFile(file, "windows-1252");
          return;
        }
        const headers = (meta.fields ?? []).filter(Boolean);
        if (headers.length < 2 || data.length === 0) {
          setError("No pude leer columnas en ese archivo. ¿Es un CSV con encabezados?");
          return;
        }
        const guess = guessMapping(
          headers,
          data.slice(0, 20).map((r) => r[guessMapping(headers).date ?? ""] ?? ""),
        );
        setParsed({ fileName: file.name, headers, rows: data });
        setMapping(guess);
        setAmountMode(guess.debit ? "split" : "single");
      },
      error: (e) => setError(e.message),
    });
  }

  const effective: ColumnMapping | null = useMemo(() => {
    if (!mapping.date || !mapping.description || !mapping.dateFormat) return null;
    const base = {
      date: mapping.date,
      description: mapping.description,
      dateFormat: mapping.dateFormat,
      invertSign: mapping.invertSign,
    };
    if (amountMode === "single") return mapping.amount ? { ...base, amount: mapping.amount } : null;
    return mapping.debit && mapping.credit ? { ...base, debit: mapping.debit, credit: mapping.credit } : null;
  }, [mapping, amountMode]);

  const preview = useMemo(
    () => (parsed && effective ? normalizeRows(parsed.rows, effective) : null),
    [parsed, effective],
  );

  const column = (key: keyof ColumnMapping, label: string) => (
    <Label>
      {label}
      <Select
        value={(mapping[key] as string | undefined) ?? ""}
        onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || undefined }))}
      >
        <option value="">—</option>
        {parsed!.headers.map((h) => (
          <option key={h}>{h}</option>
        ))}
      </Select>
    </Label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center hover:border-accent">
          <span className="font-medium">{parsed ? parsed.fileName : "Elige un archivo CSV"}</span>
          <span className="text-sm text-muted">
            {parsed ? `${parsed.rows.length} filas · haz clic para cambiarlo` : "Haz clic para buscarlo"}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        <div className="mt-3">
          <FormError message={error} />
        </div>
      </Card>

      {parsed && (
        <Card className="flex flex-col gap-4">
          <h2 className="font-medium">¿Qué columna es cada cosa?</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {column("date", "Fecha")}
            <Label>
              Formato de fecha
              <Select
                value={mapping.dateFormat ?? "DMY"}
                onChange={(e) => setMapping((m) => ({ ...m, dateFormat: e.target.value as DateFormat }))}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Label>
            {column("description", "Descripción")}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={amountMode === "single"} onChange={() => setAmountMode("single")} />
              Una columna de monto (negativo = gasto)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={amountMode === "split"} onChange={() => setAmountMode("split")} />
              Columnas separadas de cargos y abonos
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {amountMode === "single" ? (
              column("amount", "Monto")
            ) : (
              <>
                {column("debit", "Cargos (gastos)")}
                {column("credit", "Abonos (ingresos)")}
              </>
            )}
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={!!mapping.invertSign}
                onChange={(e) => setMapping((m) => ({ ...m, invertSign: e.target.checked }))}
              />
              Invertir signo (gastos aparecen como positivos)
            </label>
          </div>
        </Card>
      )}

      {preview && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">
              Vista previa: {preview.rows.filter((r) => r.type === "income").length} ingresos y{" "}
              {preview.rows.filter((r) => r.type === "expense").length} gastos
              {preview.errors.length > 0 && (
                <span className="text-expense"> · {preview.errors.length} filas con error</span>
              )}
            </h2>
            <button
              className={buttonClass.primary}
              disabled={pending || preview.rows.length === 0}
              onClick={() =>
                start(async () => {
                  setResult(await importCsvAction(workspaceId, effective!, parsed!.rows));
                })
              }
            >
              {pending ? "Importando…" : `Importar ${preview.rows.length} movimientos`}
            </button>
          </div>
          {result && "error" in result && <FormError message={result.error} />}
          {result && "inserted" in result && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm">
              Listo: {result.inserted} movimientos nuevos
              {result.duplicates > 0 && `, ${result.duplicates} ya existían y se omitieron`}.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 font-normal">Fecha</th>
                  <th className="py-1 font-normal">Descripción</th>
                  <th className="py-1 text-right font-normal">Monto</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((r) => (
                  <tr key={r.externalId} className="border-t border-line">
                    <td className="py-1 pr-3 whitespace-nowrap">{r.date}</td>
                    <td className="py-1 pr-3">{r.description}</td>
                    <td className={`py-1 text-right ${r.type === "income" ? "text-income" : "text-expense"}`}>
                      {r.type === "income" ? "+" : "−"}
                      {(r.amountCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 8 && (
              <p className="mt-1 text-xs text-muted">…y {preview.rows.length - 8} más.</p>
            )}
          </div>
          {preview.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Ver filas con error</summary>
              <ul className="mt-1 text-muted">
                {preview.errors.slice(0, 20).map((e) => (
                  <li key={e.line}>
                    Línea {e.line}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
