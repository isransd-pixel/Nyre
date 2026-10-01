"use client";

import { useActionState } from "react";
import { createBillAction, payBillAction, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormError, Input, Label, Select } from "@/components/ui";
import type { Category } from "@/db/schema";
import { BILL_KINDS, FREQUENCIES } from "@/lib/bills";

export function PayBillForm({
  workspaceId,
  billId,
  amount,
}: {
  workspaceId: number;
  billId: number;
  amount: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    payBillAction.bind(null, workspaceId, billId),
    undefined,
  );
  return (
    <form action={action} className="mt-3 flex flex-col gap-2 rounded-lg bg-bg p-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <Label>
          ¿Cuánto pagaste?
          <Input name="amount" inputMode="decimal" defaultValue={amount} className="w-32" required />
        </Label>
        <SubmitButton pendingText="Guardando…">Listo, ya pagué</SubmitButton>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="record" defaultChecked />
        Anotarlo como gasto de hoy
      </label>
      <p className="text-xs text-muted">
        Desmárcalo si este pago ya te llega en el CSV del banco, para no contarlo dos veces.
      </p>
      <FormError message={state?.error} />
    </form>
  );
}

export function NewBillForm({
  workspaceId,
  categories,
  defaultDate,
}: {
  workspaceId: number;
  categories: Category[];
  defaultDate: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createBillAction.bind(null, workspaceId), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Label>
        ¿Qué pago es?
        <Input name="name" placeholder="Ej. Luz, Internet, Colegiatura" required />
      </Label>
      <Label>
        Tipo
        <Select name="kind" defaultValue="service">
          {Object.entries(BILL_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        ¿Cuánto es? (aproximado)
        <Input name="amount" inputMode="decimal" placeholder="0.00" required />
      </Label>
      <Label>
        ¿Cada cuándo?
        <Select name="frequency" defaultValue="monthly">
          {Object.entries(FREQUENCIES).map(([value, f]) => (
            <option key={value} value={value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        Próxima fecha límite
        <Input name="nextDue" type="date" defaultValue={defaultDate} required />
      </Label>
      <Label>
        Categoría
        <Select name="categoryId" defaultValue="">
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Label>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <SubmitButton>Agregar pago fijo</SubmitButton>
        <FormError message={state?.error} />
        {state?.message && <span className="text-sm text-muted">{state.message}</span>}
      </div>
    </form>
  );
}

/** Botón de un clic para agregar un cargo que detectamos que se repite. */
export function AddDetectedBill({
  workspaceId,
  values,
}: {
  workspaceId: number;
  values: Record<string, string>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createBillAction.bind(null, workspaceId), undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant="secondary" pendingText="…">
        Agregar
      </SubmitButton>
      <FormError message={state?.error} />
    </form>
  );
}
