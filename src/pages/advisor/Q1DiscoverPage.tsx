import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { PhaseTracker, type Q1PhaseId } from "@/components/clients/PhaseTracker";
import { Q1TimelineChart } from "@/components/clients/Q1TimelineChart";
import { useUpdateClient } from "@/hooks/useClients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { daysRemaining, countdownChipClass } from "@/lib/q1Utils";
import { ProjectKickoffPanel } from "@/components/clients/ProjectKickoffPanel";
import { ProvePanel } from "@/components/clients/ProvePanel";
import { DiagnosePanel } from "@/components/clients/DiagnosePanel";
import { DesignTFOPanel } from "@/components/clients/DesignTFOPanel";
import { DesignOutsideTFOPanel } from "@/components/clients/DesignOutsideTFOPanel";
import { ReviewWrapPanel } from "@/components/clients/ReviewWrapPanel";

// ---------------------------------------------------------------------------
// Context shape from ClientWorkspace
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  onboarded_at: string | null;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Q1DiscoverPage() {
  const { client } = useOutletContext<WorkspaceContext>();
  const updateClient = useUpdateClient();

  // Local phase drives which panel is visible. Defaults to DB value or "kickoff".
  const initialPhase = (client.q1_phase as Q1PhaseId) ?? "kickoff";
  const [activePhase, setActivePhase] = useState<Q1PhaseId>(initialPhase);

  // FIX-5: Keep local state in sync if the server record is refreshed externally
  // (e.g. the parent workspace invalidates the client query after a phase advance).
  useEffect(() => {
    if (client?.q1_phase) {
      setActivePhase(client.q1_phase as Q1PhaseId);
    }
  }, [client?.q1_phase]);

  // Called by each panel's "Mark Phase Complete" button —
  // advances to the next phase automatically.
  const phaseOrder: Q1PhaseId[] = [
    "kickoff",
    "prove",
    "diagnose",
    "design_tfo",
    "design_outside",
    "review",
  ];

  // FIX-15: Derive the next phase from the ordered array so each panel
  // doesn't need to hardcode its successor. When null (last phase), the
  // panel can hide the "Mark Phase Complete" button.
  const currentPhaseIndex = phaseOrder.indexOf(activePhase);
  const nextPhase: Q1PhaseId | null = phaseOrder[currentPhaseIndex + 1] ?? null;

  const handlePhaseComplete = () => {
    if (nextPhase) setActivePhase(nextPhase);
  };

  function renderPanel() {
    switch (activePhase) {
      case "kickoff":
        return (
          <ProjectKickoffPanel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "prove":
        return (
          <ProvePanel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "diagnose":
        return (
          <DiagnosePanel
            clientId={client.id}
            clientName={client.name}
            entityType={client.entity_type}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "design_tfo":
        return (
          <DesignTFOPanel
            clientId={client.id}
            clientName={client.name}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "design_outside":
        return (
          <DesignOutsideTFOPanel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "review":
        return <ReviewWrapPanel />;
      default:
        return null;
    }
  }

  const [showGantt, setShowGantt] = useState(false);

  const days = daysRemaining(client.onboarded_at);

  // Format onboarded_at for <input type="date"> — expects YYYY-MM-DD
  const startDateValue = client.onboarded_at
    ? new Date(client.onboarded_at).toISOString().slice(0, 10)
    : "";

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) return;
    try {
      await updateClient.mutateAsync({ id: client.id, onboarded_at: new Date(newDate).toISOString() });
      toast.success("Start date updated");
    } catch {
      toast.error("Failed to update start date");
    }
  };

  return (
    <div className="space-y-6">
      {/* Q1 header with editable start date */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-foreground font-display">Q1: Discover</span>
        <span className="text-muted-foreground/40 text-sm">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Start:</span>
          <div className="relative flex items-center gap-1">
            <input
              type="date"
              value={startDateValue}
              onChange={handleStartDateChange}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring pr-6"
            />
            <Pencil className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        {client.onboarded_at && (
          <>
            <span className="text-muted-foreground/40 text-sm">|</span>
            <button
              type="button"
              onClick={() => setShowGantt((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80",
                countdownChipClass(days)
              )}
              title={showGantt ? "Hide timeline" : "Show timeline"}
            >
              {days === null
                ? "No start date"
                : days <= 0
                ? "Q1 Complete"
                : `${days}d remaining`}
              {showGantt ? (
                <ChevronDown className="w-3 h-3 opacity-70" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 opacity-70" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Phase stepper */}
      <PhaseTracker
        activePhase={activePhase}
        reachedPhase={(client.q1_phase as Q1PhaseId) ?? "kickoff"}
        onPhaseClick={setActivePhase}
      />

      {/* Gantt chart — toggled by clicking the days-remaining pill */}
      {showGantt && (
        <Q1TimelineChart
          onboardedAt={client.onboarded_at}
          activePhase={activePhase}
          hasProspectHistory={!!client.source_prospect_id}
        />
      )}

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Active phase panel */}
      {renderPanel()}
    </div>
  );
}
