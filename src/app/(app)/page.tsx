import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FlowBar } from "@/components/flow-bar";
import { VerdictBanner } from "@/components/verdict";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { monthVerdict } from "@/lib/insights";
import { Card, PageTitle, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { longMonth, shiftMonth, today } from "@/lib/dates";
import { monthlySummary } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import { getTxsBetween, listWorkspaces } from "@/lib/queries";
import { NewWorkspaceForm } from "./new-workspace-form";

const KIND_LABEL = { family: "Finanzas de la casa", business: "Finanzas del negocio" };

export default async function HomePage() {
  const user = await requireUser();
  const workspaces = listWorkspaces(user.id);
  const month = today().slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const txs = getTxsBetween(
    workspaces.map((w) => w.workspace.id),
    prevMonth,
    month,
  );

  return (
    <>
      <PageTitle>Hola, {user.name.split(" ")[0]}</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-muted">Así va {longMonth(month)}. Entra a un espacio para ver el detalle.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {workspaces.map(({ workspace }) => {
          const [prev, s] = monthlySummary(
            txs.filter((t) => t.workspaceId === workspace.id),
            [prevMonth, month],
          );
          const empty = s.income === 0 && s.expense === 0;
          const verdict = monthVerdict(s.income, s.expense, workspace.currency, workspace.kind);
          return (
            <Link key={workspace.id} href={`/e/${workspace.id}`} className="group">
              <Card className="flex h-full flex-col gap-4 transition group-hover:border-accent">
                <div className="flex items-center gap-3">
                  <WorkspaceBadge kind={workspace.kind} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{workspace.name}</h2>
                    <p className="text-xs text-muted">
                      {KIND_LABEL[workspace.kind]} · {workspace.currency}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-accent" aria-hidden />
                </div>
                {verdict && <VerdictBanner verdict={verdict} />}
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Entró</dt>
                    <dd className="font-medium tabular-nums text-income">
                      {formatMoney(s.income, workspace.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Salió</dt>
                    <dd className="font-medium tabular-nums text-expense">
                      {formatMoney(s.expense, workspace.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Quedó</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(s.net, workspace.currency)}
                    </dd>
                  </div>
                </dl>
                {empty && (prev.income > 0 || prev.expense > 0) ? (
                  <p className="text-sm text-muted">
                    El mes apenas empieza. En {longMonth(prevMonth)} entró{" "}
                    {formatMoney(prev.income, workspace.currency)} y salió{" "}
                    {formatMoney(prev.expense, workspace.currency)}.
                  </p>
                ) : (
                  <FlowBar income={s.income} expense={s.expense} currency={workspace.currency} compact />
                )}
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
