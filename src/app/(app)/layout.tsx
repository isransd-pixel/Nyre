import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { listWorkspaces } from "@/lib/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const workspaces = listWorkspaces(user.id).map(({ workspace }) => ({
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
  }));
  return (
    <AppShell user={{ name: user.name, email: user.email }} workspaces={workspaces}>
      {children}
    </AppShell>
  );
}
