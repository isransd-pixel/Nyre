import { notFound } from "next/navigation";
import { connectStripeAction, disconnectStripeAction, syncStripeAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { CircleCheck, CreditCard } from "lucide-react";
import { Card, CardTitle, Input, Label } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getStripeConnection } from "@/lib/queries";

export default async function StripePage({ params }: PageProps<"/e/[id]/stripe">) {
  const { id } = await params;
  const { workspace, role } = await requireWorkspace(Number(id));
  if (workspace.kind !== "business") notFound();
  const conn = getStripeConnection(workspace.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {conn ? (
        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle icon={CircleCheck}>Stripe conectado</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Llave {conn.keyHint} · última sincronización{" "}
              {conn.lastSyncedAt
                ? conn.lastSyncedAt.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
                : "nunca"}
            </p>
          </div>
          <ActionForm action={syncStripeAction.bind(null, workspace.id)} className="flex flex-wrap gap-2">
            <SubmitButton pendingText="Sincronizando…">Sincronizar ahora</SubmitButton>
          </ActionForm>
          {role === "owner" && (
            <form action={disconnectStripeAction.bind(null, workspace.id)}>
              <SubmitButton
                variant="danger"
                pendingText="Desconectando…"
                confirm="¿Desconectar Stripe? Se borran las suscripciones guardadas; los movimientos importados se conservan."
              >
                Desconectar Stripe
              </SubmitButton>
            </form>
          )}
        </Card>
      ) : role === "owner" ? (
        <Card className="flex flex-col gap-4">
          <CardTitle icon={CreditCard} hint="Tarda un minuto y es de solo lectura.">Conectar Stripe</CardTitle>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>
              En Stripe ve a <strong>Desarrolladores → Llaves de API → Crear llave restringida</strong>.
            </li>
            <li>
              Dale permiso de <strong>lectura</strong> a <em>Subscriptions</em> y <em>Balance</em> (lo
              demás en “Ninguno”).
            </li>
            <li>Pega aquí la llave (empieza con rk_live_). Se guarda cifrada.</li>
          </ol>
          <ActionForm action={connectStripeAction.bind(null, workspace.id)} className="flex flex-wrap items-end gap-2">
            <Label className="flex-1">
              Llave restringida
              <Input name="key" placeholder="rk_live_…" autoComplete="off" required />
            </Label>
            <SubmitButton pendingText="Conectando…">Conectar</SubmitButton>
          </ActionForm>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">Solo el dueño del espacio puede conectar Stripe.</p>
        </Card>
      )}

      <Card className="text-sm text-muted">
        <h3 className="mb-2 font-medium text-text">¿Qué se sincroniza?</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Suscripciones, para calcular MRR, ARR, clientes, churn y LTV.</li>
          <li>Cobros como ingresos; comisiones y reembolsos como gastos (último año la primera vez).</li>
          <li>
            Los depósitos a tu banco (payouts) no se cuentan como ingreso, porque el dinero ya se
            registró al cobrarse.
          </li>
          <li>Solo se toman montos en {workspace.currency}, la moneda de este espacio.</li>
        </ul>
      </Card>
    </div>
  );
}
