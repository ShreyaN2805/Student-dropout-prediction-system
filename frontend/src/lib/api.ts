import type { RiskLevel } from "./risk";

const API_BASE = "http://localhost:8000";

// ── Course code → display name ──

const COURSE_NAMES: Record<number, string> = {
  33: "Biofuel Production Technologies",
  171: "Animation and Multimedia Design",
  8014: "Social Service (Evening)",
  9003: "Agronomy",
  9070: "Communication Design",
  9085: "Veterinary Nursing",
  9119: "Informatics Engineering",
  9130: "Equinculture",
  9147: "Management",
  9238: "Social Service",
  9254: "Tourism",
  9500: "Nursing",
  9556: "Oral Hygiene",
  9670: "Advertising and Marketing Management",
  9773: "Journalism and Communication",
  9853: "Basic Education",
  9991: "Management (Evening)",
};

// Original model feature name → snake_case API field name
const FEATURE_TO_API: Record<string, string> = {
  "Marital Status": "marital_status",
  "Application mode": "application_mode",
  "Application order": "application_order",
  "Course": "course",
  "Daytime/evening attendance": "daytime_evening_attendance",
  "Previous qualification": "previous_qualification",
  "Previous qualification (grade)": "previous_qualification_grade",
  "Nacionality": "nacionality",
  "Mother's qualification": "mothers_qualification",
  "Father's qualification": "fathers_qualification",
  "Mother's occupation": "mothers_occupation",
  "Father's occupation": "fathers_occupation",
  "Admission grade": "admission_grade",
  "Displaced": "displaced",
  "Educational special needs": "educational_special_needs",
  "Debtor": "debtor",
  "Tuition fees up to date": "tuition_fees_up_to_date",
  "Gender": "gender",
  "Scholarship holder": "scholarship_holder",
  "Age at enrollment": "age_at_enrollment",
  "International": "international",
  "Curricular units 1st sem (credited)": "cu_1st_sem_credited",
  "Curricular units 1st sem (enrolled)": "cu_1st_sem_enrolled",
  "Curricular units 1st sem (evaluations)": "cu_1st_sem_evaluations",
  "Curricular units 1st sem (approved)": "cu_1st_sem_approved",
  "Curricular units 1st sem (grade)": "cu_1st_sem_grade",
  "Curricular units 1st sem (without evaluations)": "cu_1st_sem_without_evaluations",
  "Curricular units 2nd sem (credited)": "cu_2nd_sem_credited",
  "Curricular units 2nd sem (enrolled)": "cu_2nd_sem_enrolled",
  "Curricular units 2nd sem (evaluations)": "cu_2nd_sem_evaluations",
  "Curricular units 2nd sem (approved)": "cu_2nd_sem_approved",
  "Curricular units 2nd sem (grade)": "cu_2nd_sem_grade",
  "Curricular units 2nd sem (without evaluations)": "cu_2nd_sem_without_evaluations",
  "Unemployment rate": "unemployment_rate",
  "Inflation rate": "inflation_rate",
  "GDP": "gdp",
};

function courseName(code: number): string {
  return COURSE_NAMES[code] ?? `Course ${code}`;
}

function normalizeRiskLevel(level: string | null | undefined): RiskLevel {
  const l = (level ?? "").toLowerCase();
  if (l === "high") return "high";
  if (l === "medium") return "medium";
  return "low";
}

