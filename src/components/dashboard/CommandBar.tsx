import { CheckCircle2, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { engineIcon } from "@/lib/copilotStyles";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";
import { useDashboardData } from "@/hooks/useDashboard";

const CommandBar = () => {
  const { selectedClientId } = useClientContext();
  const { data: riskAlerts = [] } = useClientRiskAlerts(selectedClientId);
  const { data: rawPlans = [] } = useClientQuarterlyPlans(selectedClientId);
  const { data: dashboardData } = useDashboardData();

  // Derive current quarter info from the active plan
  const activePlan = (rawPlans as any[]).find((p) => p.status === "active") ?? (rawPlans as any[])[0];
  const currentQuarter = activePlan?.quarter ?? 2;
  const reviewDate = activePlan?.review_date ?? null;

  const quarterRanges: Record<number, { start: string; end: string }> = {
    1: { start: "Jan 1", end: "Mar 31" },
    2: { start: "Apr 1", end: "Jun 30" },
    3: { start: "Jul 1", end: "Sep 30" },
    4: { start: "Oct 1", end: "Dec 31" },
  };
  const range = quarterRanges[currentQuarter] ?? quarterRanges[2];

  const phases = activePlan?.phases ?? [];

  // Derive engine health from dashboard averages
  const avgScores = dashboardData?.averageScores ?? {};
  const engineStatus = [
    {
      engine: "Capital Architecture",
      health: Math.round(avgScores.avg_capital_readiness ?? 0),
    },
    {
      engine: "Customer Capital Defense",
      health: Math.round(avgScores.avg_customer_capital ?? 0),
    },
    {
      engine: "Performance & Execution",
      health: Math.round(avgScores.avg_performance_score ?? 0),
    },
  ];

  const criticalCount = (riskAlerts as any[]).filter((r) => r.severity === "high" || r.severity === "critical").length;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-6">
        {/* Left: Quarterly Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md gradient-gold text-accent-foreground text-xs font-bold flex-shrink-0">
            Q{currentQuarter}
          </span>

          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {range.start} – {range.end}
          </span>

          {phases.length > 0 && (
            <div className="flex items-center gap-2">
              {phases.map((phase: any) => (
                <div key={phase.id ?? phase.phase} className="flex items-center gap-1.5">
                  {phase.status === "complete" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : phase.status === "in_progress" || phase.status === "active" ? (
                    <Activity className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-xs whitespace-nowrap",
                    phase.status === "in_progress" || phase.status === "active"
                      ? "font-semibold text-foreground"
                      : phase.status === "complete"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                  )}>
                    {phase.label ?? phase.phase}
                  </span>
                </div>
              ))}
            </div>
          )}

          {reviewDate && (
            <span className="text-xs font-semibold text-foreground whitespace-nowrap flex-shrink-0">
              Review {new Date(reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        <div className="w-px h-8 bg-border flex-shrink-0" />

        {/* Center: Engine Health */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {engineStatus.map((engine) => (
            <div key={engine.engine} className="flex items-center gap-2">
              <span className="text-muted-foreground">{engineIcon[engine.engine]}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-foreground leading-none">{engine.health}</span>
                <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${engine.health}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-px h-8 bg-border flex-shrink-0" />

        {/* Right: Risk alerts */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {criticalCount} critical
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
