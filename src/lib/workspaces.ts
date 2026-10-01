import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_CATEGORIES } from "./categories";

export function createWorkspace(
  userId: number,
  input: { name: string; kind: "family" | "business"; currency: string },
): number {
  return db.transaction((tx) => {
    const ws = tx.insert(schema.workspaces).values(input).returning().get();
    tx.insert(schema.memberships).values({ userId, workspaceId: ws.id, role: "owner" }).run();
    const defaults = DEFAULT_CATEGORIES[input.kind];
    tx.insert(schema.categories)
      .values([
        ...defaults.income.map((name) => ({ workspaceId: ws.id, name, type: "income" as const })),
        ...defaults.expense.map((name) => ({ workspaceId: ws.id, name, type: "expense" as const })),
      ])
      .run();
    return ws.id;
  });
}

export function findValidInvite(token: string) {
  return db
    .select({ token: schema.invites.token, workspace: schema.workspaces })
    .from(schema.invites)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invites.workspaceId))
    .where(and(eq(schema.invites.token, token), gt(schema.invites.expiresAt, new Date())))
    .get();
}

/** Une al usuario al espacio de la invitación y la consume. Devuelve el id del espacio. */
export function acceptInvite(token: string, userId: number): number | null {
  const invite = findValidInvite(token);
  if (!invite) return null;
  db.transaction((tx) => {
    tx.insert(schema.memberships)
      .values({ userId, workspaceId: invite.workspace.id, role: "member" })
      .onConflictDoNothing()
      .run();
    tx.delete(schema.invites).where(eq(schema.invites.token, token)).run();
  });
  return invite.workspace.id;
}
