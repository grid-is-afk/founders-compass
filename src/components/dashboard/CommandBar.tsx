import { CheckCircle2, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { copilotEngineStatus, copilotRiskAlerts } from "@/lib/mockData";
import { engineIcon } from "@/lib/copilotStyles";
import { useClientContext } from "@/hooks/useClientContext";
import { clientQuarterlyEngagement } from "@/lib/clientMockData";

const CommandBar = () => {
  const { selectedClientId } = useClientContext();
  const quarterlyEngagement = clientQuarterlyEngagement[selectedClientId] ?? clientQuarterlyEngagement["1"];
  const criticalCount = copilotRiskAlerts.filter((r) => r.severity === "critical").length;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-6">
        {/* Left: Quarterly Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Quarter badge */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md gradient-gold text-accent-foreground text-xs font-bold flex-shrink-0">
            Q{quarterlyEngagement.currentQuarter}
          </span>

          {/* Date range */}
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {quarterlyEngagement.quarterStart} – {quarterlyEngagement.quarterEnd}
          </span>

          {/* Phase dots */}
          <div className="flex items-center gap-2">
            {quarterlyEngagement.phases.map((phase) => (
              <div key={phase.id} className="flex items-center gap-1.5">
                {phase.status === "complete" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : phase.status === "active" ? (
                  <Activity className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    phase.status === "active"
                      ? "font-semibold text-foreground"
                      : phase.status === "complete"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                  )}
                >
                  {phase.label}
                </span>
              </div>
            ))}
          </div>

          {/* Days to review */}
          <span className="text-xs font-semibold text-foreground whitespace-nowrap flex-shrink-0">
            {quarterlyEngagement.daysToReview}d to review
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border flex-shrink-0" />

        {/* Center: Engine Health Indicators */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {copilotEngineStatus.map((engine) => (
            <div key={engine.engine} className="flex items-center gap-2">
              <span className="text-muted-foreground">{engineIcon[engine.engine]}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-foreground leading-none">
                  {engine.health}
                </span>
                <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${engine.health}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border flex-shrink-0" />

        {/* Right: Critical Count */}
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
