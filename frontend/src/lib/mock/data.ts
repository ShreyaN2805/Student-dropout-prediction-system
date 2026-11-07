import { riskFromScore, type RiskLevel } from "../risk";

export type Student = {
  id: string;
  name: string;
  course: string;
  age: number;
  gender: "Male" | "Female";
  enrollmentYear: number;
  scholarship: boolean;
  tuitionUpToDate: boolean;
  sem1Approved: number;
  sem2Approved: number;
  riskScore: number;
  riskLevel: RiskLevel;
};

export type ShapItem = { feature: string; value: number };
export type StudentShap = { feature: string; featureValue: string; shap: number };

const COURSES = [
  "Computer Science",
  "Business Administration",
  "Nursing",
  "Mechanical Engineering",
  "Psychology",
  "Economics",
  "Architecture",
  "Veterinary Nursing",
  "Communication Design",
  "Tourism",
];

const FIRST = [
  "Ana","Bruno","Carla","Diego","Elena","Felipe","Gabriela","Hugo","Isabel","João",
  "Karla","Luís","Mariana","Nuno","Olivia","Pedro","Rita","Sofia","Tiago","Vera",
  "Catarina","Rafael","Beatriz","Miguel","Inês","André","Mateus","Helena","Ricardo","Sara",
];
const LAST = [
  "Silva","Santos","Pereira","Costa","Oliveira","Rodrigues","Martins","Almeida","Lopes","Gomes",
  "Carvalho","Ribeiro","Ferreira","Mendes","Sousa","Cardoso","Rocha","Pinto","Marques","Nunes",
];

// Deterministic PRNG so the mock is stable across renders.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260623);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

export const STUDENTS: Student[] = Array.from({ length: 120 }, (_, i) => {
  const id = `STU-${String(1001 + i)}`;
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const course = pick(COURSES);
  const age = 18 + Math.floor(rand() * 10);
  const gender = rand() > 0.5 ? "Female" : "Male";
  const enrollmentYear = 2020 + Math.floor(rand() * 5);
  const scholarship = rand() > 0.7;
  const tuitionUpToDate = rand() > 0.25;
  const sem1Approved = Math.floor(rand() * 7);
  const sem2Approved = Math.max(0, sem1Approved - Math.floor(rand() * 3) + Math.floor(rand() * 2));

  // risk score correlated with low approvals + unpaid tuition
  let score =
    0.15 +
    (6 - sem1Approved) * 0.045 +
    (6 - sem2Approved) * 0.05 +
    (tuitionUpToDate ? 0 : 0.18) +
    (scholarship ? -0.08 : 0) +
    (rand() - 0.5) * 0.18;
  score = Math.max(0.02, Math.min(0.98, score));

  return {
    id,
    name,
    course,
    age,
    gender,
    enrollmentYear,
    scholarship,
    tuitionUpToDate,
    sem1Approved,
    sem2Approved,
    riskScore: Number(score.toFixed(3)),
    riskLevel: riskFromScore(score),
  };
});

export const GLOBAL_SHAP: ShapItem[] = [
  { feature: "Curricular units 2nd sem (approved)", value: 0.184 },
  { feature: "Curricular units 1st sem (approved)", value: 0.162 },
  { feature: "Tuition fees up to date", value: 0.141 },
  { feature: "Scholarship holder", value: 0.098 },
  { feature: "Age at enrollment", value: 0.082 },
  { feature: "Curricular units 2nd sem (grade)", value: 0.071 },
  { feature: "Admission grade", value: 0.063 },
  { feature: "Unemployment rate", value: 0.052 },
  { feature: "Course", value: 0.041 },
  { feature: "Application mode", value: 0.034 },
];

export const RISK_TREND = (() => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months.map((m, i) => ({
    month: m,
    low: 60 + Math.round(Math.sin(i / 2) * 10) + Math.floor(rand() * 8),
    medium: 30 + Math.round(Math.cos(i / 3) * 6) + Math.floor(rand() * 6),
    high: 18 + Math.round(Math.sin(i / 4 + 1) * 5) + Math.floor(rand() * 5),
  }));
})();

export const MODEL_METRICS = {
  accuracy: 0.892,
  precision: 0.871,
  recall: 0.848,
  f1: 0.859,
  rocAuc: 0.927,
};

