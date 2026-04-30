import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2, Map } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FounderOptionalityStrip } from "./FounderOptionalityStrip";
import { ChecklistItem, type SubtaskItem } from "./ChecklistItem";
import { useClientOptionalityFramework } from "@/hooks/useClientOptionalityFramework";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

const DESIGN_TFO_CHECKLIST = [
  { key: "financial_reality", label: "Financial Reality" },
  { key: "confirm_wealth_gap", label: "Confirm Wealth Gap" },
  { key: "recast_financials", label: "Recast Financials" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DesignTFOPanelProps {
  clientId: string;
  clientName: string;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DesignTFOPanel({
  clientId,
  clientName,
  nextPhase,
  onPhaseComplete,
}: DesignTFOPanelProps) {
  const navigate = useNavigate();
  const { data: optionalityRecord } = useClientOptionalityFramework(clientId);
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const designTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "design_tfo");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of designTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [designTasks]);

  const handleSubtasksChange = async (label: string, subtasks: SubtaskItem[]) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, subtasks });
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  // FIX-6: useRef instead of useState — prevents duplicate task seeding on remount.
  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(designTasks.map((t) => t.title));
    for (const item of DESIGN_TFO_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "design_tfo",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [isLoading, designTasks, clientId, createTask]);

  const checklistDone = DESIGN_TFO_CHECKLIST.every((i) => taskMap[i.label]?.done);
  const optionalityDone = !!optionalityRecord?.completed_at;
  const allDone = checklistDone && optionalityDone;

  const handleToggle = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        clientId,
        status: task.done ? "todo" : "done",
      });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleMarkComplete = async () => {
    if (!nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      toast.success("Design TFO phase complete", { description: "Moving to Design (Outside TFO) phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Design TFO</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build the TFO plan — recast financials, confirm the wealth gap, and assess optionality.
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist
        </p>
        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {DESIGN_TFO_CHECKLIST.map((item) => {
            const task = taskMap[item.label];
            return (
              <ChecklistItem
                key={item.key}
                label={item.label}
                isDone={task?.done ?? false}
                subtasks={task?.subtasks ?? []}
                isPending={updateTask.isPending}
                onToggle={() => handleToggle(item.label)}
                onSubtasksChange={(subtasks) => handleSubtasksChange(item.label, subtasks)}
              />
            );
          })}
        </div>
      </div>

      {/* Optionality Framework */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Founder's Optionality Framework™
        </p>
        <FounderOptionalityStrip
          clientId={clientId}
          clientName={clientName}
          record={optionalityRecord ?? null}
        />
      </div>

      {/* Capital Strategy Architecture link */}
      <button
        type="button"
        onClick={() => navigate("/advisor/capital-strategy-roadmap")}
        className="w-full rounded-md border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Capital Strategy Architecture</span>
        </div>
        <ChevronRight className="w-4 h-4 text-primary/60" />
      </button>

      {/* Phase completion — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone ? "All items complete." : "Complete checklist items and Optionality Framework to continue."}
          </p>
          <Button
            size="sm"
            disabled={updateClient.isPending}
            onClick={handleMarkComplete}
            className="gap-1.5"
          >
            {updateClient.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Mark Phase Complete <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
