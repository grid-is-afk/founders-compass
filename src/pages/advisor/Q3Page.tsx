import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Q3PhaseTracker, type Q3PhaseId, type PhaseDotStatus, Q3_PHASE_ORDER } from "@/components/clients/Q3PhaseTracker";
import { useUpdateClient } from "@/hooks/useClients";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientGrow } from "@/hooks/useGrowApi";
import { useClientExposureIndex } from "@/hooks/useClientExposureIndex";
import { useClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { useClientFounderSnapshot } from "@/hooks/useClientFounderSnapshot";
import { toast } from "sonner";
import { ProveQ3Panel } from "@/components/clients/q3/ProveQ3Panel";
import { ProtectQ3Panel } from "@/components/clients/q3/ProtectQ3Panel";
import { GrowQ3Panel } from "@/components/clients/q3/GrowQ3Panel";
import { AlignQ3Panel } from "@/components/clients/q3/AlignQ3Panel";

// ---------------------------------------------------------------------------
// Context shape from ClientWorkspace
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  q2_phase: string | null;
  q3_phase: string | null;
  onboarded_at: string | null;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Q3Page() {
  const { client } = useOutletContext<WorkspaceContext>();
  const updateClient = useUpdateClient();

  const { data: tasksRaw = [] } = useClientTasks(client.id);
  const { data: growRaw = [] } = useClientGrow(client.id, 3);

  // Prefetch Protect phase data so it's already cached when the user navigates there
  useClientExposureIndex(client.id);
  useClientFounderMatrix(client.id);
  useClientFounderSnapshot(client.id);

  const initialPhase = (client.q3_phase as Q3PhaseId) ?? "prove";
  const [activePhase, setActivePhase] = useState<Q3PhaseId>(initialPhase);

  useEffect(() => {
    if (client?.q3_phase) {
      setActivePhase(client.q3_phase as Q3PhaseId);
    }
  }, [client?.q3_phase]);

  const phaseDotStatus = useMemo((): Record<Q3PhaseId, PhaseDotStatus> => {
    type RawTask = { phase: string; status: string };
    const tasks = tasksRaw as RawTask[];

    const taskDot = (taskPhase: string): PhaseDotStatus => {
      const all = tasks.filter((t) => t.phase === taskPhase);
      const done = all.filter((t) => t.status === "done").length;
      if (done === 0) return "none";
      return done === all.length ? "complete" : "partial";
    };

    const growItems = (growRaw as { capital_type: string }[]);
    const growDot: PhaseDotStatus = growItems.length === 0 ? "none" : "partial";

    return {
      prove: taskDot("q3_prove"),
      protect: taskDot("q3_protect"),
      grow: growDot,
      align: taskDot("q3_align"),
    };
  }, [tasksRaw, growRaw]);

  const phaseOrder: Q3PhaseId[] = Q3_PHASE_ORDER;

  const currentPhaseIndex = phaseOrder.indexOf(activePhase);
  const nextPhase: Q3PhaseId | null = phaseOrder[currentPhaseIndex + 1] ?? null;

  const handlePhaseComplete = () => {
    if (nextPhase) setActivePhase(nextPhase);
  };

  function renderPanel() {
    switch (activePhase) {
      case "prove":
        return (
          <ProveQ3Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "protect":
        return (
          <ProtectQ3Panel
            clientId={client.id}
            clientName={client.name}
            entityType={client.entity_type}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "grow":
        return (
          <GrowQ3Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "align":
        return (
          <AlignQ3Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Chapter header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Chapter 3: Strengthen</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Building your protection architecture, growing what matters
        </p>
      </div>

      {/* Phase stepper */}
      <Q3PhaseTracker
        activePhase={activePhase}
        reachedPhase={(client.q3_phase as Q3PhaseId) ?? "prove"}
        dotStatus={phaseDotStatus}
        onPhaseClick={setActivePhase}
      />

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Active phase panel */}
      {renderPanel()}
    </div>
  );
}
