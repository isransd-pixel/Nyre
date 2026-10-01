import { ThumbsUp, TriangleAlert, CircleAlert } from "lucide-react";
import type { Verdict } from "@/lib/insights";

const STYLE = {
  good: { Icon: ThumbsUp, color: "text-income", bg: "bg-income/10" },
  warn: { Icon: TriangleAlert, color: "text-warn", bg: "bg-warn/10" },
  bad: { Icon: CircleAlert, color: "text-expense", bg: "bg-expense/10" },
};

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const { Icon, color, bg } = STYLE[verdict.tone];
  return (
    <div className="flex items-start gap-3">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <div className="text-lg font-semibold">{verdict.title}</div>
        <div className="text-sm text-muted">{verdict.detail}</div>
      </div>
    </div>
  );
}
