"use client";

import { useActionState, useState } from "react";
import { createInviteAction, type ActionState } from "@/app/actions";
import { buttonClass, Input } from "@/components/ui";

export function InviteButton({ workspaceId }: { workspaceId: number }) {
  const [state, action, pending] = useActionState<ActionState>(
    createInviteAction.bind(null, workspaceId),
    undefined,
  );
  const [copied, setCopied] = useState(false);
  const link = state?.message ? `${window.location.origin}${state.message}` : null;

  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <button className={buttonClass.secondary} disabled={pending}>
          {pending ? "Generando…" : "Generar enlace de invitación"}
        </button>
      </form>
      {link && (
        <div className="flex gap-2">
          <Input readOnly value={link} className="flex-1" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className={buttonClass.secondary}
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}
      {link && <p className="text-xs text-muted">El enlace sirve una vez y vence en 7 días.</p>}
    </div>
  );
}
