import { Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { engineIcon } from "@/lib/copilotStyles";
import { useDashboardData } from "@/hooks/useDashboard";

const ENGINE_KEYS = [
  { key: "avg_capital_readiness", label: "Capital Architecture" },
  { key: "avg_customer_capital", label: "Customer Capital Defense" },
  { key: "avg_performance_score", label: "Performance & Execution" },
] as const;

const EngineStatusPanel = () => {
  const { data: dashboardData, isLoading } = useDashboardData();
  const avgScores = (dashboardData as any)?.averageScores ?? {};

  const engineStatus = ENGINE_KEYS.map(({ key, label }) => ({
    label,
    health: Math.round(avgScores[key] ?? 0),
  }));

  const hasData = engineStatus.some((e) => e.health > 0);

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="font-display font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />Engine Status
      </h3>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-muted-foreground">Loading engine data...</div>
      ) : !hasData ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No engine data yet. Add clients to see health scores.
        </div>
      ) : (
        <div className="space-y-4">
          {engineStatus.map((engine) => (
            <div key={engine.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {engineIcon[engine.label]}
                  <span className="text-sm font-medium text-foreground">{engine.label}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">{engine.health}/100</span>
              </div>
              <Progress value={engine.health} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EngineStatusPanel;
