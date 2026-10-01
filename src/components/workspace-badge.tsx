import { House, Rocket } from "lucide-react";

const STYLE = {
  family: "bg-gradient-to-br from-indigo-500 to-violet-600",
  business: "bg-gradient-to-br from-sky-500 to-teal-500",
};

/** Ícono para distinguir de un vistazo la familia del negocio. */
export function WorkspaceBadge({ kind, size = "md" }: { kind: "family" | "business"; size?: "sm" | "md" | "lg" }) {
  const Icon = kind === "family" ? House : Rocket;
  const box = { sm: "h-7 w-7 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-12 w-12 rounded-2xl" }[size];
  const icon = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" }[size];
  return (
    <span aria-hidden className={`inline-flex ${box} shrink-0 items-center justify-center text-white shadow-sm ${STYLE[kind]}`}>
      <Icon className={icon} />
    </span>
  );
}
