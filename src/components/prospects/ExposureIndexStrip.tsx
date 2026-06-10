import { useState } from "react";
import { Activity, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  EXPOSURE_CATEGORIES,
  CATEGORY_SHORT_LABELS,
  exposureLevel,
  type CategoryId,
} from "@/lib/exposureIndexQuestions";
import type { ExposureIndexSummary } from "@/hooks/useProspectExposureIndex";
import { ExposureIndexModal } from "./ExposureIndexModal";
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

function overallExposureLevel(scores: Record<string, number>): {
  label: string;
  color: string;
} {
  const total = EXPOSURE_CATEGORIES.reduce(
    (sum, cat) => sum + (scores[cat.id as CategoryId] ?? 0),
    0
  );
  const max = EXPOSURE_CATEGORIES.length * 9;
  const pct = total / max;
  if (pct >= 0.65) return { label: "High Exposure", color: "text-destructive" };
  if (pct >= 0.33) return { label: "Medium Exposure", color: "text-amber-700" };
  return { label: "Low Exposure", color: "text-emerald-700" };
}

function totalExposureScore(scores: Record<string, number>): number {
  return EXPOSURE_CATEGORIES.reduce(
    (sum, cat) => sum + (scores[cat.id as CategoryId] ?? 0),
    0
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExposureIndexStripProps {
  prospect: Prospect;
  summary: ExposureIndexSummary | null | undefined;
  /** HubSpot-synced result page (Founder Readiness = Exposure Index). When set
   *  and there's no internal record, the strip links to it instead of "Run". */
  syncedUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExposureIndexStrip({ prospect, summary, syncedUrl }: ExposureIndexStripProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!summary) {
    // Synced result exists (from HubSpot) but no internal record — link out to
    // the result page rather than offering to re-run the same assessment.
    if (syncedUrl) {
      return (
        <a
          href={syncedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border/60 bg-muted/20 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          View Exposure Index Result
          <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
        </a>
      );
    }
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

  if (!summary.category_scores) return null;
  const scores = summary.category_scores as Record<CategoryId, number>;
  const total = totalExposureScore(scores);
  const max = EXPOSURE_CATEGORIES.length * 9;
  const overall = overallExposureLevel(scores);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Founder Exposure Index™
            </span>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[10px] font-semibold", overall.color)}>
                {total}/{max} · {overall.label}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3 space-y-2"
          align="start"
          side="right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Founder Exposure Index™
            </span>
            <span className={cn("text-[10px] font-semibold", overall.color)}>
              {total}/{max} · {overall.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            {EXPOSURE_CATEGORIES.map((cat) => {
              const score = scores[cat.id as CategoryId] ?? 0;
              return (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <span
                    className={cn("w-2 h-2 rounded-full flex-shrink-0", exposureDotClass(score))}
                  />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {CATEGORY_SHORT_LABELS[cat.id as CategoryId]}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-foreground ml-auto">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => setModalOpen(true)}
          >
            Retake Assessment
          </button>
        </PopoverContent>
      </Popover>

      {modalOpen && (
        <ExposureIndexModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          prospectId={prospect.id}
          prospectName={prospect.name}
          existingRecord={summary}
        />
      )}
    </>
  );
}
