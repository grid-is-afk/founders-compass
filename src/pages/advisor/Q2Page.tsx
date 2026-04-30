import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Q2PhaseTracker, type Q2PhaseId, type PhaseDotStatus, Q2_PHASE_ORDER } from "@/components/clients/Q2PhaseTracker";
import { useUpdateClient } from "@/hooks/useClients";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientGrow } from "@/hooks/useGrowApi";
import { useClientExposureIndex } from "@/hooks/useClientExposureIndex";
import { useClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { useClientFounderSnapshot } from "@/hooks/useClientFounderSnapshot";
import { useClientIpValueFramework } from "@/hooks/useClientIpValueFramework";
import { toast } from "sonner";
import { ProveQ2Panel } from "@/components/clients/q2/ProveQ2Panel";
import { ProtectQ2Panel } from "@/components/clients/q2/ProtectQ2Panel";
import { GrowQ2Panel } from "@/components/clients/q2/GrowQ2Panel";
import { AlignQ2Panel } from "@/components/clients/q2/AlignQ2Panel";

// ---------------------------------------------------------------------------
// Context shape from ClientWorkspace
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  q2_phase: string | null;
  onboarded_at: string | null;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Q2Page() {
  const { client } = useOutletContext<WorkspaceContext>();
  const updateClient = useUpdateClient();

  const { data: tasksRaw = [] } = useClientTasks(client.id);
  const { data: growRaw = [] } = useClientGrow(client.id);

  // Prefetch Protect phase data so it's already cached when the user navigates there
  useClientExposureIndex(client.id);
  useClientFounderMatrix(client.id);
  useClientFounderSnapshot(client.id);
  useClientIpValueFramework(client.id);

  const initialPhase = (client.q2_phase as Q2PhaseId) ?? "prove";
  const [activePhase, setActivePhase] = useState<Q2PhaseId>(initialPhase);

  useEffect(() => {
    if (client?.q2_phase) {
      setActivePhase(client.q2_phase as Q2PhaseId);
    }
  }, [client?.q2_phase]);

  const phaseDotStatus = useMemo((): Record<Q2PhaseId, PhaseDotStatus> => {
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
      prove: taskDot("q2_prove"),
      protect: taskDot("q2_protect"),
      grow: growDot,
      align: taskDot("q2_align"),
    };
  }, [tasksRaw, growRaw]);

  const phaseOrder: Q2PhaseId[] = Q2_PHASE_ORDER;

  const currentPhaseIndex = phaseOrder.indexOf(activePhase);
  const nextPhase: Q2PhaseId | null = phaseOrder[currentPhaseIndex + 1] ?? null;

  const handlePhaseComplete = () => {
    if (nextPhase) setActivePhase(nextPhase);
  };

  function renderPanel() {
    switch (activePhase) {
      case "prove":
        return (
          <ProveQ2Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "protect":
        return (
          <ProtectQ2Panel
            clientId={client.id}
            clientName={client.name}
            entityType={client.entity_type}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "grow":
        return (
          <GrowQ2Panel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
      case "align":
        return (
          <AlignQ2Panel
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
        <h1 className="text-2xl font-display font-semibold text-foreground">Chapter 2: Grow</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Protecting what you built, growing what matters
        </p>
      </div>

      {/* Phase stepper */}
      <Q2PhaseTracker
        activePhase={activePhase}
        reachedPhase={(client.q2_phase as Q2PhaseId) ?? "prove"}
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
