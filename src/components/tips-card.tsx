import Link from "next/link";
import { ChevronRight, CircleAlert, Lightbulb, Sparkles, ThumbsUp, TriangleAlert } from "lucide-react";
import type { Tip } from "@/lib/tips";
import { Card, CardTitle } from "./ui";

const TONE = {
  bad: { Icon: CircleAlert, tile: "bg-expense/10 text-expense", ring: "ring-expense/20" },
  warn: { Icon: TriangleAlert, tile: "bg-warn/10 text-warn", ring: "ring-warn/20" },
  info: { Icon: Lightbulb, tile: "bg-accent-soft text-accent", ring: "ring-line" },
  good: { Icon: ThumbsUp, tile: "bg-income/10 text-income", ring: "ring-income/20" },
};

export function TipsCard({ tips, base, limit = 4, title = "Para tu atención" }: { tips: Tip[]; base: string; limit?: number; title?: string }) {
  if (tips.length === 0) return null;
  const shown = tips.slice(0, limit);
  return (
    <Card>
      <CardTitle icon={Sparkles}>{title}</CardTitle>
      <ul className="flex flex-col gap-2.5">
        {shown.map((t) => {
          const { Icon, tile, ring } = TONE[t.tone];
          const body = (
            <>
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{t.title}</div>
                <div className="text-muted">{t.detail}</div>
                {t.cta && <div className="mt-1 text-xs font-medium text-accent print:hidden">{t.cta} →</div>}
              </div>
            </>
          );
          const cls = `flex items-start gap-3 rounded-2xl bg-surface-2 p-3 ring-1 ${ring}`;
          return (
            <li key={t.id}>
              {t.href ? (
                <Link href={`${base}/${t.href}`} className={`${cls} transition hover:ring-accent/40`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {tips.length > limit && (
        <Link href={`${base}/junta`} className="mt-3 inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:underline">
          {tips.length - limit} más en la junta familiar <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </Card>
  );
}
