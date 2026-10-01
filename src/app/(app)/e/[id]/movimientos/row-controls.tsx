"use client";

import { useTransition } from "react";
import { deleteTransactionAction, setTransactionCategoryAction } from "@/app/actions";
import type { Category } from "@/db/schema";

export function CategorySelect({
  workspaceId,
  transactionId,
  value,
  options,
}: {
  workspaceId: number;
  transactionId: number;
  value: number | null;
  options: Category[];
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Categoría"
      disabled={pending}
      value={value ?? ""}
      onChange={(e) => {
        const next = e.target.value ? Number(e.target.value) : null;
        start(() => setTransactionCategoryAction(workspaceId, transactionId, next));
      }}
      className={`w-full max-w-48 rounded-md border border-transparent bg-transparent px-1 py-1 hover:border-line ${
        value === null ? "text-muted italic" : ""
      }`}
    >
      <option value="">Sin categoría</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function DeleteTransaction({ workspaceId, transactionId }: { workspaceId: number; transactionId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Eliminar movimiento"
      title="Eliminar"
      className="rounded px-2 py-1 text-muted hover:bg-expense/10 hover:text-expense disabled:opacity-40"
      onClick={() => {
        if (window.confirm("¿Eliminar este movimiento?")) {
          start(() => deleteTransactionAction(workspaceId, transactionId));
        }
      }}
    >
      ✕
    </button>
  );
}
