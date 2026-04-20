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
  useSubmitExposureIndex,
  useRetakeExposureIndex,
  type ExposureIndexRecord,
} from "@/hooks/useProspectExposureIndex";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExposureIndexModalProps {
  open: boolean;
  onClose: () => void;
  prospectId: string;
  prospectName: string;
  /** Pass existing record when retaking */
  existingRecord?: ExposureIndexRecord | null;
}

// Score label for each answer option index (0–3)
const SCORE_LABELS = ["0", "1", "2", "3"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExposureIndexModal({
  open,
  onClose,
  prospectId,
  prospectName,
  existingRecord,
}: ExposureIndexModalProps) {
  // Initialize responses — if retaking, pre-fill with existing answers
  const [responses, setResponses] = useState<Record<string, number[]>>(() => {
    if (existingRecord?.responses) return { ...existingRecord.responses };
    return {};
  });

  const submitMutation = useSubmitExposureIndex(prospectId);
  const retakeMutation = useRetakeExposureIndex(
    prospectId,
    existingRecord?.id ?? ""
  );

  const activeMutation = existingRecord ? retakeMutation : submitMutation;
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
    const category_scores = computeCategoryScores(responses) as Record<
      CategoryId,
      number
    >;
    try {
      await activeMutation.mutateAsync({ responses, category_scores });
      toast.success("Exposure Index completed", {
        description: `Assessment saved for ${prospectName}.`,
      });
      onClose();
    } catch {
      toast.error("Failed to save assessment. Please try again.");
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && !activeMutation.isPending) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  {prospectName} — 6 categories, 18 questions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {answeredCount} of {TOTAL_QUESTIONS} answered
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {EXPOSURE_CATEGORIES.map((cat) => (
            <section key={cat.id} className="space-y-4">
              {/* Category header */}
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {cat.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              {/* Questions */}
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
                              onClick={() =>
                                handleAnswer(cat.id, qIdx, optIdx)
                              }
                              className={cn(
                                "rounded-md border px-2.5 py-2 text-xs text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                                {SCORE_LABELS[optIdx]}
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
              : `${TOTAL_QUESTIONS - answeredCount} question${
                  TOTAL_QUESTIONS - answeredCount === 1 ? "" : "s"
                } remaining`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={activeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || activeMutation.isPending}
            >
              {activeMutation.isPending
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
