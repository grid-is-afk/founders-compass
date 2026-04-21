import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Q1PhaseId } from "./PhaseTracker";
import { Star } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhaseConfigRow {
  phase: Q1PhaseId;
  day_start: number;
  day_end: number;
  label: string;
}

interface Q1TimelineChartProps {
  onboardedAt: string | null;
  activePhase: Q1PhaseId;
  hasProspectHistory?: boolean;
}

// ---------------------------------------------------------------------------
// Phase color bands
// ---------------------------------------------------------------------------

const PHASE_COLORS: Record<string, string> = {
  kickoff: "bg-primary/20",
  prove: "bg-amber-400/20",
  diagnose: "bg-blue-400/20",
  design_tfo: "bg-violet-400/20",
  design_outside: "bg-emerald-400/20",
  review: "bg-rose-400/20",
};

const PHASE_ACTIVE_COLORS: Record<string, string> = {
  kickoff: "bg-primary/50",
  prove: "bg-amber-400/60",
  diagnose: "bg-blue-400/60",
  design_tfo: "bg-violet-400/60",
  design_outside: "bg-emerald-400/60",
  review: "bg-rose-400/60",
};

// ---------------------------------------------------------------------------
// Prospect history stage labels (static — no per-stage dates needed)
// ---------------------------------------------------------------------------

const PROSPECT_STAGES = ["Intake", "Fit Assessment", "Discovery", "Onboarding"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Q1TimelineChart({ onboardedAt, activePhase, hasProspectHistory = false }: Q1TimelineChartProps) {
  const { data: phaseConfig, isLoading } = useQuery<PhaseConfigRow[]>({
    queryKey: ["q1-phase-config"],
    queryFn: () => api.get("/q1-phase-config"),
    staleTime: Infinity, // FIX-16: Phase config is completely static — never refetch.
  });

  if (!onboardedAt) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Set start date above to see timeline.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Set an onboarding date to enable the Q1 Gantt chart.
        </p>
      </div>
    );
  }

  if (isLoading || !phaseConfig) {
    return <div className="h-24 rounded-lg bg-muted/30 animate-pulse" />;
  }

  const enrolledLabel = new Date(onboardedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const startMs = new Date(onboardedAt).getTime();
  const totalDays = 90;
  const dayMs = 24 * 60 * 60 * 1000;
  const currentDay = Math.max(
    1,
    Math.min(totalDays, Math.ceil((Date.now() - startMs) / dayMs))
  );
  const currentDayPct = ((currentDay - 1) / (totalDays - 1)) * 100;

  return (
    <div className="space-y-3 select-none">
      {/* Prospect history strip — shown when client came from a prospect */}
      {hasProspectHistory && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/50 px-0.5">
            Prospect History
          </p>
          <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-border/40 bg-muted/10">
            {PROSPECT_STAGES.map((stage) => (
              <div
                key={stage}
                className="flex-1 flex items-center justify-center h-8 text-[10px] font-medium text-muted-foreground/60 border-r border-border/30 last:border-r-0 bg-muted/20"
              >
                {stage}
              </div>
            ))}
            {/* Enrolled marker */}
            <div className="flex items-center gap-1 px-3 h-8 bg-emerald-500/10 border-l border-emerald-500/20 text-[10px] font-semibold text-emerald-700 whitespace-nowrap flex-shrink-0">
              <Star className="w-3 h-3 fill-current" />
              Enrolled {enrolledLabel}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
        <span>Day 1</span>
        <span className="font-semibold text-foreground">
          Day {currentDay} of {totalDays}
        </span>
        <span>Day {totalDays}</span>
      </div>

      {/* Chart body */}
      <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/10">
        {/* Phase rows */}
        <div className="divide-y divide-border/40">
          {phaseConfig.map((phase) => {
            const leftPct = ((phase.day_start - 1) / (totalDays - 1)) * 100;
            const widthPct =
              ((phase.day_end - phase.day_start + 1) / totalDays) * 100;
            const isActive = phase.phase === activePhase;

            return (
              <div key={phase.phase} className="flex items-center h-9 px-2 gap-3">
                {/* Phase label */}
                <span
                  className={cn(
                    "text-[10px] font-semibold w-28 flex-shrink-0 truncate",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {phase.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 relative h-4 bg-muted/30 rounded-sm overflow-hidden">
                  {/* Phase bar */}
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded-sm",
                      isActive ? PHASE_ACTIVE_COLORS[phase.phase] : PHASE_COLORS[phase.phase]
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  />
                </div>

                {/* Day range */}
                <span className="text-[9px] text-muted-foreground/60 w-14 text-right flex-shrink-0">
                  {phase.day_start}–{phase.day_end}d
                </span>
              </div>
            );
          })}
        </div>

        {/* Current day vertical marker — positioned over all rows */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/60 pointer-events-none z-10"
          style={{ left: `calc(${currentDayPct}% * (100% - 7rem - 3.5rem) / 100% + 7rem)` }}
        >
          <div className="absolute -top-0.5 left-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted-foreground/20" />
          <span className="text-[9px] text-muted-foreground">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-primary/60" />
          <span className="text-[9px] text-muted-foreground">Today (Day {currentDay})</span>
        </div>
      </div>
    </div>
  );
}
