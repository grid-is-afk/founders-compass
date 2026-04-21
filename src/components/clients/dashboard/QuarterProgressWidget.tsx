import { useClientTasks } from "@/hooks/useTasks";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  current_quarter?: number;
  current_year?: number;
  onboarded_at: string | null;
}

interface QuarterProgressWidgetProps {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeDateRange(onboardedAt: string | null): string {
  if (!onboardedAt) return "—";
  const start = new Date(onboardedAt);
  // Q1 = 90 days
  const end = new Date(start.getTime() + 89 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuarterProgressWidget({ client }: QuarterProgressWidgetProps) {
  const { data: rawTasks = [] } = useClientTasks(client.id);
  const { data: rawAlerts = [] } = useClientRiskAlerts(client.id);

  const tasks = rawTasks as Array<{ status: string; due_date: string | null }>;
  const alerts = rawAlerts as Array<{ severity: string; resolved: boolean }>;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.due_date &&
      new Date(t.due_date) < new Date()
  ).length;
  const criticalAlerts = alerts.filter(
    (a) => !a.resolved && a.severity === "critical"
  ).length;

  const quarter = client.current_quarter ?? 1;
  const year = client.current_year ?? new Date().getFullYear();
  const dateRange = computeDateRange(client.onboarded_at);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            Q{quarter} {year}
          </span>
          <span className="text-xs text-muted-foreground">{dateRange}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center space-y-0.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Total Tasks
          </p>
          <p className="text-xl font-bold text-foreground">{totalTasks}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 text-center space-y-0.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Completed
          </p>
          <p className="text-xl font-bold text-emerald-500">{completedTasks}</p>
        </div>

        <div className={cn(
          "rounded-lg border p-3 text-center space-y-0.5",
          overdueTasks > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
        )}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Overdue
          </p>
          <p className={cn("text-xl font-bold", overdueTasks > 0 ? "text-amber-500" : "text-foreground")}>
            {overdueTasks}
          </p>
        </div>

        <div className={cn(
          "rounded-lg border p-3 text-center space-y-0.5",
          criticalAlerts > 0 ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"
        )}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Critical Alerts
          </p>
          <p className={cn("text-xl font-bold", criticalAlerts > 0 ? "text-red-500" : "text-foreground")}>
            {criticalAlerts}
          </p>
        </div>
      </div>
    </div>
  );
}
