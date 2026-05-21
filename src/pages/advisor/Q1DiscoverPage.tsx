import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil, ChevronDown, ChevronRight as ChevronRightIcon, Wand2, Loader2 } from "lucide-react";
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
import { KickoffPlanModal } from "@/components/clients/KickoffPlanModal";
import {
  useClientTasks,
  useCreateTask,
  useGenerateKickoffPlan,
  type ProposedTask,
} from "@/hooks/useTasks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

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
  const qc = useQueryClient();

  // Local phase drives which panel is visible. Defaults to DB value or "kickoff".
  const initialPhase = (client.q1_phase as Q1PhaseId) ?? "kickoff";
  const [activePhase, setActivePhase] = useState<Q1PhaseId>(initialPhase);

  // Kickoff plan modal state
  const [kickoffTasks, setKickoffTasks] = useState<ProposedTask[] | null>(null);
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);

  // Hooks for the kickoff plan feature
  const { data: tasksRaw = [] } = useClientTasks(client.id);
  const generateKickoffPlan = useGenerateKickoffPlan(client.id);
  const createTask = useCreateTask();

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

  // True when the client has no tasks at all (across any phase)
  const hasTasks = (tasksRaw as unknown[]).length > 0;

  const handleGenerateKickoffPlan = async () => {
    try {
      const result = await generateKickoffPlan.mutateAsync();
      if ("alreadyHasTasks" in result && result.alreadyHasTasks) {
        toast.info(result.message);
        return;
      }
      if ("tasks" in result) {
        setKickoffTasks(result.tasks);
        setShowKickoffModal(true);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate kickoff plan. Please try again."
      );
    }
  };

  const handleApproveKickoffPlan = async (approvedTasks: ProposedTask[]) => {
    setIsCreatingTasks(true);
    let successCount = 0;
    let failCount = 0;

    for (const task of approvedTasks) {
      try {
        await createTask.mutateAsync({
          client_id: client.id,
          title: task.title,
          assignee: task.assignee,
          priority: task.priority,
          phase: "kickoff",
          notes: task.description || null,
          status: "todo",
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    // Invalidate so all panels pick up the new tasks
    await qc.invalidateQueries({ queryKey: ["tasks", client.id] });

    setIsCreatingTasks(false);
    setShowKickoffModal(false);
    setKickoffTasks(null);

    if (failCount === 0) {
      toast.success(`Kickoff plan created — ${successCount} task${successCount !== 1 ? "s" : ""} added`);
    } else {
      toast.warning(
        `${successCount} task${successCount !== 1 ? "s" : ""} added, ${failCount} failed. Please try again for the remaining items.`
      );
    }
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
        return (
          <ReviewWrapPanel
            clientId={client.id}
            nextPhase={nextPhase}
            onPhaseComplete={handlePhaseComplete}
          />
        );
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
      {/* Chapter header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Chapter 1: Discover</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Understanding where you are</p>
        </div>

        {/* Start date + countdown row */}
        <div className="flex items-center gap-4 flex-wrap">
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
                ? "Chapter 1 Complete"
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

      {/* Kickoff plan generator — shown only when no tasks exist yet */}
      {!hasTasks && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-violet-300/60 bg-violet-50/30 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground">
              Generate an AI-powered Q1 kickoff plan based on the TFO Discover methodology and this client's uploaded documents.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleGenerateKickoffPlan}
            disabled={generateKickoffPlan.isPending}
            className="ml-4 shrink-0 gap-1.5"
          >
            {generateKickoffPlan.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                Generate Kickoff Plan
              </>
            )}
          </Button>
        </div>
      )}

      {/* Active phase panel */}
      {renderPanel()}

      {/* Kickoff plan review modal */}
      {showKickoffModal && kickoffTasks !== null && (
        <KickoffPlanModal
          open={showKickoffModal}
          tasks={kickoffTasks}
          clientName={client.name}
          onClose={() => {
            setShowKickoffModal(false);
            setKickoffTasks(null);
          }}
          onApprove={handleApproveKickoffPlan}
          isApproving={isCreatingTasks}
        />
      )}
    </div>
  );
}
