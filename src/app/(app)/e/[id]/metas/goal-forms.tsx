"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addGoalEntryAction, createGoalAction, type ActionState } from "@/app/actions";
import { GoalIcon } from "@/components/goal-icon";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, FormError, Input, Label } from "@/components/ui";
import type { GoalKind } from "@/lib/goals";

function EntryButtons() {
  const { pending } = useFormStatus();
  return (
    <>
      <button name="direction" value="in" disabled={pending} className={buttonClass.primary}>
        Apartar
      </button>
      <button name="direction" value="out" disabled={pending} className={buttonClass.secondary}>
        Sacar
      </button>
    </>
  );
}

export function GoalEntryForm({ workspaceId, goalId, name }: { workspaceId: number; goalId: number; name: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    addGoalEntryAction.bind(null, workspaceId, goalId),
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input name="amount" inputMode="decimal" placeholder="Monto" aria-label={`Monto para ${name}`} className="min-w-0 flex-1" required />
        <EntryButtons />
      </div>
      <FormError message={state?.error} />
      {state?.message && <p className="text-xs text-muted">{state.message}</p>}
    </form>
  );
}

export type Template = {
  kind: GoalKind;
  name: string;
  hint: string;
  defaultDate: string;
  defaultTarget: string;
};

export function NewGoalForm({ workspaceId, templates }: { workspaceId: number; templates: Template[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createGoalAction.bind(null, workspaceId), undefined);
  const [picked, setKind] = useState<GoalKind>(templates[0].kind);
  // Al crear el fondo de emergencia su plantilla desaparece: volver a la primera disponible.
  const t = templates.find((x) => x.kind === picked) ?? templates[0];
  const kind = t.kind;

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">1. ¿Para qué es?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map((tpl) => (
            <button
              key={tpl.kind}
              type="button"
              aria-pressed={kind === tpl.kind}
              onClick={() => setKind(tpl.kind)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                kind === tpl.kind
                  ? "border-accent bg-accent-soft font-semibold ring-4 ring-accent/10"
                  : "border-line bg-surface hover:border-accent/50"
              }`}
            >
              <GoalIcon kind={tpl.kind} />
              {tpl.name || "Otra cosa"}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{t.hint}</p>
      </fieldset>
      <input type="hidden" name="kind" value={kind} />
      {/* key: al cambiar de plantilla se reinician los valores sugeridos */}
      <div key={kind} className="grid gap-3 sm:grid-cols-3">
        <Label>
          2. Nombre
          <Input name="name" defaultValue={t.name} placeholder="Ej. Enganche del coche" required />
        </Label>
        <Label>
          3. ¿Cuánto quieren juntar?
          <Input name="target" inputMode="decimal" defaultValue={t.defaultTarget} placeholder="0.00" required />
        </Label>
        <Label>
          4. ¿Para cuándo? (opcional)
          <Input name="targetDate" type="date" defaultValue={t.defaultDate} />
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>Crear meta</SubmitButton>
        <FormError message={state?.error} />
        {state?.message && <span className="text-sm text-muted">{state.message}</span>}
      </div>
    </form>
  );
}
