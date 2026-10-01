import { BellRing, CalendarPlus, Info, Sparkles } from "lucide-react";
import { deleteBillAction } from "@/app/actions";
import { BillIcon } from "@/components/bill-icon";
import { SubmitButton } from "@/components/submit-button";
import { Card } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import {
  daysUntil,
  detectRecurring,
  dueLabel,
  FREQUENCIES,
  guessBillKind,
  monthlyEquivalent,
} from "@/lib/bills";
import { shiftMonth, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getBills, getCategories, getTransactions } from "@/lib/queries";
import { AddDetectedBill, NewBillForm, PayBillForm } from "./bill-forms";

const DUE_TONE = { bad: "text-expense", warn: "text-warn", muted: "text-muted" };

export default async function BillsPage({ params }: PageProps<"/e/[id]/pagos">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const fmt = (c: number) => formatMoney(c, workspace.currency);

  const bills = getBills(workspace.id);
  const categories = getCategories(workspace.id).filter((c) => c.type === "expense");
  const monthly = bills.reduce((a, b) => a + monthlyEquivalent(b.amountCents, b.frequency), 0);
  const subsMonthly = bills
    .filter((b) => b.kind === "subscription")
    .reduce((a, b) => a + monthlyEquivalent(b.amountCents, b.frequency), 0);

  // Cargos que se repiten en los últimos 4 meses y que aún no están en la lista.
  const month = now.slice(0, 7);
  const recent = [0, 1, 2, 3].flatMap((n) => getTransactions(workspace.id, { month: shiftMonth(month, -n) }));
  const detected = detectRecurring(recent, bills.map((b) => b.name));

  const groups = [
    { title: "Vencidos", items: bills.filter((b) => daysUntil(b.nextDue, now) < 0) },
    { title: "Esta semana", items: bills.filter((b) => { const d = daysUntil(b.nextDue, now); return d >= 0 && d <= 7; }) },
    { title: "Más adelante", items: bills.filter((b) => daysUntil(b.nextDue, now) > 7) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 font-semibold">
              <BellRing className="h-4 w-4 text-accent" aria-hidden />
              Pagos fijos
            </h2>
            <p className="mt-1 text-sm text-muted">
              Luz, internet, colegiaturas, tarjetas y suscripciones en un solo lugar, con aviso antes de
              que venzan. Los recordatorios reducen hasta 1 de cada 5 recargos por pagar tarde.
            </p>
          </div>
          {bills.length > 0 && (
            <a
              href={`/e/${workspace.id}/pagos/calendario`}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Recordatorios en mi celular
            </a>
          )}
        </div>
        {bills.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted">En pagos fijos se van al mes</div>
              <div className="text-2xl font-semibold tabular-nums">{fmt(monthly)}</div>
              <div className="text-xs text-muted">Los bimestrales y anuales, repartidos por mes.</div>
            </div>
            {subsMonthly > 0 && (
              <div>
                <div className="text-sm text-muted">Suscripciones</div>
                <div className="text-2xl font-semibold tabular-nums">
                  {fmt(subsMonthly)} <span className="text-base font-normal text-muted">al mes</span>
                </div>
                <div className="text-xs text-muted">
                  {fmt(subsMonthly * 12)} al año. Revisen que todas se usen: mucha gente paga alguna que ya olvidó.
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted">{g.title}</h3>
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {g.items.map((b) => {
                const due = dueLabel(b.nextDue, now);
                return (
                  <li key={b.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <BillIcon kind={b.kind} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted">{FREQUENCIES[b.frequency].label}</div>
                      </div>
                      <div className="text-right">
                        <div className="tabular-nums">{fmt(b.amountCents)}</div>
                        <div className={`text-xs ${DUE_TONE[due.tone]}`}>{due.text}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 pl-12">
                      <details className="flex-1">
                        <summary className="cursor-pointer text-sm text-accent">Marcar como pagado</summary>
                        <PayBillForm workspaceId={workspace.id} billId={b.id} amount={String(b.amountCents / 100)} />
                      </details>
                      <form action={deleteBillAction.bind(null, workspace.id, b.id)}>
                        <SubmitButton variant="danger" pendingText="…" confirm={`¿Quitar "${b.name}" de tus pagos fijos?`}>
                          Quitar
                        </SubmitButton>
                      </form>
                    </div>
                    {b.kind === "card" && (
                      <p className="mt-2 flex gap-1.5 pl-12 text-xs text-muted">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        Paga el “pago para no generar intereses”, no el mínimo. Ojo: la fecha de corte no es
                        la fecha límite de pago.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}

      {detected.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              Encontramos cargos que se repiten
            </h3>
            <p className="mt-1 text-sm text-muted">
              Aparecen cada mes con un monto parecido. ¿Son pagos fijos? Agrégalos con un clic.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {detected.map((d) => (
              <li key={d.key} className="flex items-center gap-3 py-3">
                <BillIcon kind={guessBillKind(d.name)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted">
                    {fmt(d.amountCents)} · {FREQUENCIES[d.frequency].label.toLowerCase()} · visto en {d.months} meses
                  </div>
                </div>
                <AddDetectedBill
                  workspaceId={workspace.id}
                  values={{
                    name: d.name,
                    kind: guessBillKind(d.name),
                    amount: String(d.amountCents / 100),
                    frequency: d.frequency,
                    nextDue: d.nextDue,
                    categoryId: "",
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">{bills.length ? "Agregar otro pago" : "Agreguen su primer pago fijo"}</h2>
        <NewBillForm workspaceId={workspace.id} categories={categories} defaultDate={now} />
      </Card>

      {bills.length > 0 && (
        <p className="text-xs text-muted">
          “Recordatorios en mi celular” descarga un archivo de calendario. Ábrelo en tu teléfono y cada
          pago aparecerá en tu calendario con un aviso un día antes.
        </p>
      )}
    </div>
  );
}
