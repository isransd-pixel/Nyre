import { createElement } from "react";
import { CreditCard, Landmark, Receipt, Repeat, School, Zap } from "lucide-react";
import type { BillKind } from "@/lib/bills";

const ICONS = { service: Zap, subscription: Repeat, card: CreditCard, loan: Landmark, school: School, other: Receipt };

export function BillIcon({ kind }: { kind: BillKind }) {
  return (
    <span aria-hidden className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-muted">
      {createElement(ICONS[kind], { className: "h-4 w-4" })}
    </span>
  );
}
