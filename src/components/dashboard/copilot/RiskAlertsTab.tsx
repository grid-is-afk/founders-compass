import { ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts, useRunRiskScan } from "@/hooks/useRiskAlerts";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

const RiskAlertsTab = () => {
  const { selectedClientId } = useClientContext();
  const { data: rawAlerts = [] } = useClientRiskAlerts(selectedClientId);
  const { mutate: runScan, isPending: scanning } = useRunRiskScan(selectedClientId);

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
    detail: (a.detail ?? "").replace(/^\[auto\]\s*/, ""),
    client: a.client ?? "",
  }));

  if (alerts.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          {selectedClientId
            ? "No risk alerts for this client."
            : "Select a client in the list above to view their risk alerts."}
        </p>
        {selectedClientId && (
          <button
            onClick={() => runScan()}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <ScanSearch className="w-4 h-4" />
            {scanning ? "Scanning..." : "Scan Now"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedClientId && (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => runScan()}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <ScanSearch className="w-3.5 h-3.5" />
            {scanning ? "Scanning..." : "Re-scan"}
          </button>
        </div>
      )}
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
