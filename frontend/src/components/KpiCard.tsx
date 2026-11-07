import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "up",
  accent = "#1A3C6E",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down";
  accent?: string;
}) {
  const up = trendDirection === "up";
  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent 60%)` }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {trend && (
            <div
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: up ? "#2ecc71" : "#e74c3c" }}
            >
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {trend}
            </div>
          )}
        </div>
        <div
          className="grid h-10 w-10 place-items-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
