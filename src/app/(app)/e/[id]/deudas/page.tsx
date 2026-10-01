import { createElement } from "react";
import { Calculator, CreditCard, HandCoins, Landmark, Mountain, Plus, Receipt, Snowflake, TriangleAlert, Trophy } from "lucide-react";
import { deleteDebtAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, CardTitle, IconTile, Input, IntroCard } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { longMonth, shiftMonth, today } from "@/lib/dates";
import { durationLabel, minimumOnly, simulatePlan, STRATEGY_INFO, type Strategy } from "@/lib/debts";
import { formatMoney, parseAmount } from "@/lib/money";
import { getDebts } from "@/lib/queries";
import { NewDebtForm, PayDebtForm, UpdateBalanceForm } from "./debt-forms";

const KIND_ICON = { card: CreditCard, loan: Landmark, other: Receipt };
const KIND_TINT = {
  card: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  loan: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  other: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

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
      <IntroCard
        icon={HandCoins}
        title="Plan para salir de deudas"
        aside={
          open.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted">Deben en total</div>
              <div className="text-3xl font-semibold tracking-tight tabular-nums text-expense">{fmt(totalOwed)}</div>
              <div className="text-xs text-muted">Mínimos: {fmt(minimums)} al mes</div>
            </div>
          )
        }
      >
        Anota tus tarjetas y préstamos, di cuánto pueden pagar al mes en total y te decimos en qué orden
        pagarlas y cuándo quedan libres.
      </IntroCard>

      {open.length > 0 && (
        <Card className="flex flex-col gap-4">
          <CardTitle icon={Calculator} hint="Prueben distintos montos: verán cómo cambia la fecha en que quedan libres.">
            Su plan
          </CardTitle>
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
                    className={`flex flex-col gap-3 rounded-2xl p-5 ${
                      strategy === "snowball" ? "bg-accent-soft ring-2 ring-accent/40" : "bg-surface-2 ring-1 ring-line"
                    }`}
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
                          <div className="text-2xl font-semibold tracking-tight capitalize">{monthOf(result.months)}</div>
                          <div className="text-xs text-muted">
                            {durationLabel(result.months)} · intereses {fmt(result.totalInterest)}
                          </div>
                        </div>
                        <ol className="flex flex-col gap-2 text-sm">
                          {result.payoffs.map((p, i) => (
                            <li key={p.id} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <span className="bg-brand inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white">
                                  {i + 1}
                                </span>
                                {p.name}
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
                  <IconTile icon={KIND_ICON[d.kind]} className={KIND_TINT[d.kind]} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight">{d.name}</h3>
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
                  <p className="flex items-center gap-2 rounded-2xl bg-income/10 px-4 py-3 font-semibold text-income">
                    <Trophy className="h-5 w-5" aria-hidden /> ¡Liquidada! Un peso menos encima.
                  </p>
                ) : (
                  <>
                    <div className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(d.balanceCents)}</div>
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
        <CardTitle icon={Plus}>{debts.length ? "Agregar otra deuda" : "Anoten sus deudas"}</CardTitle>
        <NewDebtForm workspaceId={workspace.id} />
      </Card>

      <p className="text-xs text-muted">
        Cálculo aproximado: supone que no hacen compras nuevas con las tarjetas y que la tasa no cambia.
        No incluye IVA de intereses ni comisiones.
      </p>
    </div>
  );
}
