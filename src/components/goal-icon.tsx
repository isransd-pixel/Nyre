import { createElement } from "react";
import { Backpack, CalendarClock, Gift, Plane, ShieldCheck, Star } from "lucide-react";
import type { GoalKind } from "@/lib/goals";

const ICONS = {
  emergency: ShieldCheck,
  school: Backpack,
  holidays: Gift,
  january: CalendarClock,
  vacation: Plane,
  custom: Star,
};

export function GoalIcon({ kind, size = "md" }: { kind: GoalKind; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <span aria-hidden className={`inline-flex ${box} shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent`}>
      {createElement(ICONS[kind], { className: size === "lg" ? "h-5 w-5" : "h-4 w-4" })}
    </span>
  );
}
