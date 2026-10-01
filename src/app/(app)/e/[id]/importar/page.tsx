import { requireWorkspace } from "@/lib/auth";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage({ params }: PageProps<"/e/[id]/importar">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <p className="text-sm text-muted">
        Descarga el estado de cuenta de tu banco en CSV y súbelo aquí. Puedes subir el mismo
        archivo varias veces: los movimientos repetidos se omiten. Las{" "}
        <a className="text-accent hover:underline" href={`/e/${workspace.id}/categorias`}>
          reglas de categorías
        </a>{" "}
        se aplican automáticamente.
        {workspace.kind === "business" &&
          " Si sincronizas Stripe, no importes los depósitos (payouts) de Stripe al banco: se contarían dos veces."}
      </p>
      <ImportWizard workspaceId={workspace.id} />
    </div>
  );
}
