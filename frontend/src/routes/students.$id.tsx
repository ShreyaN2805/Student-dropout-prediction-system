import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

import { apiGetStudent } from "@/lib/api";
import { riskHex, riskLabel, type RiskLevel } from "@/lib/risk";
import { RiskBadge, SectionCard, Skeleton } from "@/components/ui-bits";

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Student ${params.id} — Retention` },
      { name: "description", content: `Profile and risk explanation for student ${params.id}.` },
      { property: "og:title", content: `Student ${params.id} — Retention` },
      { property: "og:description", content: "Detailed dropout risk explanation and counseling recommendations." },
    ],
  }),
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const d = await apiGetStudent(id);
      if (!d) throw notFound();
      return d;
    },
  });

  const [pickedPoint, setPickedPoint] = useState<{ month: string; score: number } | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      </div>
    );
  }

  const { student, shap, trajectory, recommendation } = data;
  const color = riskHex(student.riskLevel);
  const RecIcon =
    student.riskLevel === "high" ? AlertTriangle : student.riskLevel === "medium" ? Info : CheckCircle2;

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile */}
        <SectionCard className="lg:col-span-1">
          <div className="flex items-start gap-4">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-semibold"
              style={{
                background: `color-mix(in srgb, ${color} 18%, white)`,
                color: `color-mix(in srgb, ${color} 70%, black)`,
                border: `2px solid ${color}`,
              }}
            >
              {student.id.slice(-4)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-foreground">{student.id}</div>
              <div className="text-sm text-muted-foreground">{student.course}</div>
              <div className="mt-2"><RiskBadge level={student.riskLevel} /></div>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Course" value={student.course} />
            <Field label="Age" value={String(student.age)} />
            <Field label="Gender" value={student.gender} />
            <Field label="Scholarship" value={student.scholarship ? "Yes" : "No"} />
            <Field label="Tuition" value={student.tuitionUpToDate ? "Paid" : "Overdue"} />
            <Field label="Sem 1 Approved" value={String(student.sem1Approved)} />
            <Field label="Sem 2 Approved" value={String(student.sem2Approved)} />
          </dl>
        </SectionCard>

        {/* Risk indicator */}
        <SectionCard className="lg:col-span-1" title="Risk Indicator">
          <div className="flex flex-col items-center gap-4 py-2">
            <CircularGauge score={student.riskScore} color={color} />
            <div className="text-center">
              <div className="text-3xl font-semibold tabular-nums text-foreground">
                {student.riskScore.toFixed(2)}
              </div>
              <div className="mt-1">
                <RiskBadge level={student.riskLevel} />
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${student.riskScore * 100}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Recommendation */}
        <SectionCard className="lg:col-span-1" title="Counseling Recommendation">
          <div
            className="rounded-lg p-4"
            style={{
              borderLeft: `4px solid ${color}`,
              background: `color-mix(in srgb, ${color} 6%, white)`,
            }}
          >
            <div className="flex items-center gap-2">
              <RecIcon className="h-5 w-5" style={{ color }} />
              <div className="text-sm font-semibold text-foreground">
                {riskLabel(student.riskLevel)} Risk Plan
              </div>
            </div>
            {shap[0] && (
              <div className="mt-2 text-xs text-muted-foreground">
                Primary driver: <span className="font-medium text-foreground">{shap[0].feature}</span>
              </div>
            )}

            {recommendation ? (
              <div className="mt-4 space-y-2">
                {recommendation.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-foreground">{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No recommendation available yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* SHAP waterfall */}
      {shap.length > 0 && (
        <SectionCard title="SHAP Explanation" subtitle="Red = pushes risk up · Blue = pushes risk down">
          <div className="h-[320px]">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={shap} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="feature" width={220} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { feature: string; featureValue: string; shap: number };
                    const direction = d.shap > 0 ? "increases" : "decreases";
                    return (
                      <div className="rounded-lg border bg-card p-3 text-xs shadow-md">
                        <div className="font-semibold text-foreground">{d.feature}</div>
                        <div className="mt-1 text-muted-foreground">Value: {d.featureValue}</div>
                        <div className="text-muted-foreground">SHAP: {d.shap.toFixed(3)}</div>
                        <div className="mt-1" style={{ color: d.shap > 0 ? "#e74c3c" : "#3498db" }}>
                          {direction} dropout risk
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                  {shap.map((d, i) => (
                    <Cell key={i} fill={d.shap > 0 ? "#e74c3c" : "#3498db"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Trajectory */}
      {trajectory.length > 1 ? (
        <SectionCard title="Risk Trajectory" subtitle="Click a point to inspect score at that prediction">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart
                data={trajectory}
                onClick={(e: { activePayload?: Array<{ payload: { month: string; score: number } }> }) => {
                  const p = e?.activePayload?.[0]?.payload;
                  if (p) setPickedPoint(p);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                <ReferenceArea y1={0} y2={0.4} fill="#2ecc71" fillOpacity={0.06} />
                <ReferenceArea y1={0.4} y2={0.7} fill="#f39c12" fillOpacity={0.08} />
                <ReferenceArea y1={0.7} y2={1} fill="#e74c3c" fillOpacity={0.08} />
                <ReferenceLine y={0.4} stroke="#f39c12" strokeDasharray="4 4" />
                <ReferenceLine y={0.7} stroke="#e74c3c" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1A3C6E"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#1A3C6E", cursor: "pointer" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {pickedPoint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm"
            >
              <div className="font-medium text-foreground">
                {pickedPoint.month} · score {pickedPoint.score.toFixed(2)}
              </div>
              {shap.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Top contributors: {shap.slice(0, 3).map((s) => s.feature).join(" · ")}
                </div>
              )}
            </motion.div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Risk Trajectory">
          <div className="py-8 text-center text-sm text-muted-foreground">
            Only one prediction recorded. Run additional predictions to see the trajectory over time.
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CircularGauge({ score, color }: { score: number; color: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score);
  return (
    <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
      <circle cx={70} cy={70} r={r} stroke="var(--muted)" strokeWidth={10} fill="none" />
      <motion.circle
        cx={70}
        cy={70}
        r={r}
        stroke={color}
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}
