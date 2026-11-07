import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  AlertTriangle,
  Activity,
  Gauge,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { apiGetDashboard } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { RiskBadge, SectionCard, Skeleton } from "@/components/ui-bits";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Retention" },
      { name: "description", content: "Overview of dropout risk across the student body." },
      { property: "og:title", content: "Dashboard — Retention" },
      { property: "og:description", content: "Overview of dropout risk across the student body." },
    ],
  }),
  component: DashboardPage,
});

const RISK_COLORS = { low: "#2ecc71", medium: "#f39c12", high: "#e74c3c" };

function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: apiGetDashboard,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live overview of dropout risk across enrolled students.
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px]" />
          ))
        ) : (
          <>
            <KpiCard label="Total Students" value={String(data.total)} icon={Users} accent="#1A3C6E" />
            <KpiCard label="High Risk" value={`${data.high} (${data.highPct}%)`} icon={AlertTriangle} accent="#e74c3c" />
            <KpiCard label="Medium Risk" value={`${data.medium} (${data.mediumPct}%)`} icon={Activity} accent="#f39c12" />
            <KpiCard label="Avg Risk Score" value={data.avgScore.toFixed(2)} icon={Gauge} accent="#3498db" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Risk Distribution"
          subtitle="Click a segment to filter students"
          className="lg:col-span-1"
        >
          {isLoading || !data ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <div className="relative h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Low", value: data.low, key: "low" },
                      { name: "Medium", value: data.medium, key: "medium" },
                      { name: "High", value: data.high, key: "high" },
                    ]}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    onClick={(e: { key?: string }) => {
                      const key = e?.key;
                      if (key)
                        navigate({ to: "/students", search: { risk: key } });
                    }}
                    cursor="pointer"
                  >
                    <Cell fill={RISK_COLORS.low} stroke="white" strokeWidth={3} />
                    <Cell fill={RISK_COLORS.medium} stroke="white" strokeWidth={3} />
                    <Cell fill={RISK_COLORS.high} stroke="white" strokeWidth={3} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold text-foreground">{data.total}</div>
                <div className="text-xs text-muted-foreground">Total students</div>
              </div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
            {(["low", "medium", "high"] as const).map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[k] }} />
                <span className="capitalize text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Top SHAP Feature Importance"
          subtitle="Mean |SHAP| across the population"
          className="lg:col-span-2"
        >
          {isLoading || !data ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={[...data.shap].sort((a, b) => a.value - b.value)}
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    width={210}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                    formatter={(v: number) => [v.toFixed(3), "mean |SHAP|"]}
                  />
                  <Bar dataKey="value" fill="#1A3C6E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent High-Risk Alerts"
          subtitle="Click a row to open the student profile"
          className="lg:col-span-2"
        >
          {isLoading || !data ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Student ID</th>
                    <th className="px-4 py-2 text-left font-medium">Risk</th>
                    <th className="px-4 py-2 text-right font-medium">Score</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.recentHighRisk.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                      onClick={() => navigate({ to: "/students/$id", params: { id: s.id } })}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{s.id}</div>
                      </td>
                      <td className="px-4 py-3"><RiskBadge level={s.riskLevel} /></td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {s.riskScore.toFixed(2)}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Model Performance" subtitle="XGBoost evaluation metrics">
          {isLoading || !data ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Accuracy</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {(data.metrics.accuracy * 100).toFixed(1)}%
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#1A3C6E] transition-all"
                    style={{ width: `${data.metrics.accuracy * 100}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <div className="text-xs text-muted-foreground">Model</div>
                <div className="mt-1 text-sm font-semibold text-foreground">XGBoost v1.0</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {data.total} students scored
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
