import { deleteWorkspaceAction, removeMemberAction, updateWorkspaceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, Input, Label, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { CURRENCIES } from "@/lib/money";
import { getMembers } from "@/lib/queries";
import { InviteButton } from "./invite-button";

export default async function SettingsPage({ params }: PageProps<"/e/[id]/ajustes">) {
  const { id } = await params;
  const { workspace, role, user } = await requireWorkspace(Number(id));
  const members = getMembers(workspace.id);
  const isOwner = role === "owner";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Miembros</h2>
        <ul className="flex flex-col divide-y divide-line text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                {m.name} <span className="text-muted">· {m.email}</span>
                {m.role === "owner" && <span className="ml-2 text-xs text-muted">(dueño)</span>}
              </span>
              {(isOwner || m.id === user.id) && (
                <form action={removeMemberAction.bind(null, workspace.id, m.id)}>
                  <SubmitButton
                    variant="danger"
                    pendingText="…"
                    confirm={m.id === user.id ? "¿Salir de este espacio?" : `¿Quitar a ${m.name}?`}
                  >
                    {m.id === user.id ? "Salir" : "Quitar"}
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        {isOwner && <InviteButton workspaceId={workspace.id} />}
      </Card>

      {isOwner && (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="font-semibold">Espacio</h2>
            <ActionForm
              action={updateWorkspaceAction.bind(null, workspace.id)}
              resetOnSuccess={false}
              className="flex flex-wrap items-end gap-2"
            >
              <Label className="flex-1">
                Nombre
                <Input name="name" defaultValue={workspace.name} required />
              </Label>
              <Label>
                Moneda
                <Select name="currency" defaultValue={workspace.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Label>
              <SubmitButton>Guardar</SubmitButton>
            </ActionForm>
          </Card>

          <Card className="flex flex-col gap-3 border-expense/40">
            <h2 className="font-semibold">Eliminar espacio</h2>
            <p className="text-sm text-muted">
              Borra para siempre todos sus movimientos, categorías y la conexión con Stripe.
            </p>
            <form action={deleteWorkspaceAction.bind(null, workspace.id)}>
              <SubmitButton
                variant="danger"
                pendingText="Eliminando…"
                confirm={`¿Eliminar "${workspace.name}" y todos sus datos? No se puede deshacer.`}
              >
                Eliminar “{workspace.name}”
              </SubmitButton>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
