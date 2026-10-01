import Link from "next/link";
import { Card, PageTitle, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { longMonth, today } from "@/lib/dates";
import { monthlySummary } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import { getTxsBetween, listWorkspaces } from "@/lib/queries";
import { NewWorkspaceForm } from "./new-workspace-form";

const KIND_LABEL = { family: "Familia", business: "Negocio" };

export default async function HomePage() {
  const user = await requireUser();
  const workspaces = listWorkspaces(user.id);
  const month = today().slice(0, 7);
  const txs = getTxsBetween(
    workspaces.map((w) => w.workspace.id),
    month,
    month,
  );

  return (
    <>
      <PageTitle>Hola, {user.name.split(" ")[0]}</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-muted">Así va {longMonth(month)}.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {workspaces.map(({ workspace }) => {
          const [s] = monthlySummary(
            txs.filter((t) => t.workspaceId === workspace.id),
            [month],
          );
          return (
            <Link key={workspace.id} href={`/e/${workspace.id}`} className="group">
              <Card className="h-full transition group-hover:border-accent">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{workspace.name}</h2>
                  <span className="rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
                    {KIND_LABEL[workspace.kind]} · {workspace.currency}
                  </span>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Ingresos</dt>
                    <dd className="font-medium tabular-nums text-income">
                      {formatMoney(s.income, workspace.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Gastos</dt>
                    <dd className="font-medium tabular-nums text-expense">
                      {formatMoney(s.expense, workspace.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Balance</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(s.net, workspace.currency)}
                    </dd>
                  </div>
                </dl>
              </Card>
            </Link>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <Stat label="Aún no tienes espacios" value="Crea el primero abajo" />
      )}

      <section className="mt-10 max-w-xl">
        <h2 className="mb-3 font-semibold">Nuevo espacio</h2>
        <NewWorkspaceForm />
      </section>
    </>
  );
}
