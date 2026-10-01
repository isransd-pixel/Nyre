import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { requireWorkspace } from "@/lib/auth";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/e/[id]">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const base = `/e/${workspace.id}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <WorkspaceBadge kind={workspace.kind} size="lg" />
        <div className="min-w-[10rem] flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="text-sm text-muted">
            {workspace.kind === "family" ? "Finanzas de la casa" : "Finanzas del negocio"} · {workspace.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="hidden sm:block">
            <Link href={`${base}/importar`} className={buttonClass.secondary}>
              <Upload className="h-4 w-4" aria-hidden />
              Importar
            </Link>
          </span>
          <Link href={`${base}/movimientos`} className={buttonClass.primary}>
            <Plus className="h-4 w-4" aria-hidden />
            Anotar
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
