import { useState, useCallback } from "react";
import { BarChart3 } from "lucide-react";
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
import { useUpsertSixCs, type SixCsRecord } from "@/hooks/useProspectSixCs";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Framework definition
// ---------------------------------------------------------------------------

export const SIX_CS = [
  {
    id: "challenge",
    label: "Challenge",
    question: "Can the founder clearly articulate the problem and its scale?",
    description:
      "The founder establishes immediate recognition of the opportunity by naming the problem, who experiences it, and what it costs.",
  },
  {
    id: "champion",
    label: "Champion",
    question:
      "Do they present a differentiated solution and a credible team?",
    description:
      "The solution is clearly differentiated, and the team demonstrates the domain expertise and track record to execute.",
  },
  {
    id: "change",
    label: "Change",
    question:
      "Can they quantify the upside for customers, market, and investor?",
    description:
      "The founder places the investor inside a clear outcome — showing what improves for each stakeholder and why now.",
  },
  {
    id: "credibility",
    label: "Credibility",
    question: "Is there third-party evidence validating their claims?",
    description:
      "Independent validation (pilots, LOIs, data, partners) reduces perceived risk and backs up the opportunity.",
  },
  {
    id: "call_to_action",
    label: "Call to Action",
    question: "Is there a specific, time-bound ask defined?",
    description:
      "Capital amount, valuation, timeline, and the exact next step are stated plainly with no ambiguity.",
  },
  {
    id: "connection",
    label: "Connection",
    question: "Does the story align with the right investor's recognition?",
    description:
      "The investor sees themselves in the opportunity — not sold to, but found. Alignment converts to commitment.",
  },
] as const;

export type SixCId = (typeof SIX_CS)[number]["id"];

const RATING_OPTIONS = [
  { label: "Not Addressed", score: 0 },
  { label: "Weak", score: 1 },
  { label: "Adequate", score: 2 },
  { label: "Strong", score: 3 },
] as const;

export const TOTAL_SIX_CS = SIX_CS.length; // 6
export const MAX_SIX_CS_SCORE = TOTAL_SIX_CS * 3; // 18

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SixCsModalProps {
  open: boolean;
  onClose: () => void;
  prospectId: string;
  prospectName: string;
  existingRecord?: SixCsRecord | null;
}

export function SixCsModal({
  open,
  onClose,
  prospectId,
  prospectName,
  existingRecord,
}: SixCsModalProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (existingRecord?.scores) return { ...existingRecord.scores };
    return {};
  });

  const upsertMutation = useUpsertSixCs(prospectId);

  const answeredCount = Object.keys(scores).length;
  const allAnswered = answeredCount === TOTAL_SIX_CS;
  const progressPct = Math.round((answeredCount / TOTAL_SIX_CS) * 100);
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

  const handleScore = useCallback((cId: string, score: number) => {
    setScores((prev) => ({ ...prev, [cId]: score }));
  }, []);

  const handleSubmit = async () => {
    if (!allAnswered) return;
    try {
      await upsertMutation.mutateAsync({ scores, total_score: totalScore });
      toast.success("Six C's assessment saved", {
        description: `Assessment saved for ${prospectName}. Total: ${totalScore}/${MAX_SIX_CS_SCORE}`,
      });
      onClose();
    } catch {
      toast.error("Failed to save assessment. Please try again.");
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && !upsertMutation.isPending) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">
                  Six C's Framework™
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {prospectName} — Rate the founder's capital communication across 6 dimensions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {answeredCount} of {TOTAL_SIX_CS} rated
              </span>
              <span>
                {allAnswered
                  ? `Total: ${totalScore}/${MAX_SIX_CS_SCORE}`
                  : `${progressPct}%`}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {SIX_CS.map((c, idx) => {
            const selected = scores[c.id];
            const isRated = selected !== undefined;

            return (
              <section key={c.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {c.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {c.description}
                    </p>
                    <p className="text-xs font-medium text-foreground mt-2">
                      {c.question}
                    </p>
                  </div>
                </div>

                <div className="ml-9 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {RATING_OPTIONS.map(({ label, score }) => {
                    const isSelected = isRated && selected === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleScore(c.id, score)}
                        className={cn(
                          "rounded-md border px-2.5 py-2.5 text-xs text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                          {score}/3
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {allAnswered
              ? `Score: ${totalScore}/${MAX_SIX_CS_SCORE} — ready to save`
              : `${TOTAL_SIX_CS - answeredCount} dimension${
                  TOTAL_SIX_CS - answeredCount === 1 ? "" : "s"
                } remaining`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={upsertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || upsertMutation.isPending}
            >
              {upsertMutation.isPending
                ? "Saving..."
                : existingRecord
                ? "Save Retake"
                : "Save Assessment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
