import { useState, useCallback } from "react";
import { Activity } from "lucide-react";
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
  EXPOSURE_CATEGORIES,
  computeCategoryScores,
  countAnswered,
  TOTAL_QUESTIONS,
  type CategoryId,
} from "@/lib/exposureIndexQuestions";
import {
  useSubmitClientExposureIndex,
  type ClientExposureIndexRecord,
} from "@/hooks/useClientExposureIndex";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientExposureIndexModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingRecord?: ClientExposureIndexRecord | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientExposureIndexModal({
  open,
  onClose,
  clientId,
  clientName,
  existingRecord,
}: ClientExposureIndexModalProps) {
  const [responses, setResponses] = useState<Record<string, number[]>>(() => {
    if (existingRecord?.responses) return { ...existingRecord.responses };
    return {};
  });

  const submitMutation = useSubmitClientExposureIndex(clientId);

  const answeredCount = countAnswered(responses);
  const allAnswered = answeredCount === TOTAL_QUESTIONS;
  const progressPct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const handleAnswer = useCallback(
    (categoryId: string, questionIndex: number, score: number) => {
      setResponses((prev) => {
        const current = prev[categoryId] ? [...prev[categoryId]] : [];
        current[questionIndex] = score;
        return { ...prev, [categoryId]: current };
      });
    },
    []
  );

  const handleSubmit = async () => {
    if (!allAnswered) return;
    const category_scores = computeCategoryScores(responses) as Record<CategoryId, number>;
    try {
      await submitMutation.mutateAsync({ responses, category_scores });
      toast.success("Exposure Index completed", {
        description: `Assessment saved for ${clientName}.`,
      });
      onClose();
    } catch {
      toast.error("Failed to save assessment. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitMutation.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">
                  Founder Exposure Index™
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {clientName} — 6 categories, 18 questions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{answeredCount} of {TOTAL_QUESTIONS} answered</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {EXPOSURE_CATEGORIES.map((cat) => (
            <section key={cat.id} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="border-l-2 border-border pl-4 space-y-5">
                {cat.questions.map((q, qIdx) => {
                  const selectedScore = responses[cat.id]?.[qIdx];
                  return (
                    <div key={q.id} className="space-y-2">
                      <p className="text-xs font-medium text-foreground leading-relaxed">
                        {qIdx + 1}. {q.text}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {q.options.map((option, optIdx) => {
                          const isSelected = selectedScore === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleAnswer(cat.id, qIdx, optIdx)}
                              className={cn(
                                "rounded-md border px-2.5 py-2 text-xs text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                                {optIdx}
                              </span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {allAnswered
              ? "All questions answered — ready to submit"
              : `${TOTAL_QUESTIONS - answeredCount} question${TOTAL_QUESTIONS - answeredCount === 1 ? "" : "s"} remaining`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!allAnswered || submitMutation.isPending}>
              {submitMutation.isPending
                ? "Saving..."
                : existingRecord
                ? "Save Retake"
                : "Submit Assessment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
