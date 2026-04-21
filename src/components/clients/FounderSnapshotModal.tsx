import { useState, useCallback } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useSubmitClientFounderSnapshot,
  type SnapshotSignal,
  type SnapshotDimensionResponse,
} from "@/hooks/useClientFounderSnapshot";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Dimension definitions
// ---------------------------------------------------------------------------

export interface SnapshotDimension {
  id: string;
  label: string;
  description: string;
}

export const SNAPSHOT_DIMENSIONS: SnapshotDimension[] = [
  {
    id: "clarity",
    label: "Clarity of Problem & Solution",
    description:
      "Does the founder have a crisp, validated understanding of the problem they solve and the solution they offer?",
  },
  {
    id: "strategy_capital",
    label: "Strategy & Capital Alignment",
    description:
      "Is the current capital structure aligned with the long-term strategic direction of the business?",
  },
  {
    id: "structural_integrity",
    label: "Structural Integrity",
    description:
      "Are operations and governance structured to function consistently without relying on the founder?",
  },
  {
    id: "decision_distribution",
    label: "Decision-Making Distribution",
    description:
      "Is decision-making authority distributed across the leadership team, or concentrated in the founder?",
  },
  {
    id: "risk_visibility",
    label: "Risk & Exposure Visibility",
    description:
      "Does the founder have clear, current visibility into personal, legal, financial, and operational risks?",
  },
];

const SIGNAL_OPTIONS: { value: SnapshotSignal; label: string; colorClass: string }[] = [
  { value: "strong", label: "Strong", colorClass: "border-emerald-500 bg-emerald-500/10 text-emerald-700" },
  { value: "weakening", label: "Weakening", colorClass: "border-amber-400 bg-amber-400/10 text-amber-700" },
  { value: "urgent", label: "Urgent", colorClass: "border-destructive bg-destructive/10 text-destructive" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderSnapshotModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingResponses?: Record<string, SnapshotDimensionResponse>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderSnapshotModal({
  open,
  onClose,
  clientId,
  clientName,
  existingResponses,
}: FounderSnapshotModalProps) {
  const [responses, setResponses] = useState<Record<string, SnapshotDimensionResponse>>(
    existingResponses ?? {}
  );

  const submitMutation = useSubmitClientFounderSnapshot(clientId);

  // FIX-14: Only count a dimension as assessed if it has an explicit signal value.
  // Previously, typing notes auto-assigned "strong" and inflated the progress count.
  const answeredCount = SNAPSHOT_DIMENSIONS.filter(
    (d) => responses[d.id]?.signal != null
  ).length;
  const totalDimensions = SNAPSHOT_DIMENSIONS.length;
  const allAnswered = answeredCount === totalDimensions;
  const progressPct = Math.round((answeredCount / totalDimensions) * 100);

  const handleSignal = useCallback((dimensionId: string, signal: SnapshotSignal) => {
    setResponses((prev) => ({
      ...prev,
      [dimensionId]: { ...prev[dimensionId], signal },
    }));
  }, []);

  // FIX-14: Only update notes — do not touch or default the signal value.
  // The signal must be explicitly chosen by the advisor via handleSignal.
  const handleNotes = useCallback((dimensionId: string, notes: string) => {
    setResponses((prev) => ({
      ...prev,
      [dimensionId]: { ...prev[dimensionId], notes },
    }));
  }, []);

  const handleSubmit = async () => {
    if (!allAnswered) return;
    try {
      await submitMutation.mutateAsync({ responses });
      toast.success("Founder Snapshot saved", {
        description: `Snapshot recorded for ${clientName}.`,
      });
      onClose();
    } catch {
      toast.error("Failed to save snapshot. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitMutation.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">Founder Snapshot™</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {clientName} — 5 signal dimensions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{answeredCount} of {totalDimensions} assessed</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {SNAPSHOT_DIMENSIONS.map((dim, idx) => {
            const current = responses[dim.id];
            return (
              <section key={dim.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{dim.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {dim.description}
                    </p>
                  </div>
                </div>

                {/* Signal selector */}
                <div className="ml-9 grid grid-cols-3 gap-1.5">
                  {SIGNAL_OPTIONS.map(({ value, label, colorClass }) => {
                    const isSelected = current?.signal === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSignal(dim.id, value)}
                        className={cn(
                          "rounded-md border px-3 py-2.5 text-xs font-medium text-center transition-colors",
                          isSelected ? colorClass : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Notes */}
                <div className="ml-9">
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Optional notes for this dimension..."
                    rows={2}
                    value={current?.notes ?? ""}
                    onChange={(e) => handleNotes(dim.id, e.target.value)}
                  />
                </div>
              </section>
            );
          })}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {allAnswered
              ? "All dimensions assessed — ready to save"
              : `${totalDimensions - answeredCount} dimension${totalDimensions - answeredCount === 1 ? "" : "s"} remaining`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!allAnswered || submitMutation.isPending}>
              {submitMutation.isPending
                ? "Saving..."
                : existingResponses
                ? "Update Snapshot"
                : "Save Snapshot"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
