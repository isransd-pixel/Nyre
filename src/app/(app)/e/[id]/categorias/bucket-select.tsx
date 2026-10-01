"use client";

import { useTransition } from "react";
import { setCategoryBucketAction } from "@/app/actions";

export function BucketSelect({
  workspaceId,
  categoryId,
  value,
  name,
}: {
  workspaceId: number;
  categoryId: number;
  value: string | null;
  name: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={`¿Qué tipo de gasto es ${name}?`}
      disabled={pending}
      value={value ?? ""}
      onChange={(e) => start(() => setCategoryBucketAction(workspaceId, categoryId, e.target.value))}
      className={`rounded-md border border-line bg-surface px-2 py-1 text-xs ${value ? "" : "italic text-muted"}`}
    >
      <option value="">Sin clasificar</option>
      <option value="need">Necesidad</option>
      <option value="want">Gusto</option>
      <option value="save">Ahorro y deudas</option>
    </select>
  );
}
