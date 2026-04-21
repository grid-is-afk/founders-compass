import { useState, useCallback } from "react";
import { Unlock } from "lucide-react";
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
  useSubmitClientOptionalityFramework,
  type OptionalityConditionResponse,
} from "@/hooks/useClientOptionalityFramework";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Conditions definition
// ---------------------------------------------------------------------------

export interface OptionalityCondition {
  id: string;
  label: string;
  description: string;
}

export const OPTIONALITY_CONDITIONS: OptionalityCondition[] = [
  {
    id: "transferability",
    label: "Transferability",
    description:
      "Can the business operate without the founder as the central point? Is the business's value transferable independent of the founder's personal involvement?",
  },
  {
    id: "structural_independence",
    label: "Structural Independence",
    description:
      "Do governance structures, documented systems, and operational processes function without requiring constant founder intervention or approval?",
  },
  {
    id: "capital_freedom",
    label: "Capital Freedom",
    description:
      "Does the current capital structure preserve the founder's timing, control, and flexibility — or does it create obligations that constrain strategic choice?",
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderOptionalityModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingResponses?: Record<string, OptionalityConditionResponse>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderOptionalityModal({
  open,
  onClose,
  clientId,
  clientName,
  existingResponses,
}: FounderOptionalityModalProps) {
  const [responses, setResponses] = useState<Record<string, OptionalityConditionResponse>>(
    existingResponses ?? {}
  );

  const submitMutation = useSubmitClientOptionalityFramework(clientId);

  const answeredCount = Object.keys(responses).filter(
    (k) => responses[k].status !== undefined
  ).length;
  const totalConditions = OPTIONALITY_CONDITIONS.length;
  const allAnswered = answeredCount === totalConditions;
  const progressPct = Math.round((answeredCount / totalConditions) * 100);

  const handleStatus = useCallback((conditionId: string, status: "yes" | "no") => {
    setResponses((prev) => ({
      ...prev,
      [conditionId]: { ...prev[conditionId], status, notes: prev[conditionId]?.notes ?? "" },
    }));
  }, []);

  const handleNotes = useCallback((conditionId: string, notes: string) => {
    setResponses((prev) => ({
      ...prev,
      [conditionId]: { ...(prev[conditionId] ?? { status: "no" }), notes },
    }));
  }, []);

  const handleSubmit = async () => {
    if (!allAnswered) return;
    try {
      await submitMutation.mutateAsync({ responses });
      toast.success("Optionality Framework saved", {
        description: `Assessment completed for ${clientName}.`,
      });
      onClose();
    } catch {
      toast.error("Failed to save assessment. Please try again.");
    }
  };

  const metCount = Object.values(responses).filter((r) => r.status === "yes").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitMutation.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">
                  Founder's Optionality Framework™
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {clientName} — 3 conditions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{answeredCount} of {totalConditions} assessed</span>
              {allAnswered && (
                <span className="font-semibold text-foreground">{metCount}/{totalConditions} conditions met</span>
              )}
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {OPTIONALITY_CONDITIONS.map((condition, idx) => {
            const current = responses[condition.id];
            return (
              <section key={condition.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{condition.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {condition.description}
                    </p>
                  </div>
                </div>

                {/* Yes / No toggle */}
                <div className="ml-9 grid grid-cols-2 gap-1.5">
                  {(["yes", "no"] as const).map((opt) => {
                    const isSelected = current?.status === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleStatus(condition.id, opt)}
                        className={cn(
                          "rounded-md border px-3 py-2.5 text-xs font-semibold text-center transition-colors",
                          isSelected && opt === "yes"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                            : isSelected && opt === "no"
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {opt === "yes" ? "Yes" : "No"}
                      </button>
                    );
                  })}
                </div>

                {/* Notes */}
                <div className="ml-9">
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Optional notes..."
                    rows={2}
                    value={current?.notes ?? ""}
                    onChange={(e) => handleNotes(condition.id, e.target.value)}
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
              ? `${metCount}/${totalConditions} conditions met — ready to save`
              : `${totalConditions - answeredCount} condition${totalConditions - answeredCount === 1 ? "" : "s"} remaining`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!allAnswered || submitMutation.isPending}>
              {submitMutation.isPending ? "Saving..." : existingResponses ? "Update" : "Save Assessment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