export function studentShap(s: Student): StudentShap[] {
  // produce per-student waterfall data
  const items: StudentShap[] = [
    {
      feature: "Curricular units 2nd sem (approved)",
      featureValue: String(s.sem2Approved),
      shap: (3 - s.sem2Approved) * 0.06,
    },
    {
      feature: "Curricular units 1st sem (approved)",
      featureValue: String(s.sem1Approved),
      shap: (3 - s.sem1Approved) * 0.05,
    },
    {
      feature: "Tuition fees up to date",
      featureValue: s.tuitionUpToDate ? "Yes" : "No",
      shap: s.tuitionUpToDate ? -0.12 : 0.16,
    },
    {
      feature: "Scholarship holder",
      featureValue: s.scholarship ? "Yes" : "No",
      shap: s.scholarship ? -0.09 : 0.04,
    },
    {
      feature: "Age at enrollment",
      featureValue: String(s.age),
      shap: (s.age - 20) * 0.012,
    },
    {
      feature: "Admission grade",
      featureValue: (120 + (s.id.charCodeAt(5) % 40)).toString(),
      shap: -0.05 + (s.id.charCodeAt(6) % 7) * 0.01,
    },
    {
      feature: "Unemployment rate",
      featureValue: "10.8%",
      shap: 0.03,
    },
  ];
  return items.sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
}

export function studentTrajectory(s: Student) {
  // 12 points, ending at current score
  const end = s.riskScore;
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const drift = (Math.sin((i + s.id.charCodeAt(5)) / 2) + 1) * 0.05;
    const score = Math.max(0.02, Math.min(0.98, end * t + 0.2 * (1 - t) + drift - 0.05));
    return {
      month: `M${i + 1}`,
      score: Number(score.toFixed(3)),
    };
  });
}

// ===== Simulated API =====
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export async function apiGetStudents(): Promise<Student[]> {
  await delay(350);
  return STUDENTS;
}
export async function apiGetStudent(id: string): Promise<Student | undefined> {
  await delay(300);
  return STUDENTS.find((s) => s.id === id);
}
export async function apiGetDashboard() {
  await delay(450);
  const total = STUDENTS.length;
  const high = STUDENTS.filter((s) => s.riskLevel === "high").length;
  const med = STUDENTS.filter((s) => s.riskLevel === "medium").length;
  const low = STUDENTS.filter((s) => s.riskLevel === "low").length;
  const avg = STUDENTS.reduce((a, s) => a + s.riskScore, 0) / total;
  return {
    total,
    high,
    medium: med,
    low,
    avgScore: Number(avg.toFixed(3)),
    shap: GLOBAL_SHAP.slice(0, 8),
    trend: RISK_TREND,
    metrics: MODEL_METRICS,
    recentHighRisk: STUDENTS.filter((s) => s.riskLevel === "high")
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6),
  };
}

export type PredictPayload = Record<string, number>;
export type PredictResult = {
  score: number;
  level: RiskLevel;
  primaryFactor: string;
  shap: StudentShap[];
  recommendation: string;
};

export async function apiPredict(payload: PredictPayload): Promise<PredictResult> {
  await delay(900);
  const sem1 = payload["curricular_units_1st_sem_approved"] ?? 3;
  const sem2 = payload["curricular_units_2nd_sem_approved"] ?? 3;
  const tuition = payload["tuition_fees_up_to_date"] ?? 1;
  const scholarship = payload["scholarship_holder"] ?? 0;
  const age = payload["age_at_enrollment"] ?? 20;

  let score =
    0.5 -
    sem1 * 0.04 -
    sem2 * 0.05 +
    (tuition ? -0.15 : 0.18) +
    (scholarship ? -0.08 : 0.03) +
    (age - 20) * 0.008;
  score = Math.max(0.02, Math.min(0.98, score));
  const level = riskFromScore(score);

  const shap: StudentShap[] = [
    { feature: "Curricular units 2nd sem (approved)", featureValue: String(sem2), shap: (3 - sem2) * 0.06 },
    { feature: "Curricular units 1st sem (approved)", featureValue: String(sem1), shap: (3 - sem1) * 0.05 },
    { feature: "Tuition fees up to date", featureValue: tuition ? "Yes" : "No", shap: tuition ? -0.12 : 0.16 },
    { feature: "Scholarship holder", featureValue: scholarship ? "Yes" : "No", shap: scholarship ? -0.09 : 0.04 },
    { feature: "Age at enrollment", featureValue: String(age), shap: (age - 20) * 0.012 },
  ].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));

  const recommendation =
    level === "high"
      ? "Immediate academic intervention required. Assign a tutor, contact parents, and refer the student to financial services."
      : level === "medium"
        ? "Schedule a counseling session within two weeks and monitor academic performance closely."
        : "Continue regular monitoring; no immediate intervention required.";

  return {
    score: Number(score.toFixed(3)),
    level,
    primaryFactor: shap[0].feature,
    shap,
    recommendation,
  };
}
