import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

const RiskAlertsTab = () => {
  const { selectedClientId } = useClientContext();
  const { data: rawAlerts = [] } = useClientRiskAlerts(selectedClientId);

  interface DbRiskAlert {
    id: string;
    severity: string;
    title: string;
    detail: string | null;
    client?: string | null;
  }

  const alerts = (rawAlerts as DbRiskAlert[]).map((a) => ({
    id: a.id,
    severity: (a.severity ?? "info") as "critical" | "warning" | "info",
    title: a.title,
    detail: a.detail ?? "",
    client: a.client ?? "",
  }));

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No risk alerts for this client.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn("p-3 rounded-md border", severityStyle[alert.severity])}
        >
          <div className="flex items-start gap-2.5">
            {severityIcon[alert.severity]}
            <div>
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              {alert.client && (
                <p className="text-[10px] text-muted-foreground/70 mt-1">{alert.client}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskAlertsTab;
