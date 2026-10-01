import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { billsToIcs } from "@/lib/bills";
import { formatMoneyWhole } from "@/lib/money";
import { getBills } from "@/lib/queries";

/** Descarga los pagos fijos como calendario (.ics) con aviso un día antes. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/e/[id]/pagos/calendario">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const row = db
    .select({ workspace: schema.workspaces })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(and(eq(schema.memberships.userId, user.id), eq(schema.memberships.workspaceId, Number(id))))
    .get();
  if (!row) return new Response("No encontrado", { status: 404 });

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ics = billsToIcs(
    getBills(row.workspace.id).map((b) => ({
      id: b.id,
      name: b.name,
      amountLabel: formatMoneyWhole(b.amountCents, row.workspace.currency),
      frequency: b.frequency,
      nextDue: b.nextDue,
    })),
    stamp,
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pagos-fijos.ics"',
      "Cache-Control": "no-store",
    },
  });
}
