import { useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
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

export function ProjectKickoffPanel({ clientId, nextPhase, onPhaseComplete }: ProjectKickoffPanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const kickoffTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "kickoff");
  }, [tasksRaw]);

  const allDone = kickoffTasks.length > 0 && kickoffTasks.every((t) => t.status === "done");
  const remainingCount = kickoffTasks.filter((t) => t.status !== "done").length;

  const [confirmOpen, setConfirmOpen] = useState(false);

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
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Project Kickoff</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete your kickoff tasks to initiate the Q1 engagement.
        </p>
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
    </div>
  );
}
