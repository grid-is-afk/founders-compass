import { useMemo, useState } from "react";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChecklistItem, type SubtaskItem } from "./ChecklistItem";
import { useClientTasks, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectKickoffPanelProps {
  clientId: string;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
  /** Regenerate the kickoff plan with a new discovery window (replaces existing kickoff tasks). */
  onRegenerate?: (durationDays: number) => void;
  isRegenerating?: boolean;
}

// Display labels mirror PhaseTracker's PHASES array. Duplicated here so a toast
// can render "Design TFO" instead of the raw id "design_tfo".
const PHASE_LABELS: Record<string, string> = {
  prove: "Prove",
  diagnose: "Diagnose",
  design_tfo: "Design TFO",
  design_outside: "Design Outside",
  review: "Review & Wrap",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectKickoffPanel({
  clientId,
  nextPhase,
  onPhaseComplete,
  onRegenerate,
  isRegenerating = false,
}: ProjectKickoffPanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const kickoffTasks = useMemo(() => {
    return (
      tasksRaw as Array<{
        id: string;
        title: string;
        phase: string;
        status: string;
        due_date: string | null;
        subtasks: SubtaskItem[];
      }>
    )
      .filter((t) => t.phase === "kickoff")
      // Schedule order: by due date ascending, date-less last.
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0;
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
  }, [tasksRaw]);

  const allDone = kickoffTasks.length > 0 && kickoffTasks.every((t) => t.status === "done");
  const remainingCount = kickoffTasks.filter((t) => t.status !== "done").length;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenDays, setRegenDays] = useState(90);

  const handleToggle = async (taskId: string, isDone: boolean) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, status: isDone ? "todo" : "done" });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleSubtasksChange = async (taskId: string, subtasks: SubtaskItem[]) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, subtasks });
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  const doAdvancePhase = async () => {
    if (!nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      const label = PHASE_LABELS[nextPhase] ?? nextPhase;
      toast.success("Kickoff phase complete", { description: `Moving to ${label} phase.` });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const handleMarkComplete = () => {
    if (!nextPhase) return;
    if (remainingCount > 0) {
      setConfirmOpen(true);
    } else {
      void doAdvancePhase();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading checklist...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">Project Kickoff</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete your kickoff tasks to initiate the Q1 engagement.
          </p>
        </div>
        {onRegenerate && kickoffTasks.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRegenOpen(true)}
            disabled={isRegenerating}
            className="shrink-0 gap-1.5"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate plan
              </>
            )}
          </Button>
        )}
      </div>

      {kickoffTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No kickoff tasks yet — use the generator above to create your Q1 plan.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {kickoffTasks.map((task) => (
            <ChecklistItem
              key={task.id}
              label={task.title}
              dueDate={task.due_date}
              isDone={task.status === "done"}
              subtasks={task.subtasks ?? []}
              isPending={updateTask.isPending}
              onToggle={() => handleToggle(task.id, task.status === "done")}
              onSubtasksChange={(subtasks) => handleSubtasksChange(task.id, subtasks)}
            />
          ))}
        </div>
      )}

      {/* Completion action — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All items complete."
              : `${remainingCount} item${remainingCount !== 1 ? "s" : ""} remaining`}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance phase with incomplete tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              {`You have ${remainingCount} incomplete task${remainingCount !== 1 ? "s" : ""} in the kickoff phase. Are you sure you want to mark this phase complete?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void doAdvancePhase();
              }}
            >
              Mark Complete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate confirmation — replaces all kickoff tasks with a freshly scheduled plan */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the kickoff plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all {kickoffTasks.length} existing kickoff task
              {kickoffTasks.length !== 1 ? "s" : ""} with a newly generated, back-scheduled plan.
              Completed status and any edits on the current kickoff tasks will be lost. Tasks in
              other phases are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-sm text-foreground">
            Discovery window
            <input
              type="number"
              min={1}
              max={365}
              value={regenDays}
              onChange={(e) => setRegenDays(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
              className="w-20 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Discovery window in days"
            />
            days
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRegenOpen(false);
                onRegenerate?.(regenDays);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
