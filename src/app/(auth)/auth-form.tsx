"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, FormError, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { login, register, type AuthState } from "./actions";

export function AuthForm({
  mode,
  invite,
  inviteName,
  next,
}: {
  mode: "login" | "register";
  invite?: string;
  inviteName?: string;
  next?: string;
}) {
  const [state, action] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const suffix = invite ? `?invitacion=${invite}` : "";

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">
        {mode === "login" ? "Hola de nuevo" : "Crea tu cuenta"}
      </h2>
      <p className="mb-6 mt-1 text-sm text-muted">
        {mode === "login" ? "Entra para ver cómo van tus finanzas." : "Es gratis y toma un minuto."}
      </p>
      <Card className="p-6">
        <form action={action} className="flex flex-col gap-4">
          {inviteName && (
            <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
              Te invitaron a <strong>{inviteName}</strong>.
            </p>
          )}
          {mode === "register" && (
            <Label>
              Nombre
              <Input name="name" autoComplete="name" required />
            </Label>
          )}
          <Label>
            Correo
            <Input name="email" type="email" autoComplete="email" required />
          </Label>
          <Label>
            Contraseña
            <Input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </Label>
          {invite && <input type="hidden" name="invite" value={invite} />}
          {next && <input type="hidden" name="next" value={next} />}
          <FormError message={state?.error} />
          <SubmitButton pendingText="Un momento…">
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </SubmitButton>
          <p className="text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <Link className="text-accent hover:underline" href={`/registro${suffix}`}>
                  Regístrate
                </Link>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <Link className="text-accent hover:underline" href={`/login${suffix}`}>
                  Inicia sesión
                </Link>
              </>
            )}
          </p>
        </form>
      </Card>
    </div>
  );
}
