import { useState } from "react";
import { Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EXPOSURE_CATEGORIES,
  CATEGORY_SHORT_LABELS,
  exposureLevel,
  buildAskQuarterbackPrompt,
  type CategoryId,
} from "@/lib/exposureIndexQuestions";
import type { ExposureIndexSummary } from "@/hooks/useProspectExposureIndex";
import { ExposureIndexModal } from "./ExposureIndexModal";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import type { Prospect } from "@/lib/types/journey";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exposureDotClass(score: number): string {
  const level = exposureLevel(score);
  if (level === "Low") return "bg-emerald-500";
  if (level === "Medium") return "bg-amber-400";
  return "bg-destructive";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExposureIndexStripProps {
  prospect: Prospect;
  /** Summary record from the bulk map — undefined means not yet loaded, null means not taken */
  summary: ExposureIndexSummary | null | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExposureIndexStrip({
  prospect,
  summary,
}: ExposureIndexStripProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { setIsOpen: setCopilotOpen, sendMessage, isStreaming } = useCopilotContext();

  const handleAskQuarterback = () => {
    if (!summary?.category_scores) return;
    if (isStreaming) {
      toast.info("Quarterback is busy — please wait a moment");
      return;
    }
    const prompt = buildAskQuarterbackPrompt(
      prospect.name,
      summary.category_scores as Record<CategoryId, number>
    );
    setCopilotOpen(true);
    setTimeout(() => sendMessage(prompt), 80);
  };

  // Not yet taken
  if (!summary) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-border gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            setModalOpen(true);
          }}
        >
          <Activity className="w-3.5 h-3.5" />
          Run Exposure Index
        </Button>

        {modalOpen && (
          <ExposureIndexModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            prospectId={prospect.id}
            prospectName={prospect.name}
            existingRecord={null}
          />
        )}
      </>
    );
  }

  // Assessment taken — show score strip
  if (!summary.category_scores) return null;
  const scores = summary.category_scores as Record<CategoryId, number>;

  return (
    <>
      <div
        className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Category score grid */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {EXPOSURE_CATEGORIES.map((cat) => {
            const score = scores[cat.id] ?? 0;
            return (
              <div key={cat.id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    exposureDotClass(score)
                  )}
                />
                <span className="text-[10px] text-muted-foreground truncate">
                  {CATEGORY_SHORT_LABELS[cat.id]}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground ml-auto">
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ask Quarterback */}
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90 border-0"
          onClick={handleAskQuarterback}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask Quarterback
        </Button>
      </div>

    </>
  );
}
