import { createElement } from "react";
import { Backpack, CalendarClock, Gift, Plane, ShieldCheck, Star } from "lucide-react";
import type { GoalKind } from "@/lib/goals";

export const GOAL_STYLE: Record<GoalKind, { icon: typeof Star; tint: string; ring: string }> = {
  emergency: { icon: ShieldCheck, tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", ring: "#10b981" },
  school: { icon: Backpack, tint: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", ring: "#0ea5e9" },
  holidays: { icon: Gift, tint: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", ring: "#f43f5e" },
  january: { icon: CalendarClock, tint: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", ring: "#f59e0b" },
  vacation: { icon: Plane, tint: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", ring: "#8b5cf6" },
  custom: { icon: Star, tint: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300", ring: "#6366f1" },
};

export function GoalIcon({ kind, size = "md" }: { kind: GoalKind; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "h-7 w-7 rounded-full", md: "h-9 w-9 rounded-xl", lg: "h-11 w-11 rounded-2xl" }[size];
  return (
    <span aria-hidden className={`inline-flex ${box} shrink-0 items-center justify-center ${GOAL_STYLE[kind].tint}`}>
      {createElement(GOAL_STYLE[kind].icon, { className: size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4" })}
    </span>
  );
}
