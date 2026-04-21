import { useState } from "react";
import { Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExposureIndexStrip } from "./ExposureIndexStrip";
import { SixCsStrip } from "./SixCsStrip";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import { buildExposureIndexPrompt, buildSixCsPrompt } from "@/lib/quarterbackPrompts";
import type { ExposureIndexSummary } from "@/hooks/useProspectExposureIndex";
import type { SixCsSummary } from "@/hooks/useProspectSixCs";
import type { Prospect } from "@/lib/types/journey";
import type { CategoryId } from "@/lib/exposureIndexQuestions";

interface ProspectAssessmentBlockProps {
  prospect: Prospect;
  exposureSummary: ExposureIndexSummary | null | undefined;
  sixCsRecord: SixCsSummary | null | undefined;
}

type AssessmentChoice = "exposure" | "sixcs";

export function ProspectAssessmentBlock({
  prospect,
  exposureSummary,
  sixCsRecord,
}: ProspectAssessmentBlockProps) {
  const [choosing, setChoosing] = useState(false);
  const { setIsOpen: setCopilotOpen, sendMessage, isStreaming } = useCopilotContext();

  const hasExposure = !!(exposureSummary?.category_scores);
  const hasSixCs = !!(sixCsRecord?.scores);
  const hasAny = hasExposure || hasSixCs;

  const sendPrompt = (choice: AssessmentChoice) => {
    if (isStreaming) {
      toast.info("Quarterback is busy — please wait a moment");
      return;
    }
    let prompt = "";
    if (choice === "exposure" && exposureSummary?.category_scores) {
      prompt = buildExposureIndexPrompt(
        prospect.name,
        exposureSummary.category_scores as Record<CategoryId, number>
      );
    } else if (choice === "sixcs" && sixCsRecord) {
      prompt = buildSixCsPrompt(
        prospect.name,
        sixCsRecord.scores,
        sixCsRecord.total_score
      );
    }
    if (!prompt) return;
    setCopilotOpen(true);
    setChoosing(false);
    setTimeout(() => sendMessage(prompt), 80);
  };

  const handleAskQuarterback = () => {
    if (!hasAny) return;
    // If only one assessment is available, skip the selector and send directly
    if (hasExposure && !hasSixCs) {
      sendPrompt("exposure");
      return;
    }
    if (hasSixCs && !hasExposure) {
      sendPrompt("sixcs");
      return;
    }
    // Both available — show selector
    setChoosing(true);
  };

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <ExposureIndexStrip prospect={prospect} summary={exposureSummary} />

      <Button
        variant="outline"
        size="sm"
        disabled
        className="w-full h-8 text-xs gap-1.5 opacity-50 cursor-not-allowed"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Why.OS — Coming Soon
      </Button>

      <SixCsStrip prospect={prospect} record={sixCsRecord} />

      {hasAny && !choosing && (
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90 border-0"
          onClick={handleAskQuarterback}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask Quarterback
        </Button>
      )}

      {choosing && (
        <div className="rounded-md border border-amber-400/40 bg-amber-50/10 px-3 py-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            Which result do you want to discuss?
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {hasExposure && (
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground font-medium"
                onClick={() => sendPrompt("exposure")}
              >
                Exposure Index
              </button>
            )}
            {hasSixCs && (
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground font-medium"
                onClick={() => sendPrompt("sixcs")}
              >
                Six C's
              </button>
            )}
            <button
              type="button"
              disabled
              className="text-[10px] px-2 py-1 rounded-md border border-border/40 bg-muted/10 text-muted-foreground/50 font-medium cursor-not-allowed"
            >
              Why.OS — Soon
            </button>
            <button
              type="button"
              className="text-[10px] px-2 py-1 rounded-md border border-border/40 text-muted-foreground hover:text-foreground font-medium ml-auto"
              onClick={() => setChoosing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
