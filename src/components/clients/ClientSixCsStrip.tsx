import { BarChart3, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SIX_CS, MAX_SIX_CS_SCORE } from "@/components/prospects/SixCsModal";
import type { ClientSixCsBaselineResult } from "@/hooks/useClientSixCsBaseline";

// ---------------------------------------------------------------------------
// Helpers (mirrored from SixCsStrip)
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

interface ClientSixCsStripProps {
  baseline: ClientSixCsBaselineResult | null | undefined;
  isLoading: boolean;
  onRetake?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientSixCsStrip({ baseline, isLoading, onRetake }: ClientSixCsStripProps) {
  if (isLoading) {
    return <div className="h-9 rounded-md bg-muted/30 animate-pulse" />;
  }

  if (!baseline?.has_baseline || !baseline.six_cs) {
    return (
      <div className="w-full rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
        <span className="text-[11px] text-muted-foreground">
          No Six C's baseline — run Six C's assessment in the Prospect phase first.
        </span>
      </div>
    );
  }

  const { scores, total_score } = baseline.six_cs;
  const rating = overallRating(total_score);
  const fromProspect = !!baseline.six_cs.prospect_id;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Six C's Baseline
            </span>
            {fromProspect && (
              <span className="text-[10px] text-muted-foreground/50 ml-0.5">(prospect)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-semibold", rating.color)}>
              {total_score}/{MAX_SIX_CS_SCORE} · {rating.label}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="start" side="bottom">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Six C's Baseline
          </span>
          <span className={cn("text-[10px] font-semibold", rating.color)}>
            {total_score}/{MAX_SIX_CS_SCORE} · {rating.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {SIX_CS.map((c) => {
            const score = scores[c.id] ?? 0;
            return (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", scoreDotClass(score))} />
                <span className="text-[10px] text-muted-foreground truncate">{c.label}</span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground ml-auto">
                  {score}
                </span>
              </div>
            );
          })}
        </div>
        {fromProspect && (
          <p className="text-[10px] text-muted-foreground/60 italic">
            Carried over from prospect assessment.
          </p>
        )}
        {onRetake && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            onClick={onRetake}
          >
            <RefreshCw className="w-3 h-3" />
            Retake Assessment
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
