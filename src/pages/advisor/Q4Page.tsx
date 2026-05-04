import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Q4PhaseTracker, type Q4PhaseId, type PhaseDotStatus, Q4_PHASE_ORDER } from "@/components/clients/Q4PhaseTracker";
import { useUpdateClient } from "@/hooks/useClients";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientExposureIndex } from "@/hooks/useClientExposureIndex";
import { useClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { useClientFounderSnapshot } from "@/hooks/useClientFounderSnapshot";
import { ProveQ4Panel } from "@/components/clients/q4/ProveQ4Panel";
import { ProtectQ4Panel } from "@/components/clients/q4/ProtectQ4Panel";
import { OptionalityQ4Panel } from "@/components/clients/q4/OptionalityQ4Panel";
import { AnnualAlignQ4Panel } from "@/components/clients/q4/AnnualAlignQ4Panel";

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
  q4_phase: string | null;
  onboarded_at: string | null;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Q4Page() {
  const { client } = useOutletContext<WorkspaceContext>();
  useUpdateClient();

  const { data: tasksRaw = [] } = useClientTasks(client.id);

  // Prefetch Protect phase data so it's already cached when the user navigates there
  useClientExposureIndex(client.id);
  useClientFounderMatrix(client.id);
  useClientFounderSnapshot(client.id);

  const initialPhase = (client.q4_phase as Q4PhaseId) ?? "prove";
  const [activePhase, setActivePhase] = useState<Q4PhaseId>(initialPhase);

  useEffect(() => {
    if (client?.q4_phase) {
      setActivePhase(client.q4_phase as Q4PhaseId);
    }
  }, [client?.q4_phase]);

  const phaseDotStatus = useMemo((): Record<Q4PhaseId, PhaseDotStatus> => {
    type RawTask = { phase: string; status: string };
    const tasks = tasksRaw as RawTask[];

    const taskDot = (taskPhase: string): PhaseDotStatus => {
      const all = tasks.filter((t) => t.phase === taskPhase);
      const done = all.filter((t) => t.status === "done").length;
      if (done === 0) return "none";
      return done === all.length ? "complete" : "partial";
    };

    return {
      prove: taskDot("q4_prove"),
      protect: taskDot("q4_protect"),
      optionality: taskDot("q4_optionality"),
      annual_align: taskDot("q4_annual_align"),
    };
  }, [tasksRaw]);

  const phaseOrder: Q4PhaseId[] = Q4_PHASE_ORDER;
  const currentPhaseIndex = phaseOrder.indexOf(activePhase);
  const nextPhase: Q4PhaseId | null = phaseOrder[currentPhaseIndex + 1] ?? null;

  const handlePhaseComplete = () => {
    if (nextPhase) setActivePhase(nextPhase);
  };

  function renderPanel() {
    switch (activePhase) {
      case "prove":
        return (
          <ProveQ4Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "protect":
        return (
          <ProtectQ4Panel
            clientId={client.id}
            clientName={client.name}
            entityType={client.entity_type}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "optionality":
        return (
          <OptionalityQ4Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "annual_align":
        return (
          <AnnualAlignQ4Panel
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
        <h1 className="text-2xl font-display font-semibold text-foreground">Chapter 4: Elevate</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mapping your optionality and recalibrating your trajectory
        </p>
      </div>

      {/* Phase stepper */}
      <Q4PhaseTracker
        activePhase={activePhase}
        reachedPhase={(client.q4_phase as Q4PhaseId) ?? "prove"}
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
