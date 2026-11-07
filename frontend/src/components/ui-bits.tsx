import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/risk";
import { riskHex, riskLabel } from "@/lib/risk";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const color = riskHex(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${color} 16%, white)`,
        color: `color-mix(in srgb, ${color} 70%, black)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, white)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {riskLabel(level)}
    </span>
  );
}

export function RiskBar({ score, animate = true }: { score: number; animate?: boolean }) {
  const pct = Math.min(100, Math.max(0, score * 100));
  const level = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  const color = riskHex(level);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", animate && "transition-all duration-700")}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && (
        <div className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  );
}
