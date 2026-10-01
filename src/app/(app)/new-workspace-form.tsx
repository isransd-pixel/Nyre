"use client";

import { useActionState } from "react";
import { createWorkspaceAction, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, FormError, Input, Label, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/money";

export function NewWorkspaceForm() {
  const [state, action] = useActionState<ActionState, FormData>(createWorkspaceAction, undefined);
  return (
    <Card>
      <form action={action} className="grid gap-4 sm:grid-cols-3">
        <Label>
          Nombre
          <Input name="name" placeholder="Ej. Ahorro casa" required />
        </Label>
        <Label>
          Tipo
          <Select name="kind" defaultValue="family">
            <option value="family">Familia</option>
            <option value="business">Negocio / SaaS</option>
          </Select>
        </Label>
        <Label>
          Moneda
          <Select name="currency" defaultValue="MXN">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Label>
        <div className="sm:col-span-3 flex items-center gap-3">
          <SubmitButton>Crear espacio</SubmitButton>
          <FormError message={state?.error} />
        </div>
      </form>
    </Card>
  );
}
