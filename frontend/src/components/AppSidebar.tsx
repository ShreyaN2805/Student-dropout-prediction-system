import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Sparkles, GraduationCap } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/predict", label: "Predict", icon: Sparkles },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col lg:flex"
      style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Retention</div>
          <div className="text-xs text-white/60">Counseling Suite</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-3">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
              style={{
                background: active ? "var(--sidebar-active)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.78)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
        v1.0 · Demo data
      </div>
    </aside>
  );
}
