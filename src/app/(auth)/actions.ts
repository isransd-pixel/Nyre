"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, deleteSession } from "@/lib/session";
import { acceptInvite, createWorkspace } from "@/lib/workspaces";

export type AuthState = { error?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre."),
  email: z.email("Correo inválido.").trim().toLowerCase(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  invite: z.string().optional(),
});

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, invite } = parsed.data;

  const exists = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (exists) return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  const user = db
    .insert(schema.users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
    .returning()
    .get();

  let target: number | null = invite ? acceptInvite(invite, user.id) : null;
  if (target === null) {
    // Sin invitación: se crean los dos espacios con los que empieza todo el mundo.
    target = createWorkspace(user.id, { name: "Familia", kind: "family", currency: "MXN" });
    createWorkspace(user.id, { name: "Mi SaaS", kind: "business", currency: "MXN" });
  }

  await createSession(user.id);
  redirect(invite ? `/e/${target}` : "/");
}

// Hash de relleno para que el tiempo de respuesta no revele si el correo existe.
let dummyHash: string | undefined;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash("nyre-dummy", 12));

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return { error: "Correo o contraseña incorrectos." };

  await createSession(user.id);
  // Solo rutas internas, para no permitir redirecciones abiertas.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
