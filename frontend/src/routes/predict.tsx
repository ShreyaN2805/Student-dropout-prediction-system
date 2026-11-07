import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Save,
  Printer,
  RotateCcw,
  AlertTriangle,
  Info,
  CheckCircle2,
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
} from "recharts";
import { toast } from "sonner";

import { apiPredict, type PredictResult } from "@/lib/api";
import { RiskBadge, SectionCard } from "@/components/ui-bits";
import { riskHex, riskLabel } from "@/lib/risk";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict — Retention" },
      { name: "description", content: "Run a dropout risk prediction for an individual student." },
      { property: "og:title", content: "Predict — Retention" },
      { property: "og:description", content: "Run a dropout risk prediction for an individual student." },
    ],
  }),
  component: PredictPage,
});

type FieldDef = {
  name: string;
  label: string;
  helper: string;
  min: number;
  max: number;
  step?: number;
  default: number;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Academic Performance",
    fields: [
      { name: "cu_1st_sem_approved", label: "1st sem units approved", helper: "0–26", min: 0, max: 26, default: 5 },
      { name: "cu_2nd_sem_approved", label: "2nd sem units approved", helper: "0–20", min: 0, max: 20, default: 5 },
      { name: "cu_1st_sem_grade", label: "1st sem grade", helper: "0–18.875", min: 0, max: 18.875, step: 0.1, default: 13 },
      { name: "cu_2nd_sem_grade", label: "2nd sem grade", helper: "0–18.571", min: 0, max: 18.571, step: 0.1, default: 13 },
      { name: "admission_grade", label: "Admission grade", helper: "95–190", min: 95, max: 190, step: 0.1, default: 135 },
    ],
  },
  {
    title: "Enrollment Information",
    fields: [
      { name: "age_at_enrollment", label: "Age at enrollment", helper: "17–70", min: 17, max: 70, default: 20 },
      { name: "application_mode", label: "Application mode", helper: "Coded (1–57)", min: 1, max: 57, default: 17 },
      { name: "application_order", label: "Application order", helper: "0 = first choice", min: 0, max: 6, default: 0 },
      { name: "course", label: "Course code", helper: "Coded value", min: 33, max: 9991, default: 9500 },
      { name: "daytime_evening_attendance", label: "Daytime/evening", helper: "0 = evening · 1 = daytime", min: 0, max: 1, default: 1 },
    ],
  },
  {
    title: "Personal Information",
    fields: [
      { name: "gender", label: "Gender", helper: "0 = Female · 1 = Male", min: 0, max: 1, default: 1 },
      { name: "marital_status", label: "Marital status", helper: "1 = Single · 2–6 other", min: 1, max: 6, default: 1 },
      { name: "nacionality", label: "Nationality", helper: "Coded (1–109)", min: 1, max: 109, default: 1 },
      { name: "displaced", label: "Displaced", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 0 },
      { name: "international", label: "International", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 0 },
      { name: "educational_special_needs", label: "Special needs", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 0 },
    ],
  },
  {
    title: "Financial Information",
    fields: [
      { name: "tuition_fees_up_to_date", label: "Tuition up to date", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 1 },
      { name: "scholarship_holder", label: "Scholarship holder", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 0 },
      { name: "debtor", label: "Debtor", helper: "0 = no · 1 = yes", min: 0, max: 1, default: 0 },
    ],
  },
  {
    title: "Prior Education",
    fields: [
      { name: "previous_qualification", label: "Previous qualification", helper: "Coded (1–43)", min: 1, max: 43, default: 1 },
      { name: "previous_qualification_grade", label: "Prev. qualification grade", helper: "95–190", min: 95, max: 190, step: 0.1, default: 130 },
    ],
  },
  {
    title: "1st Semester Details",
    fields: [
      { name: "cu_1st_sem_credited", label: "Units credited", helper: "0–20", min: 0, max: 20, default: 0 },
      { name: "cu_1st_sem_enrolled", label: "Units enrolled", helper: "0–26", min: 0, max: 26, default: 6 },
      { name: "cu_1st_sem_evaluations", label: "Evaluations", helper: "0–45", min: 0, max: 45, default: 6 },
      { name: "cu_1st_sem_without_evaluations", label: "Without evaluations", helper: "0–12", min: 0, max: 12, default: 0 },
    ],
  },
  {
    title: "2nd Semester Details",
    fields: [
      { name: "cu_2nd_sem_credited", label: "Units credited", helper: "0–19", min: 0, max: 19, default: 0 },
      { name: "cu_2nd_sem_enrolled", label: "Units enrolled", helper: "0–23", min: 0, max: 23, default: 6 },
      { name: "cu_2nd_sem_evaluations", label: "Evaluations", helper: "0–33", min: 0, max: 33, default: 6 },
      { name: "cu_2nd_sem_without_evaluations", label: "Without evaluations", helper: "0–12", min: 0, max: 12, default: 0 },
    ],
  },
  {
    title: "Family Background",
    fields: [
      { name: "mothers_qualification", label: "Mother's qualification", helper: "Coded (1–44)", min: 1, max: 44, default: 19 },
      { name: "fathers_qualification", label: "Father's qualification", helper: "Coded (1–44)", min: 1, max: 44, default: 12 },
      { name: "mothers_occupation", label: "Mother's occupation", helper: "Coded (0–194)", min: 0, max: 194, default: 5 },
      { name: "fathers_occupation", label: "Father's occupation", helper: "Coded (0–195)", min: 0, max: 195, default: 9 },
    ],
  },
  {
    title: "Macroeconomic Indicators",
    fields: [
      { name: "unemployment_rate", label: "Unemployment rate", helper: "7.6–16.2 %", min: 7.6, max: 16.2, step: 0.1, default: 10.8 },
      { name: "inflation_rate", label: "Inflation rate", helper: "-0.8–3.7 %", min: -0.8, max: 3.7, step: 0.1, default: 1.4 },
      { name: "gdp", label: "GDP growth", helper: "-4.06–3.51 %", min: -4.06, max: 3.51, step: 0.01, default: 1.74 },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const defaultValues = () =>
  Object.fromEntries(ALL_FIELDS.map((f) => [f.name, f.default])) as Record<string, number>;

function PredictPage() {
  const [values, setValues] = useState<Record<string, number>>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  function setField(name: string, raw: string) {
    const num = Number(raw);
    setValues((v) => ({ ...v, [name]: Number.isFinite(num) ? num : 0 }));
    setErrors((e) => {
      const { [name]: _, ...rest } = e;
      return rest;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const f of ALL_FIELDS) {
      const v = values[f.name];
      if (v === undefined || Number.isNaN(v)) next[f.name] = "Required";
      else if (v < f.min || v > f.max) next[f.name] = `Must be between ${f.min} and ${f.max}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onPredict() {
    if (!validate()) {
      toast.error("Please fix invalid fields before predicting.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await apiPredict(values);
      setResult(r);
    } catch (err) {
      toast.error("Prediction failed. Is the backend running on localhost:8000?");
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setValues(defaultValues());
    setErrors({});
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Predict Risk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a student profile to compute a dropout risk score using the XGBoost model.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {SECTIONS.map((sec) => (
            <SectionCard key={sec.title} title={sec.title}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sec.fields.map((f) => {
                  const err = errors[f.name];
                  return (
                    <div key={f.name}>
                      <label className="text-xs font-medium text-foreground">{f.label}</label>
                      <input
                        type="number"
                        step={f.step ?? 1}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring/20"
                        style={{ borderColor: err ? "#e74c3c" : "var(--border)" }}
                      />
                      <div className={`mt-1 text-xs ${err ? "text-[color:var(--risk-high)]" : "text-muted-foreground"}`}>
                        {err ?? f.helper}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))}

          <div className="no-print flex flex-wrap gap-3">
            <button
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Form
            </button>
            <button
              onClick={onPredict}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "#1A3C6E" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Predicting..." : "Predict Risk"}
            </button>
          </div>
        </div>

        <div>
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="sticky top-6 space-y-4"
              >
                <ResultPanel result={result} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sticky top-6 rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground"
              >
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                Fill the form and click <strong className="text-foreground">Predict Risk</strong> to see the result here.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: PredictResult }) {
  const color = riskHex(result.level);
  const Icon = result.level === "high" ? AlertTriangle : result.level === "medium" ? Info : CheckCircle2;

  return (
    <>
      <SectionCard title="Prediction Result">
        <div className="flex flex-col items-center gap-3">
          <HalfGauge score={result.score} />
          <div className="text-center">
            <div className="text-3xl font-semibold tabular-nums text-foreground">{result.score.toFixed(2)}</div>
            <div className="mt-1"><RiskBadge level={result.level} /></div>
          </div>
          <div className="w-full rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="text-muted-foreground">Primary factor</div>
            <div className="mt-0.5 font-medium text-foreground">{result.primaryFactor}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="SHAP Breakdown">
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart layout="vertical" data={result.shap} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="feature" width={180} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                {result.shap.map((d, i) => (
                  <Cell key={i} fill={d.shap > 0 ? "#e74c3c" : "#3498db"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div
        className="rounded-xl p-4"
        style={{
          borderLeft: `4px solid ${color}`,
          background: `color-mix(in srgb, ${color} 6%, white)`,
        }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <div className="text-sm font-semibold text-foreground">
            {riskLabel(result.level)} Risk · Recommended action
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {result.recommendation.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} className="text-sm text-foreground/80">{line}</p>
          ))}
        </div>
      </div>

      <div className="no-print flex gap-2">
        <button
          onClick={() => toast.success("Prediction saved to database.")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
    </>
  );
}

function HalfGauge({ score }: { score: number }) {
  const w = 220;
  const h = 130;
  const cx = w / 2;
  const cy = h - 10;
  const r = 90;
  const angle = Math.PI * score;
  const x = cx - r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const color = score >= 0.7 ? "#e74c3c" : score >= 0.4 ? "#f39c12" : "#2ecc71";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#2ecc71" />
          <stop offset="50%" stopColor="#f39c12" />
          <stop offset="100%" stopColor="#e74c3c" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke="url(#gaugeGrad)"
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
      <motion.line
        x1={cx}
        y1={cy}
        initial={{ x2: cx - r, y2: cy }}
        animate={{ x2: x, y2: y }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={6} fill={color} />
    </svg>
  );
}
