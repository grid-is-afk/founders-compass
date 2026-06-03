import { useState } from "react";
import { ExternalLink, ScanSearch, Flag, FlagOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/hooks/useClientContext";
import { useUpdateClient } from "@/hooks/useClients";
import { useClientRiskAlerts, useRunRiskScan } from "@/hooks/useRiskAlerts";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

interface DbRiskAlert {
  id: string;
  severity: string;
  title: string;
  detail: string | null;
  client?: string | null;
  source_id?: string | null;
  source_type?: string | null;
}

function resolveAlertUrl(sourceType: string | null, clientId: string): string | null {
  if (sourceType === "task") return `/advisor/clients/${clientId}/discover`;
  return null;
}

const RiskAlertsTab = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawAlerts = [] } = useClientRiskAlerts(selectedClientId);
  const { mutate: runScan, isPending: scanning } = useRunRiskScan(selectedClientId);
  const updateClient = useUpdateClient();
  const navigate = useNavigate();

  // Advisor-flag (UC-11): manual "this engagement needs follow-up" flag. Its
  // presence raises a risk alert on the next scan (server/routes/riskScan.ts).
  const isFlagged = !!selectedClient.flagged_at;
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const handleConfirmFlag = () => {
    updateClient.mutate(
      {
        id: selectedClientId,
        flagged_at: new Date().toISOString(),
        flagged_reason: flagReason.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Engagement flagged for follow-up");
          setFlagDialogOpen(false);
          setFlagReason("");
        },
        onError: () => toast.error("Could not flag — please try again."),
      }
    );
  };

  const handleClearFlag = () => {
    updateClient.mutate(
      { id: selectedClientId, flagged_at: null, flagged_reason: null },
      {
        onSuccess: () => toast.success("Follow-up flag cleared"),
        onError: () => toast.error("Could not clear flag — please try again."),
      }
    );
  };

  const alerts = (rawAlerts as DbRiskAlert[]).map((a) => ({
    id: a.id,
    severity: (a.severity ?? "info") as "critical" | "warning" | "info",
    title: a.title,
    detail: (a.detail ?? "").replace(/^\[auto\]\s*/, ""),
    client: a.client ?? "",
    source_id: a.source_id ?? null,
    source_type: a.source_type ?? null,
  }));

  // Header — flag + re-scan controls, shown whenever a client is selected
  // (so an engagement can be flagged even with zero current alerts).
  const header = selectedClientId ? (
    <div className="flex items-center justify-between gap-2 mb-2">
      {isFlagged ? (
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-orange-700">
          <Flag className="w-3.5 h-3.5 shrink-0 fill-orange-500/20" />
          <span className="truncate">
            Flagged for follow-up
            {selectedClient.flagged_reason ? ` — ${selectedClient.flagged_reason}` : ""}
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/70">
          Continuous drift monitoring
        </span>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {isFlagged ? (
          <button
            onClick={handleClearFlag}
            disabled={updateClient.isPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-orange-500/30 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <FlagOff className="w-3.5 h-3.5" />
            Clear Flag
          </button>
        ) : (
          <button
            onClick={() => setFlagDialogOpen(true)}
            disabled={updateClient.isPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Flag className="w-3.5 h-3.5" />
            Flag for Follow Up
          </button>
        )}
        <button
          onClick={() => runScan()}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          {scanning ? "Scanning..." : "Re-scan"}
        </button>
      </div>
    </div>
  ) : null;

  const flagDialog = (
    <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-semibold">
            Flag {selectedClient.name} for follow-up
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Raises a risk alert so this engagement stays on your radar. Add an
            optional reason.
          </p>
        </DialogHeader>
        <textarea
          value={flagReason}
          onChange={(e) => setFlagReason(e.target.value)}
          placeholder="e.g. Founder went quiet after the last review — needs a personal check-in."
          className="w-full min-h-[80px] resize-y rounded-md border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFlagDialogOpen(false)}
            disabled={updateClient.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleConfirmFlag}
            disabled={updateClient.isPending}
          >
            {updateClient.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Flag className="w-3.5 h-3.5" />
            )}
            Flag for Follow Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (alerts.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-muted-foreground text-center py-4">
          {selectedClientId
            ? "No risk alerts for this client."
            : "Select a client in the list above to view their risk alerts."}
        </p>
        {flagDialog}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      {alerts.map((alert) => {
        const href = resolveAlertUrl(alert.source_type, selectedClientId);
        const isClickable = !!href;

        return (
          <div
            key={alert.id}
            onClick={isClickable ? () => navigate(href!) : undefined}
            className={cn(
              "p-3 rounded-md border",
              severityStyle[alert.severity],
              isClickable && "cursor-pointer hover:brightness-95 transition-[filter]"
            )}
          >
            <div className="flex items-start gap-2.5">
              {severityIcon[alert.severity]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                {alert.client && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{alert.client}</p>
                )}
              </div>
              {isClickable && (
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50 mt-0.5" />
              )}
            </div>
          </div>
        );
      })}
      {flagDialog}
    </div>
  );
};

export default RiskAlertsTab;
