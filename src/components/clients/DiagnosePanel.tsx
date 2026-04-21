import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClientExposureIndexStrip } from "./ClientExposureIndexStrip";
import { FounderMatrixStrip } from "./FounderMatrixStrip";
import { FounderSnapshotStrip } from "./FounderSnapshotStrip";
import { useClientExposureIndex } from "@/hooks/useClientExposureIndex";
import { useClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { useClientFounderSnapshot } from "@/hooks/useClientFounderSnapshot";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiagnosePanelProps {
  clientId: string;
  clientName: string;
  entityType: "corp" | "llc" | null;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiagnosePanel({
  clientId,
  clientName,
  entityType,
  nextPhase,
  onPhaseComplete,
}: DiagnosePanelProps) {
  const { data: exposureRecord, isLoading: exposureLoading } = useClientExposureIndex(clientId);
  const { data: matrixRecord, isLoading: matrixLoading } = useClientFounderMatrix(clientId);
  const { data: snapshotRecord, isLoading: snapshotLoading } = useClientFounderSnapshot(clientId);
  const updateClient = useUpdateClient();

  const allComplete =
    !!(exposureRecord?.category_scores) &&
    !!(matrixRecord?.completed_at) &&
    !!(snapshotRecord?.completed_at);

  const handleMarkComplete = async () => {
    if (!allComplete || !nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      toast.success("Diagnose phase complete", { description: "Moving to Design TFO phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const isLoading = exposureLoading || matrixLoading || snapshotLoading;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Diagnose</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Run all three diagnostic assessments to map the founder's current exposure and structure.
        </p>
      </div>

      {/* Assessment strips */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-md bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <ClientExposureIndexStrip
            clientId={clientId}
            clientName={clientName}
            record={exposureRecord ?? null}
          />
          <FounderMatrixStrip
            clientId={clientId}
            clientName={clientName}
            entityType={entityType}
            record={matrixRecord ?? null}
          />
          <FounderSnapshotStrip
            clientId={clientId}
            clientName={clientName}
            record={snapshotRecord ?? null}
          />
        </div>
      )}

      {/* Phase completion — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allComplete
              ? "All diagnoses complete — ready to advance."
              : "Complete all 3 assessments to advance."}
          </p>
          <Button
            size="sm"
            disabled={!allComplete || updateClient.isPending}
            onClick={handleMarkComplete}
            className="gap-1.5"
          >
            {updateClient.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Mark Phase Complete <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
