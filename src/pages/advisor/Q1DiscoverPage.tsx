import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
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
  useGenerateKickoffPlan,
  useApplyKickoffPlan,
  type ProposedTask,
} from "@/hooks/useTasks";
import { useClientDocuments } from "@/hooks/useDocuments";
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

  // Local phase drives which panel is visible. Defaults to DB value or "kickoff".
  const initialPhase = (client.q1_phase as Q1PhaseId) ?? "kickoff";
  const [activePhase, setActivePhase] = useState<Q1PhaseId>(initialPhase);

  // Kickoff plan modal state
  const [kickoffTasks, setKickoffTasks] = useState<ProposedTask[] | null>(null);
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [kickoffPersonalizationLevel, setKickoffPersonalizationLevel] = useState<
    "full" | "methodology-only" | undefined
  >(undefined);
  // Whether applying the reviewed plan should replace existing kickoff tasks
  // (true when the client already had kickoff tasks — i.e. a regenerate).
  const [kickoffWillReplace, setKickoffWillReplace] = useState(false);
  // Discovery window length (days) used for back-scheduling on first generation.
  const [discoveryDays, setDiscoveryDays] = useState(90);

  // Hooks for the kickoff plan feature
  const { data: tasksRaw = [] } = useClientTasks(client.id);
  const { data: documents } = useClientDocuments(client.id);
  const docCount = documents?.length ?? 0;
  const generateKickoffPlan = useGenerateKickoffPlan(client.id);
  const applyKickoffPlan = useApplyKickoffPlan(client.id);

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

  // True when the client already has kickoff-phase tasks — drives whether the
  // first-time generate card is shown vs. the in-panel regenerate affordance.
  const kickoffTaskCount = (
    tasksRaw as Array<{ phase?: string | null }>
  ).filter((t) => t.phase === "kickoff").length;
  const hasKickoffTasks = kickoffTaskCount > 0;

  // Shared by the first-time "Generate" card and the in-panel "Regenerate" action.
  const handleGenerateKickoffPlan = async (durationDays: number) => {
    try {
      const result = await generateKickoffPlan.mutateAsync({ durationDays });
      if ("noScopeMaterials" in result && result.noScopeMaterials) {
        toast.info(result.message);
        return;
      }
      if ("tasks" in result) {
        setKickoffTasks(result.tasks);
        setKickoffPersonalizationLevel(result.personalizationLevel);
        setKickoffWillReplace(result.existingKickoffCount > 0);
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
    try {
      const result = await applyKickoffPlan.mutateAsync({
        tasks: approvedTasks,
        replace: kickoffWillReplace,
      });
      const count = Array.isArray(result?.tasks) ? result.tasks.length : approvedTasks.length;
      setShowKickoffModal(false);
      setKickoffTasks(null);
      setKickoffPersonalizationLevel(undefined);
      toast.success(
        `${kickoffWillReplace ? "Kickoff plan regenerated" : "Kickoff plan created"} — ${count} task${count !== 1 ? "s" : ""}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the kickoff plan. Please try again."
      );
    } finally {
      setIsCreatingTasks(false);
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
            onRegenerate={handleGenerateKickoffPlan}
            isRegenerating={generateKickoffPlan.isPending}
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

      {/* Kickoff plan generator — shown only when no kickoff tasks exist yet.
          Once a plan exists, regeneration lives inside the kickoff panel below. */}
      {!hasKickoffTasks && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-violet-300/60 bg-violet-50/30 px-4 py-3">
          {docCount === 0 ? (
            <>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground">
                  Upload your contract or scope document to the Data Room first — the kickoff plan generator needs them to personalize your Q1 plan.
                </p>
              </div>
              <div className="ml-4 shrink-0 flex items-center gap-2">
                <Button
                  size="sm"
                  disabled
                  className="gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate Kickoff Plan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <Link to={`/advisor/clients/${client.id}/data-room`}>
                    Go to Data Room →
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate an AI-powered Q1 kickoff plan based on the TFO Discover methodology and this client's uploaded documents.
                </p>
              </div>
              <div className="ml-4 shrink-0 flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Discovery window
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={discoveryDays}
                    onChange={(e) => setDiscoveryDays(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Discovery window in days"
                  />
                  days
                </label>
                <Button
                  size="sm"
                  onClick={() => handleGenerateKickoffPlan(discoveryDays)}
                  disabled={generateKickoffPlan.isPending}
                  className="gap-1.5"
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
            </>
          )}
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
          personalizationLevel={kickoffPersonalizationLevel}
          onClose={() => {
            setShowKickoffModal(false);
            setKickoffTasks(null);
            setKickoffPersonalizationLevel(undefined);
          }}
          onApprove={handleApproveKickoffPlan}
          isApproving={isCreatingTasks}
        />
      )}
    </div>
  );
}
