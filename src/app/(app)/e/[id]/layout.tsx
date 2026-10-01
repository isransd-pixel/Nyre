import Link from "next/link";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { WorkspaceNav, WorkspaceTools, type NavLink } from "@/components/workspace-nav";
import { requireUser, requireWorkspace } from "@/lib/auth";
import { listWorkspaces } from "@/lib/queries";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/e/[id]">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const user = await requireUser();
  const others = listWorkspaces(user.id).filter((w) => w.workspace.id !== workspace.id);

  const isFamily = workspace.kind === "family";
  const links: NavLink[] = [
    { href: "", label: "Resumen" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/presupuesto", label: "Presupuesto" },
    { href: "/metas", label: "Metas" },
    { href: "/pagos", label: "Pagos fijos" },
    { href: "/deudas", label: "Deudas" },
    ...(isFamily ? [{ href: "/junta", label: "Junta familiar" }] : []),
  ];
  const tools: NavLink[] = [
    { href: "/importar", label: "Importar CSV" },
    { href: "/categorias", label: "Categorías" },
    ...(isFamily ? [] : [{ href: "/stripe", label: "Stripe" }]),
    { href: "/ajustes", label: "Ajustes" },
  ];

  return (
    <>
      <div className="mb-6 border-b border-line print:hidden">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <WorkspaceBadge kind={workspace.kind} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
            <p className="text-sm text-muted">
              {workspace.kind === "family" ? "Finanzas de la casa" : "Finanzas del negocio"} · {workspace.currency}
            </p>
          </div>
          <span className="flex-1" />
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {others.map((o) => (
              <Link key={o.workspace.id} href={`/e/${o.workspace.id}`} className="text-sm text-muted hover:text-accent">
                Ir a {o.workspace.name} →
              </Link>
            ))}
            <WorkspaceTools base={`/e/${workspace.id}`} links={tools} />
          </div>
        </div>
        <WorkspaceNav base={`/e/${workspace.id}`} links={links} />
      </div>
      {children}
    </>
  );
}
