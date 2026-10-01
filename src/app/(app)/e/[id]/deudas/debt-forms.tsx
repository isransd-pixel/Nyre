"use client";

import { useActionState } from "react";
import { createDebtAction, payDebtAction, updateDebtAction, type ActionState } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { FormError, Input, Label, Select } from "@/components/ui";

export function PayDebtForm({ workspaceId, debtId, suggested }: { workspaceId: number; debtId: number; suggested: string }) {
  return (
    <ActionForm action={payDebtAction.bind(null, workspaceId, debtId)} className="flex flex-wrap items-end gap-2 text-sm">
      <Label>
        Abono
        <Input name="amount" inputMode="decimal" defaultValue={suggested} className="w-32" required />
      </Label>
      <SubmitButton pendingText="…">Abonar</SubmitButton>
      <label className="flex basis-full items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="record" defaultChecked />
        Anotarlo como gasto (desmárcalo si ya viene en el CSV del banco)
      </label>
    </ActionForm>
  );
}

export function UpdateBalanceForm({ workspaceId, debtId }: { workspaceId: number; debtId: number }) {
  return (
    <ActionForm action={updateDebtAction.bind(null, workspaceId, debtId)} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
      <Label>
        Saldo del último estado de cuenta
        <Input name="balance" inputMode="decimal" className="w-40" required />
      </Label>
      <SubmitButton variant="secondary" pendingText="…">
        Actualizar
      </SubmitButton>
    </ActionForm>
  );
}

export function NewDebtForm({ workspaceId }: { workspaceId: number }) {
  const [state, action] = useActionState<ActionState, FormData>(createDebtAction.bind(null, workspaceId), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <Label className="lg:col-span-2">
        Nombre
        <Input name="name" placeholder="Ej. Tarjeta Banamex" required />
      </Label>
      <Label>
        Tipo
        <Select name="kind" defaultValue="card">
          <option value="card">Tarjeta de crédito</option>
          <option value="loan">Préstamo / crédito</option>
          <option value="other">Otra (familiar, tienda…)</option>
        </Select>
      </Label>
      <Label>
        ¿Cuánto debes hoy?
        <Input name="balance" inputMode="decimal" placeholder="0.00" required />
      </Label>
      <Label>
        Pago mínimo al mes
        <Input name="minPayment" inputMode="decimal" placeholder="0.00" required />
      </Label>
      <Label>
        Tasa de interés anual (%)
        <Input name="rate" inputMode="decimal" placeholder="Ej. 45" required />
      </Label>
      <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">
        La tasa y el pago mínimo vienen en tu estado de cuenta. Si es un préstamo sin intereses (por
        ejemplo, de un familiar), pon 0.
      </p>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
        <SubmitButton>Agregar deuda</SubmitButton>
        <FormError message={state?.error} />
        {state?.message && <span className="text-sm text-muted">{state.message}</span>}
      </div>
    </form>
  );
}
