import Link from "next/link";
import { ArrowRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/sparkline";
import { Card, CardTitle } from "@/components/ui";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { requireUser } from "@/lib/auth";
import { longMonth, shortMonth, today } from "@/lib/dates";
import { monthVerdict } from "@/lib/insights";
import { lastMonths, monthlySummary } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import { getTxsBetween, listWorkspaces } from "@/lib/queries";
import { NewWorkspaceForm } from "./new-workspace-form";

const KIND_LABEL = { family: "Finanzas de la casa", business: "Finanzas del negocio" };
const KIND_GLOW = {
  family: "from-indigo-500/15 via-violet-500/10 to-transparent",
  business: "from-sky-500/15 via-teal-500/10 to-transparent",
};
const VERDICT_DOT = { good: "bg-income", warn: "bg-warn", bad: "bg-expense" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: process.env.APP_TIMEZONE ?? "America/Mexico_City" }).format(new Date()),
  );
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}

export default async function HomePage() {
  const user = await requireUser();
  const workspaces = listWorkspaces(user.id);
  const now = today();
  const month = now.slice(0, 7);
  const months = lastMonths(now, 6);
  const txs = getTxsBetween(
    workspaces.map((w) => w.workspace.id),
    months[0],
    month,
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-glow sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-6 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <p className="relative text-sm text-white/75">
          {greeting()} · <span className="capitalize">{longMonth(month)}</span>
        </p>
        <h1 className="relative mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {user.name.split(" ")[0]}</h1>
        <p className="relative mt-2 max-w-xl text-white/80">
          Aquí tienes cómo van tus espacios este mes. Entra a uno para ver en qué se fue el dinero, tus metas y
          lo que viene.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {workspaces.map(({ workspace }) => {
          const fmt = (c: number) => formatMoney(c, workspace.currency);
          const summary = monthlySummary(
            txs.filter((t) => t.workspaceId === workspace.id),
            months,
          );
          const cur = summary[summary.length - 1];
          const prev = summary[summary.length - 2];
          const empty = cur.income === 0 && cur.expense === 0;
          // Si el mes apenas empieza, se muestra el anterior para que la tarjeta diga algo útil.
          const shown = empty && (prev.income > 0 || prev.expense > 0) ? prev : cur;
          const verdict = monthVerdict(shown.income, shown.expense, workspace.currency, workspace.kind);
          return (
            <Link key={workspace.id} href={`/e/${workspace.id}`} className="group">
              <Card className="relative flex h-full flex-col gap-5 overflow-hidden p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-glow">
                <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${KIND_GLOW[workspace.kind]}`} />
                <div className="relative flex items-center gap-3">
                  <WorkspaceBadge kind={workspace.kind} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{workspace.name}</h2>
                    <p className="text-xs text-muted">
                      {KIND_LABEL[workspace.kind]} · {workspace.currency}
                    </p>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition group-hover:bg-accent group-hover:text-white">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>

                <div className="relative">
                  <div className="text-sm text-muted">
                    {shown === cur ? "Te quedó este mes" : `Te quedó en ${longMonth(shown.month)}`}
                  </div>
                  <div className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(shown.net)}</div>
                  {verdict && (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${VERDICT_DOT[verdict.tone]}`} aria-hidden />
                      <span className="font-medium">{verdict.title}</span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Sparkline
                    id={`spark-ws-${workspace.id}`}
                    values={summary.map((s) => s.net)}
                    label={`Lo que quedó cada mes, de ${shortMonth(months[0])} a ${shortMonth(month)}`}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted">
                    <span>{shortMonth(months[0])}</span>
                    <span>{shortMonth(month)}</span>
                  </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-surface-2 p-3">
                    <div className="flex items-center gap-1.5 text-muted">
                      <TrendingUp className="h-4 w-4 text-income" aria-hidden />
                      Entró
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">{fmt(shown.income)}</div>
                  </div>
                  <div className="rounded-2xl bg-surface-2 p-3">
                    <div className="flex items-center gap-1.5 text-muted">
                      <TrendingDown className="h-4 w-4 text-expense" aria-hidden />
                      Salió
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">{fmt(shown.expense)}</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <section id="nuevo-espacio" className="max-w-2xl scroll-mt-24">
        <Card>
          <CardTitle icon={Plus} hint="Por ejemplo, un espacio aparte para un negocio, para tus papás o para un viaje.">
            {workspaces.length === 0 ? "Crea tu primer espacio" : "Nuevo espacio"}
          </CardTitle>
          <NewWorkspaceForm />
        </Card>
      </section>
    </div>
  );
}
