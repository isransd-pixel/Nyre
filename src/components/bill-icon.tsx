import { createElement } from "react";
import { CreditCard, Landmark, Receipt, Repeat, School, Zap } from "lucide-react";
import type { BillKind } from "@/lib/bills";

const STYLE: Record<BillKind, { icon: typeof Zap; tint: string }> = {
  service: { icon: Zap, tint: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  subscription: { icon: Repeat, tint: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300" },
  card: { icon: CreditCard, tint: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  loan: { icon: Landmark, tint: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
  school: { icon: School, tint: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  other: { icon: Receipt, tint: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
};

export function BillIcon({ kind }: { kind: BillKind }) {
  return (
    <span aria-hidden className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${STYLE[kind].tint}`}>
      {createElement(STYLE[kind].icon, { className: "h-[18px] w-[18px]" })}
    </span>
  );
}
