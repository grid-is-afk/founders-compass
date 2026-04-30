import { cn } from "@/lib/utils";
import { Shield, TrendingUp, AlignLeft, FileBadge } from "lucide-react";

// ---------------------------------------------------------------------------
// Phase definition
// ---------------------------------------------------------------------------

export type Q2PhaseId = "prove" | "protect" | "grow" | "align";

interface PhaseConfig {
  id: Q2PhaseId;
  label: string;
  Icon: React.ElementType;
}

const Q2_PHASES: PhaseConfig[] = [
  { id: "prove", label: "Prove", Icon: FileBadge },
  { id: "protect", label: "Protect", Icon: Shield },
  { id: "grow", label: "Grow", Icon: TrendingUp },
  { id: "align", label: "Align", Icon: AlignLeft },
];

const Q2_PHASE_ORDER: Q2PhaseId[] = ["prove", "protect", "grow", "align"];

export type PhaseDotStatus = "none" | "partial" | "complete";

function dotClass(s: PhaseDotStatus): string {
  if (s === "complete") return "bg-emerald-500";
  if (s === "partial") return "bg-amber-400 animate-pulse";
  return "bg-muted-foreground/30";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Q2PhaseTrackerProps {
  activePhase: Q2PhaseId;
  reachedPhase: Q2PhaseId;
  dotStatus: Record<Q2PhaseId, PhaseDotStatus>;
  onPhaseClick: (phase: Q2PhaseId) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Q2PhaseTracker({ activePhase, reachedPhase, dotStatus, onPhaseClick }: Q2PhaseTrackerProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max gap-0">
        {Q2_PHASES.map((phase, idx) => {
          const isActive = phase.id === activePhase;
          const isLast = idx === Q2_PHASES.length - 1;
          const dot = dotStatus[phase.id];

          return (
            <div key={phase.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onPhaseClick(phase.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-2 rounded-lg transition-colors group",
                  isActive ? "bg-primary/10" : "hover:bg-muted/40"
                )}
                title={phase.label}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 group-hover:border-primary/40"
                    )}
                  >
                    <phase.Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                      dotClass(dot)
                    )}
                  />
                </div>

                <span
                  className={cn(
                    "text-[10px] font-semibold text-center leading-tight whitespace-nowrap",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {phase.label}
                </span>
              </button>

              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 w-6 flex-shrink-0 mx-0.5 rounded-full",
                    Q2_PHASE_ORDER.indexOf(phase.id) < Q2_PHASE_ORDER.indexOf(reachedPhase)
                      ? "bg-emerald-400"
                      : "bg-border/60"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { Q2_PHASES, Q2_PHASE_ORDER };
