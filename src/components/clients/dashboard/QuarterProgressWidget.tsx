import { CalendarDays, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";
import { useGenerateReviewPrep } from "@/hooks/useDeliverables";
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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntilReview(reviewDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(reviewDate).getTime() - today.getTime()) / MS_PER_DAY);
}

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
  const { data: plans = [] } = useClientQuarterlyPlans(client.id);
  const { mutate: generateReviewPrep, isPending: isGeneratingPrep } =
    useGenerateReviewPrep(client.id);

  const tasks = rawTasks as Array<{ status: string; due_date: string | null }>;
  const alerts = rawAlerts as Array<{ severity: string; resolved: boolean }>;
  const quarterlyPlans = plans as Array<{
    quarter: number;
    year: number;
    status: string;
    review_date: string | null;
  }>;

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

  // Find the earliest non-complete plan with a review_date (prefer active over draft)
  const reviewPlan = quarterlyPlans
    .filter((p) => p.review_date && p.status !== "complete")
    .sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return new Date(a.review_date!).getTime() - new Date(b.review_date!).getTime();
    })
    .at(0) ?? null;

  const days = reviewPlan?.review_date ? daysUntilReview(reviewPlan.review_date) : null;

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

      {days !== null && reviewPlan && (
        <div className={cn(
          "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
          days < 0
            ? "border-red-500/30 bg-red-500/5"
            : days === 0
            ? "border-red-500/30 bg-red-500/5"
            : days <= 14
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-muted/40"
        )}>
          <div className={cn(
            "flex items-center gap-2 text-xs font-medium",
            days <= 0
              ? "text-red-600 dark:text-red-400"
              : days <= 14
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}>
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>
              {days < 0
                ? `Q${reviewPlan.quarter} review overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
                : days === 0
                ? `Q${reviewPlan.quarter} review is today`
                : `${days} day${days === 1 ? "" : "s"} until Q${reviewPlan.quarter} review`}
            </span>
          </div>

          {days <= 14 && (
            <button
              onClick={() => {
                generateReviewPrep(
                  { quarter: reviewPlan.quarter },
                  {
                    onSuccess: () =>
                      toast.success("Review prep ready — check Deliverables"),
                    onError: () =>
                      toast.error("Failed to generate review prep. Please try again."),
                  }
                );
              }}
              disabled={isGeneratingPrep}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                "border transition-colors shrink-0",
                days <= 0
                  ? "border-red-500/40 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isGeneratingPrep ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ClipboardList className="w-3 h-3" />
              )}
              {isGeneratingPrep ? "Preparing…" : "Prepare Review"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
