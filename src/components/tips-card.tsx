import Link from "next/link";
import { CircleAlert, Lightbulb, ThumbsUp, TriangleAlert } from "lucide-react";
import type { Tip } from "@/lib/tips";
import { Card } from "./ui";

const TONE = {
  bad: { Icon: CircleAlert, color: "text-expense", bg: "bg-expense/10" },
  warn: { Icon: TriangleAlert, color: "text-warn", bg: "bg-warn/10" },
  info: { Icon: Lightbulb, color: "text-accent", bg: "bg-accent/10" },
  good: { Icon: ThumbsUp, color: "text-income", bg: "bg-income/10" },
};

export function TipsCard({ tips, base, limit = 4, title = "Para tu atención" }: { tips: Tip[]; base: string; limit?: number; title?: string }) {
  if (tips.length === 0) return null;
  const shown = tips.slice(0, limit);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {shown.map((t) => {
          const { Icon, color, bg } = TONE[t.tone];
          return (
            <li key={t.id} className="flex items-start gap-3">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-medium">{t.title}</div>
                <div className="text-muted">{t.detail}</div>
              </div>
              {t.href && t.cta && (
                <Link href={`${base}/${t.href}`} className="shrink-0 text-sm text-accent hover:underline print:hidden">
                  {t.cta} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {tips.length > limit && (
        <Link href={`${base}/junta`} className="text-sm text-accent hover:underline">
          Ver {tips.length - limit} más en la junta familiar →
        </Link>
      )}
    </Card>
  );
}
