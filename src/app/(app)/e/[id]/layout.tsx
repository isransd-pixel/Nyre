import Link from "next/link";
import { WorkspaceNav } from "@/components/workspace-nav";
import { requireUser, requireWorkspace } from "@/lib/auth";
import { listWorkspaces } from "@/lib/queries";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/e/[id]">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const user = await requireUser();
  const others = listWorkspaces(user.id).filter((w) => w.workspace.id !== workspace.id);

  const links = [
    { href: "", label: "Resumen" },
    { href: "/movimientos", label: "Movimientos" },
    { href: "/importar", label: "Importar CSV" },
    { href: "/categorias", label: "Categorías" },
    ...(workspace.kind === "business" ? [{ href: "/stripe", label: "Stripe" }] : []),
    { href: "/ajustes", label: "Ajustes" },
  ];

  return (
    <>
      <div className="mb-6 border-b border-line">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          {others.map((o) => (
            <Link key={o.workspace.id} href={`/e/${o.workspace.id}`} className="text-sm text-muted hover:text-accent">
              {o.workspace.name} →
            </Link>
          ))}
        </div>
        <WorkspaceNav base={`/e/${workspace.id}`} links={links} />
      </div>
      {children}
    </>
  );
}
