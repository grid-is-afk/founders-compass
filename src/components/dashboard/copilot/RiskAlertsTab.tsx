import { cn } from "@/lib/utils";
import { copilotRiskAlerts } from "@/lib/mockData";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

const RiskAlertsTab = () => {
  return (
    <div className="space-y-2">
      {copilotRiskAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn("p-3 rounded-md border", severityStyle[alert.severity])}
        >
          <div className="flex items-start gap-2.5">
            {severityIcon[alert.severity]}
            <div>
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{alert.client}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskAlertsTab;
