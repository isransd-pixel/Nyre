import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySession } from "./session-token";

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const userId = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (userId === null) return null;
  const user = db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  return user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Devuelve el espacio solo si el usuario actual es miembro; si no, 404. */
export const requireWorkspace = cache(async (workspaceId: number) => {
  const user = await requireUser();
  if (!Number.isInteger(workspaceId)) notFound();
  const row = db
    .select({ workspace: schema.workspaces, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(
      and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.workspaceId, workspaceId),
      ),
    )
    .get();
  if (!row) notFound();
  return { user, workspace: row.workspace, role: row.role };
});
