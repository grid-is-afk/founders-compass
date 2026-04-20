import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SixCsModal, SIX_CS, MAX_SIX_CS_SCORE } from "./SixCsModal";
import type { SixCsSummary } from "@/hooks/useProspectSixCs";
import type { Prospect } from "@/lib/types/journey";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreDotClass(score: number): string {
  if (score >= 3) return "bg-emerald-500";
  if (score >= 2) return "bg-amber-400";
  if (score >= 1) return "bg-orange-400";
  return "bg-destructive";
}

function overallRating(total: number): { label: string; color: string } {
  const pct = total / MAX_SIX_CS_SCORE;
  if (pct >= 0.75) return { label: "Strong", color: "text-emerald-700" };
  if (pct >= 0.5) return { label: "Adequate", color: "text-amber-700" };
  if (pct >= 0.25) return { label: "Weak", color: "text-orange-700" };
  return { label: "Underdeveloped", color: "text-destructive" };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SixCsStripProps {
  prospect: Prospect;
  record: SixCsSummary | null | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SixCsStrip({ prospect, record }: SixCsStripProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!record) {
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
          <BarChart3 className="w-3.5 h-3.5" />
          Run Six C's
        </Button>

        {modalOpen && (
          <SixCsModal
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

  const scores = record.scores;
  const rating = overallRating(record.total_score);

  return (
    <>
      <div
        className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Six C's
          </span>
          <span className={cn("text-[10px] font-semibold", rating.color)}>
            {record.total_score}/{MAX_SIX_CS_SCORE} · {rating.label}
          </span>
        </div>

        {/* Score grid — 3 columns, 2 rows */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {SIX_CS.map((c) => {
            const score = scores[c.id] ?? 0;
            return (
              <div key={c.id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    scoreDotClass(score)
                  )}
                />
                <span className="text-[10px] text-muted-foreground truncate">
                  {c.label}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground ml-auto">
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Retake link */}
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => setModalOpen(true)}
        >
          Retake Assessment
        </button>
      </div>

      {modalOpen && (
        <SixCsModal
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
