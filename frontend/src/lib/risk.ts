export type RiskLevel = "low" | "medium" | "high";

export function riskFromScore(score: number): RiskLevel {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function riskLabel(level: RiskLevel): string {
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
}

export function riskColor(level: RiskLevel): string {
  return level === "high"
    ? "var(--risk-high)"
    : level === "medium"
      ? "var(--risk-med)"
      : "var(--risk-low)";
}

export function riskHex(level: RiskLevel): string {
  return level === "high" ? "#e74c3c" : level === "medium" ? "#f39c12" : "#2ecc71";
}