function capitalizeRisk(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Shared Types ──

export type Student = {
  id: string;
  name: string;
  course: string;
  age: number;
  gender: "Male" | "Female";
  scholarship: boolean;
  tuitionUpToDate: boolean;
  sem1Approved: number;
  sem2Approved: number;
  riskScore: number;
  riskLevel: RiskLevel;
};

export type ShapItem = { feature: string; value: number };
export type StudentShap = { feature: string; featureValue: string; shap: number };

export type PredictPayload = Record<string, number>;
export type PredictResult = {
  score: number;
  level: RiskLevel;
  primaryFactor: string;
  shap: StudentShap[];
  recommendation: string;
};

// ── Backend response types ──

type BStudentSummary = {
  student_id: string;
  course: number;
  age_at_enrollment: number;
  gender: number;
  cu_1st_sem_approved: number;
  cu_1st_sem_grade: number;
  cu_2nd_sem_approved: number;
  cu_2nd_sem_grade: number;
  tuition_fees_up_to_date: number;
  scholarship_holder: number;
  latest_risk_score: number | null;
  latest_risk_level: string | null;
};

type BDashboardStats = {
  total_students: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  unscored_count: number;
  high_risk_pct: number;
  medium_risk_pct: number;
  low_risk_pct: number;
  avg_risk_score: number;
  top_shap_features: { feature: string; importance: number }[];
  recent_high_risk: { student_id: string; risk_score: number }[];
};

type BStudentDetail = {
  student_id: string;
  features: Record<string, number>;
  latest_risk_score: number | null;
  latest_risk_level: string | null;
  created_at: string;
};

type BPredictionHistory = {
  id: number;
  risk_score: number;
  risk_level: string;
  top_shap_feature: string;
  recommendation: string;
  shap_values: Record<string, number>;
  created_at: string;
};

type BPredictResponse = {
  student_id: string | null;
  risk_score: number;
  risk_level: string;
  top_shap_feature: string;
  recommendation: string;
  base_value: number;
  shap_values: { feature: string; value: number; shap_value: number }[];
};

// ── Transform ──

function toStudent(s: BStudentSummary): Student {
  return {
    id: s.student_id,
    name: s.student_id,
    course: courseName(s.course),
    age: s.age_at_enrollment,
    gender: s.gender === 1 ? "Male" : "Female",
    scholarship: s.scholarship_holder === 1,
    tuitionUpToDate: s.tuition_fees_up_to_date === 1,
    sem1Approved: s.cu_1st_sem_approved,
    sem2Approved: s.cu_2nd_sem_approved,
    riskScore: s.latest_risk_score ?? 0,
    riskLevel: normalizeRiskLevel(s.latest_risk_level),
  };
}

// ── Dashboard ──

export async function apiGetDashboard() {
  const [stats, health] = await Promise.all([
    fetchApi<BDashboardStats>("/dashboard/stats"),
    fetchApi<{ status: string; model: string; accuracy: number }>("/health"),
  ]);

  return {
    total: stats.total_students,
    high: stats.high_risk_count,
    medium: stats.medium_risk_count,
    low: stats.low_risk_count,
    avgScore: stats.avg_risk_score,
    highPct: stats.high_risk_pct,
    mediumPct: stats.medium_risk_pct,
    lowPct: stats.low_risk_pct,
    shap: stats.top_shap_features.map((f) => ({
      feature: f.feature,
      value: f.importance,
    })),
    metrics: {
      accuracy: health.accuracy,
    },
    recentHighRisk: stats.recent_high_risk.map((s) => ({
      id: s.student_id,
      name: s.student_id,
      riskLevel: "high" as RiskLevel,
      riskScore: s.risk_score,
    })),
  };
}

// ── Students List ──

export async function apiGetStudents(params?: {
  riskLevel?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  skip?: number;
  limit?: number;
}): Promise<Student[]> {
  const sp = new URLSearchParams();
  if (params?.riskLevel) sp.set("risk_level", capitalizeRisk(params.riskLevel));
  if (params?.search) sp.set("search", params.search);
  if (params?.sortBy) sp.set("sort_by", params.sortBy);
  if (params?.sortDir) sp.set("sort_dir", params.sortDir);
  if (params?.skip !== undefined) sp.set("skip", String(params.skip));
  if (params?.limit !== undefined) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const data = await fetchApi<BStudentSummary[]>(`/students${qs ? `?${qs}` : ""}`);
  return data.map(toStudent);
}

export async function apiGetStudentsCount(params?: {
  riskLevel?: string;
  search?: string;
}): Promise<number> {
  const sp = new URLSearchParams();
  if (params?.riskLevel) sp.set("risk_level", capitalizeRisk(params.riskLevel));
  if (params?.search) sp.set("search", params.search);
  const qs = sp.toString();
  const data = await fetchApi<{ total: number }>(`/students/count${qs ? `?${qs}` : ""}`);
  return data.total;
}

// ── Student Detail ──

export type StudentFullDetail = {
  student: Student;
  features: Record<string, number>;
  shap: StudentShap[];
  trajectory: { month: string; score: number }[];
  recommendation: string;
};

export async function apiGetStudent(id: string): Promise<StudentFullDetail | undefined> {
  try {
    const [detail, history] = await Promise.all([
      fetchApi<BStudentDetail>(`/students/${id}`),
      fetchApi<BPredictionHistory[]>(`/students/${id}/history`),
    ]);

    const feat = detail.features;
    const student: Student = {
      id: detail.student_id,
      name: detail.student_id,
      course: courseName(feat.course ?? 0),
      age: feat.age_at_enrollment ?? 0,
      gender: feat.gender === 1 ? "Male" : "Female",
      scholarship: feat.scholarship_holder === 1,
      tuitionUpToDate: feat.tuition_fees_up_to_date === 1,
      sem1Approved: feat.cu_1st_sem_approved ?? 0,
      sem2Approved: feat.cu_2nd_sem_approved ?? 0,
      riskScore: detail.latest_risk_score ?? 0,
      riskLevel: normalizeRiskLevel(detail.latest_risk_level),
    };

    const latestPred = history[0];
    const shap: StudentShap[] = latestPred
      ? Object.entries(latestPred.shap_values)
          .map(([feature, shapValue]) => ({
            feature,
            featureValue: String(feat[FEATURE_TO_API[feature] ?? ""] ?? ""),
            shap: shapValue,
          }))
          .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
          .slice(0, 10)
      : [];

    const trajectory = [...history]
      .reverse()
      .map((p, i) => ({
        month: p.created_at
          ? new Date(p.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })
          : `P${i + 1}`,
        score: p.risk_score,
      }));

    return {
      student,
      features: feat,
      shap,
      trajectory,
      recommendation: latestPred?.recommendation ?? "",
    };
  } catch {
    return undefined;
  }
}

// ── Predict ──

export async function apiPredict(payload: PredictPayload): Promise<PredictResult> {
  const body: Record<string, number> = { ...payload };

  const data = await fetchApi<BPredictResponse>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const shap: StudentShap[] = data.shap_values
    .map((sv) => ({
      feature: sv.feature,
      featureValue: String(sv.value),
      shap: sv.shap_value,
    }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
    .slice(0, 8);

  return {
    score: data.risk_score,
    level: normalizeRiskLevel(data.risk_level),
    primaryFactor: data.top_shap_feature,
    shap,
    recommendation: data.recommendation,
  };
}
