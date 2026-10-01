"use client";

import { Minus, Plus } from "lucide-react";
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
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-1.5">¿Entró o salió dinero?</legend>
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
            {(
              [
                { value: "expense", label: "Gasto", Icon: Minus, active: "bg-expense/10 text-expense" },
                { value: "income", label: "Ingreso", Icon: Plus, active: "bg-income/10 text-income" },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={type === o.value}
                onClick={() => setType(o.value)}
                className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 font-medium ${
                  type === o.value ? o.active : "text-muted hover:bg-bg"
                }`}
              >
                <o.Icon className="h-4 w-4" aria-hidden />
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        <Label>
          Fecha
          <Input name="date" type="date" defaultValue={defaultDate} required />
        </Label>
        <Label className="lg:col-span-2">
          Descripción
          <Input name="description" placeholder={type === "expense" ? "Ej. Súper de la semana" : "Ej. Pago de cliente"} required />
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
          <SubmitButton>{type === "expense" ? "Anotar gasto" : "Anotar ingreso"}</SubmitButton>
          <FormError message={state?.error} />
          {state?.message && <span className="text-sm text-muted">{state.message}</span>}
        </div>
      </form>
    </Card>
  );
}
