import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users } from "lucide-react";
import { z } from "zod";

import { apiGetStudents, apiGetStudentsCount } from "@/lib/api";
import type { RiskLevel } from "@/lib/risk";
import { RiskBadge, RiskBar, SectionCard, Skeleton, EmptyState } from "@/components/ui-bits";

const searchSchema = z.object({
  risk: z.string().optional(),
});

export const Route = createFileRoute("/students/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Students — Retention" },
      { name: "description", content: "Browse, search and filter students by dropout risk." },
      { property: "og:title", content: "Students — Retention" },
      { property: "og:description", content: "Browse, search and filter students by dropout risk." },
    ],
  }),
  component: StudentsPage,
});

type SortKey = "name" | "riskScore" | "riskLevel";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const SORT_KEY_MAP: Record<SortKey, string> = {
  name: "student_id",
  riskScore: "latest_risk_score",
  riskLevel: "latest_risk_level",
};

function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function StudentsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const initial = search.risk as RiskLevel | undefined;

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(initial ?? null);
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [debouncedQuery, riskFilter, sortKey, sortDir]);

  const filterParams = {
    riskLevel: riskFilter ?? undefined,
    search: debouncedQuery || undefined,
  };

  const listParams = {
    ...filterParams,
    sortBy: SORT_KEY_MAP[sortKey],
    sortDir,
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", listParams],
    queryFn: () => apiGetStudents(listParams),
    placeholderData: (prev) => prev,
  });

  const { data: totalCount } = useQuery({
    queryKey: ["students-count", filterParams],
    queryFn: () => apiGetStudentsCount(filterParams),
  });

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = students ?? [];

  function toggleRisk(level: RiskLevel | "all") {
    if (level === "all") {
      setRiskFilter(null);
    } else {
      setRiskFilter(riskFilter === level ? null : level);
    }
  }

  function headerCell(label: string, key: SortKey, align: "left" | "right" = "left") {
    const active = sortKey === key;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        className={`cursor-pointer select-none px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else {
            setSortKey(key);
            setSortDir("desc");
          }
        }}
      >
        <span className={`inline-flex items-center gap-1 ${active ? "text-foreground" : ""}`}>
          {label}
          <Icon className="h-3 w-3" />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `${total} students${riskFilter ? ` (${riskFilter} risk)` : ""}` : "Loading students..."}
          </p>
        </div>
      </header>

      <SectionCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student ID..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "low", "medium", "high"] as const).map((r) => {
              const active = r === "all" ? riskFilter === null : riskFilter === r;
              const colors: Record<string, string> = {
                all: "#1A3C6E",
                low: "#2ecc71",
                medium: "#f39c12",
                high: "#e74c3c",
              };
              return (
                <button
                  key={r}
                  onClick={() => toggleRisk(r)}
                  className="rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors"
                  style={{
                    background: active ? `color-mix(in srgb, ${colors[r]} 14%, white)` : "transparent",
                    borderColor: active ? colors[r] : "var(--border)",
                    color: active ? `color-mix(in srgb, ${colors[r]} 70%, black)` : "var(--muted-foreground)",
                  }}
                >
                  {r === "all" ? "All" : r}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && !students ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            title="No students match your filters"
            description="Try clearing your search or selecting different risk levels."
            icon={<Users className="h-6 w-6" />}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {headerCell("Student ID", "name")}
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Course</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Sem 1</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Sem 2</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tuition</th>
                    {headerCell("Risk Level", "riskLevel")}
                    {headerCell("Risk Score", "riskScore", "right")}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate({ to: "/students/$id", params: { id: s.id } })}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{s.id}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.course}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.sem1Approved}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.sem2Approved}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                            s.tuitionUpToDate
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {s.tuitionUpToDate ? "Paid" : "Overdue"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><RiskBadge level={s.riskLevel} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <span className="w-10 text-right text-sm font-medium tabular-nums">
                            {s.riskScore.toFixed(2)}
                          </span>
                          <div className="w-24"><RiskBar score={s.riskScore} animate={false} /></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Page {safePage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
