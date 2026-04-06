import { Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { engineIcon } from "@/lib/copilotStyles";

const copilotEngineStatus = [
  { engine: "Capital Architecture", health: 72, activeClients: 3, pendingActions: 2, insight: "Entity misalignment detected for 1 client. Tax optimization opportunities identified for 2 clients." },
  { engine: "Customer Capital Defense", health: 58, activeClients: 4, pendingActions: 3, insight: "Revenue concentration risk elevated across 2 clients. Retention durability below benchmark for Atlas." },
  { engine: "Performance & Execution", health: 81, activeClients: 4, pendingActions: 1, insight: "Sprint velocity on track for 3 of 4 engagements. Pinnacle ahead of schedule." },
];

const EngineStatusPanel = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="font-display font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />Engine Status
      </h3>
      <div className="space-y-4">
        {copilotEngineStatus.map((engine) => (
          <div key={engine.engine} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {engineIcon[engine.engine]}
                <span className="text-sm font-medium text-foreground">{engine.engine}</span>
              </div>
              <span className="text-xs font-semibold text-foreground">{engine.health}/100</span>
            </div>
            <Progress value={engine.health} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">{engine.insight}</p>
            <div className="flex gap-3 text-[10px] text-muted-foreground/70">
              <span>{engine.activeClients} clients</span>
              <span>{engine.pendingActions} pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EngineStatusPanel;
