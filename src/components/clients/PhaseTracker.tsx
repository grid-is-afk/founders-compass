import { cn } from "@/lib/utils";
import {
  Rocket,
  FileCheck,
  Stethoscope,
  Layers,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Phase definition
// ---------------------------------------------------------------------------

export type Q1PhaseId =
  | "kickoff"
  | "prove"
  | "diagnose"
  | "design_tfo"
  | "design_outside"
  | "review";

interface PhaseConfig {
  id: Q1PhaseId;
  label: string;
  Icon: React.ElementType;
}

const PHASES: PhaseConfig[] = [
  { id: "kickoff", label: "Project Kickoff", Icon: Rocket },
  { id: "prove", label: "Prove", Icon: FileCheck },
  { id: "diagnose", label: "Diagnose", Icon: Stethoscope },
  { id: "design_tfo", label: "Design TFO", Icon: Layers },
  { id: "design_outside", label: "Design Outside", Icon: ExternalLink },
  { id: "review", label: "Review & Wrap", Icon: ClipboardList },
];

const PHASE_ORDER: Q1PhaseId[] = [
  "kickoff",
  "prove",
  "diagnose",
  "design_tfo",
  "design_outside",
  "review",
];

function phaseStatus(
  phaseId: Q1PhaseId,
  reachedPhase: Q1PhaseId
): "complete" | "in_progress" | "not_started" {
  const phaseIdx = PHASE_ORDER.indexOf(phaseId);
  const reachedIdx = PHASE_ORDER.indexOf(reachedPhase);
  if (phaseIdx < reachedIdx) return "complete";
  if (phaseIdx === reachedIdx) return "in_progress";
  return "not_started";
}

function statusDotClass(status: "complete" | "in_progress" | "not_started"): string {
  if (status === "complete") return "bg-emerald-500";
  if (status === "in_progress") return "bg-amber-400 animate-pulse";
  return "bg-muted-foreground/30";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PhaseTrackerProps {
  /** The phase currently being viewed (controls which step is highlighted). */
  activePhase: Q1PhaseId;
  /** The highest phase the client has actually reached (controls complete/locked visual states). */
  reachedPhase: Q1PhaseId;
  onPhaseClick: (phase: Q1PhaseId) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhaseTracker({ activePhase, reachedPhase, onPhaseClick }: PhaseTrackerProps) {
  const reachedPhaseIdx = PHASE_ORDER.indexOf(reachedPhase);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max gap-0">
        {PHASES.map((phase, idx) => {
          const status = phaseStatus(phase.id, reachedPhase);
          const isActive = phase.id === activePhase;
          const isLast = idx === PHASES.length - 1;
          // Only allow navigation to phases the client has actually reached.
          // Future phases are locked until reached in sequence.
          const isFuture = idx > reachedPhaseIdx;

          return (
            <div key={phase.id} className="flex items-center">
              {/* Phase step */}
              <button
                type="button"
                onClick={() => onPhaseClick(phase.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-2 rounded-lg transition-colors group",
                  isActive ? "bg-primary/10" : "hover:bg-muted/40"
                )}
                title={phase.label}
              >
                {/* Icon + dot */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                      isActive
                        ? "border-primary bg-primary/10"
                        : status === "complete"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border bg-muted/30 group-hover:border-primary/40"
                    )}
                  >
                    <phase.Icon
                      className={cn(
                        "w-4 h-4",
                        isActive
                          ? "text-primary"
                          : status === "complete"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  {/* Status dot */}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                      statusDotClass(status)
                    )}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-semibold text-center leading-tight whitespace-nowrap",
                    isActive
                      ? "text-primary"
                      : status === "complete"
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                  )}
                >
                  {phase.label}
                </span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 w-6 flex-shrink-0 mx-0.5 rounded-full",
                    PHASE_ORDER.indexOf(phase.id) < PHASE_ORDER.indexOf(reachedPhase)
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

export { PHASES, PHASE_ORDER };
