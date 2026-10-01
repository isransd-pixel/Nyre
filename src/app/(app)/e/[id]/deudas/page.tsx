import { createElement } from "react";
import { CreditCard, Landmark, Mountain, Receipt, Snowflake, TriangleAlert, Trophy } from "lucide-react";
import { deleteDebtAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, Input } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { longMonth, shiftMonth, today } from "@/lib/dates";
import { durationLabel, minimumOnly, simulatePlan, STRATEGY_INFO, type Strategy } from "@/lib/debts";
import { formatMoney, parseAmount } from "@/lib/money";
import { getDebts } from "@/lib/queries";
import { NewDebtForm, PayDebtForm, UpdateBalanceForm } from "./debt-forms";

const KIND_ICON = { card: CreditCard, loan: Landmark, other: Receipt };

export default async function DebtsPage({ params, searchParams }: PageProps<"/e/[id]/deudas">) {
  const { id } = await params;
  const sp = await searchParams;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const month = now.slice(0, 7);
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  // El primer pago es este mes: con n pagos se termina en el mes n-1 a partir de hoy.
  const monthOf = (n: number) => longMonth(shiftMonth(month, n - 1));

  const debts = getDebts(workspace.id);
  const open = debts.filter((d) => d.balanceCents > 0);
  const totalOwed = open.reduce((a, d) => a + d.balanceCents, 0);
  const minimums = open.reduce((a, d) => a + Math.min(d.minPaymentCents, d.balanceCents), 0);
  const suggested = Math.ceil((minimums * 1.25) / 10000) * 10000;
  const asked = typeof sp.pago === "string" ? parseAmount(sp.pago) : null;
  const payment = asked && asked > 0 ? asked : suggested;

  const plans = (["snowball", "avalanche"] as Strategy[]).map((s) => ({ strategy: s, result: simulatePlan(open, payment, s) }));
  const [snow, ava] = plans.map((p) => p.result);
  const savings = snow.ok && ava.ok ? snow.totalInterest - ava.totalInterest : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-semibold">Plan para salir de deudas</h2>
          <p className="mt-1 text-sm text-muted">
            Anota tus tarjetas y préstamos, di cuánto pueden pagar al mes en total y te decimos en qué
            orden pagarlas y cuándo quedan libres.
          </p>
        </div>
        {open.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-muted">Deben en total</div>
            <div className="text-2xl font-semibold tabular-nums text-expense">{fmt(totalOwed)}</div>
            <div className="text-xs text-muted">Mínimos: {fmt(minimums)} al mes</div>
          </div>
        )}
      </Card>

      {open.length > 0 && (
        <Card className="flex flex-col gap-4">
          <form className="flex flex-wrap items-end gap-2" action={`/e/${workspace.id}/deudas`}>
            <label className="flex flex-col gap-1.5 text-sm">
              ¿Cuánto pueden pagar en total cada mes?
              <Input name="pago" inputMode="decimal" defaultValue={String(payment / 100)} className="w-40" />
            </label>
            <button className={buttonClass.primary}>Calcular</button>
            <span className="text-xs text-muted">Mínimo necesario: {fmt(minimums)}. Mientras más, más rápido salen.</span>
          </form>

          {!snow.ok && snow.reason === "below-minimums" ? (
            <p className="flex items-center gap-2 rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
              <TriangleAlert className="h-4 w-4" aria-hidden />
              Ese monto no alcanza para los pagos mínimos ({fmt(snow.minimums)}). Si no pueden cubrirlos,
              llamen al banco para pedir una reestructura antes de atrasarse.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map(({ strategy, result }) => {
                const info = STRATEGY_INFO[strategy];
                return (
                  <div
                    key={strategy}
                    className={`flex flex-col gap-3 rounded-xl border p-4 ${strategy === "snowball" ? "border-accent" : "border-line"}`}
                  >
                    <div className="flex items-center gap-2">
                      {createElement(strategy === "snowball" ? Snowflake : Mountain, {
                        className: "h-4 w-4 text-accent",
                        "aria-hidden": true,
                      })}
                      <h3 className="font-semibold">{info.name}</h3>
                      {strategy === "snowball" && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Recomendado</span>
                      )}
                    </div>
                    <p className="text-sm text-muted">{info.short}</p>
                    {result.ok ? (
                      <>
                        <div>
                          <div className="text-sm text-muted">Sin deudas en</div>
                          <div className="text-xl font-semibold capitalize">{monthOf(result.months)}</div>
                          <div className="text-xs text-muted">
                            {durationLabel(result.months)} · intereses {fmt(result.totalInterest)}
                          </div>
                        </div>
                        <ol className="flex flex-col gap-1 text-sm">
                          {result.payoffs.map((p, i) => (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span>
                                {i + 1}. {p.name}
                              </span>
                              <span className="text-muted">{monthOf(p.month)}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <p className="text-sm text-expense">Con ese pago tardarían más de 50 años. Prueben con más.</p>
                    )}
                    <p className="text-xs text-muted">{info.why}</p>
                  </div>
                );
              })}
            </div>
          )}
          {savings > 0 && snow.ok && (
            <p className="text-sm">
              <strong>¿Cuál elegir?</strong> La avalancha les ahorra {fmt(savings)} en intereses; la bola de
              nieve les da su primera deuda liquidada en {durationLabel(snow.payoffs[0].month)}. Lo más
              importante es elegir una y no rendirse.
            </p>
          )}
        </Card>
      )}

      {debts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {debts.map((d) => {
            const minOnly = d.balanceCents > 0 ? minimumOnly({ ...d }) : null;
            return (
              <Card key={d.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-muted" aria-hidden>
                    {createElement(KIND_ICON[d.kind], { className: "h-4 w-4" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{d.name}</h3>
                    <p className="text-xs text-muted">
                      Interés {(d.annualRateBp / 100).toFixed(d.annualRateBp % 100 ? 2 : 0)}% anual · mínimo {fmt(d.minPaymentCents)}
                    </p>
                  </div>
                  <form action={deleteDebtAction.bind(null, workspace.id, d.id)}>
                    <SubmitButton variant="danger" pendingText="…" confirm={`¿Borrar "${d.name}"?`}>
                      Borrar
                    </SubmitButton>
                  </form>
                </div>
                {d.balanceCents === 0 ? (
                  <p className="flex items-center gap-2 text-income">
                    <Trophy className="h-4 w-4" aria-hidden /> ¡Liquidada!
                  </p>
                ) : (
                  <>
                    <div className="text-2xl font-semibold tabular-nums">{fmt(d.balanceCents)}</div>
                    {d.annualRateBp === 0 ? (
                      <p className="text-xs text-muted">
                        Sin intereses{minOnly ? `: con el pago mínimo terminas en ${durationLabel(minOnly.months)}.` : "."}
                      </p>
                    ) : (
                      <p className="flex gap-1.5 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {minOnly
                          ? `Si solo pagas el mínimo tardarías ${durationLabel(minOnly.months)} y pagarías ${fmt(minOnly.totalInterest)} de intereses.`
                          : "Con el pago mínimo esta deuda nunca baja: casi todo se va en intereses."}
                      </p>
                    )}
                    <PayDebtForm workspaceId={workspace.id} debtId={d.id} suggested={String(d.minPaymentCents / 100)} />
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted">¿Cambió el saldo? Actualízalo</summary>
                      <UpdateBalanceForm workspaceId={workspace.id} debtId={d.id} />
                    </details>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">{debts.length ? "Agregar otra deuda" : "Anoten sus deudas"}</h2>
        <NewDebtForm workspaceId={workspace.id} />
      </Card>

      <p className="text-xs text-muted">
        Cálculo aproximado: supone que no hacen compras nuevas con las tarjetas y que la tasa no cambia.
        No incluye IVA de intereses ni comisiones.
      </p>
    </div>
  );
}
