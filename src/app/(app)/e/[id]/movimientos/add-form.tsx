"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTransactionAction, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, FormError, Input, Label, Select } from "@/components/ui";
import type { Category } from "@/db/schema";

export function AddTransactionForm({
  workspaceId,
  categories,
  defaultDate,
}: {
  workspaceId: number;
  categories: Category[];
  defaultDate: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addTransactionAction.bind(null, workspaceId),
    undefined,
  );
  const [type, setType] = useState<"income" | "expense">("expense");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.message) return;
    // Conserva fecha y tipo para capturar varios movimientos seguidos.
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("description") as HTMLInputElement).value = "";
    (form.elements.namedItem("amount") as HTMLInputElement).value = "";
    (form.elements.namedItem("description") as HTMLInputElement).focus();
  }, [state]);

  return (
    <Card>
      <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <Label>
          Tipo
          <Select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>
        </Label>
        <Label>
          Fecha
          <Input name="date" type="date" defaultValue={defaultDate} required />
        </Label>
        <Label className="lg:col-span-2">
          Descripción
          <Input name="description" placeholder="Ej. Súper semanal" required />
        </Label>
        <Label>
          Monto
          <Input name="amount" inputMode="decimal" placeholder="0.00" required />
        </Label>
        <Label>
          Categoría
          <Select name="categoryId" key={type} defaultValue="">
            <option value="">Sin categoría</option>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </Label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          <SubmitButton>Agregar movimiento</SubmitButton>
          <FormError message={state?.error} />
          {state?.message && <span className="text-sm text-muted">{state.message}</span>}
        </div>
      </form>
    </Card>
  );
}
