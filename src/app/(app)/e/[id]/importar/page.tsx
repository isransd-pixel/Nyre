import { CircleCheck, Landmark, Upload } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage({ params }: PageProps<"/e/[id]/importar">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { Icon: Landmark, title: "Descarga", text: "En la app o web de tu banco, exporta tu estado de cuenta como CSV." },
          { Icon: Upload, title: "Sube", text: "Elige el archivo aquí abajo. Revisamos qué columna es cada cosa." },
          { Icon: CircleCheck, title: "Importa", text: "Listo. Si lo subes dos veces, los repetidos se omiten solos." },
        ].map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <step.Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm">
              <span className="block font-medium">
                {i + 1}. {step.title}
              </span>
              <span className="text-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">
        Las{" "}
        <a className="text-accent hover:underline" href={`/e/${workspace.id}/categorias`}>
          reglas de categorías
        </a>{" "}
        se aplican automáticamente al importar.
        {workspace.kind === "business" &&
          " Si sincronizas Stripe, no importes los depósitos de Stripe a tu banco: se contarían dos veces."}
      </p>
      <ImportWizard workspaceId={workspace.id} />
    </div>
  );
}
