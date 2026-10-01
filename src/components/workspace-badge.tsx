import { House, Rocket } from "lucide-react";

/** Ícono grande para distinguir de un vistazo la familia del negocio. */
export function WorkspaceBadge({ kind, size = "md" }: { kind: "family" | "business"; size?: "md" | "lg" }) {
  const Icon = kind === "family" ? House : Rocket;
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <span aria-hidden className={`inline-flex ${box} shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent`}>
      <Icon className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  );
}
