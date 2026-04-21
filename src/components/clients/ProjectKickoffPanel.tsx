import { useEffect, useMemo, useRef } from "react";
import { CheckSquare, Square, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Checklist definition — ordered, grouped
// ---------------------------------------------------------------------------

interface ChecklistItem {
  key: string;
  group: string;
  label: string;
}

const KICKOFF_CHECKLIST: ChecklistItem[] = [
  {
    key: "kickoff_objectives",
    group: "Project Plan",
    label: "Overall Project Objectives / Milestones / Deliverables",
  },
  {
    key: "kickoff_scheduling",
    group: "Project Plan",
    label: "Scheduling",
  },
  {
    key: "kickoff_roadmap_milestones",
    group: "Project Roadmap",
    label: "Objectives and Milestones",
  },
  {
    key: "kickoff_partners",
    group: "Project Roadmap",
    label: "Project Partners",
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectKickoffPanelProps {
  clientId: string;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectKickoffPanel({ clientId, nextPhase, onPhaseComplete }: ProjectKickoffPanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  // Tasks filtered to the kickoff phase
  const kickoffTasks = useMemo(() => {
    return (tasksRaw as Array<{ id: string; title: string; phase: string; status: string }>).filter(
      (t) => t.phase === "kickoff"
    );
  }, [tasksRaw]);

  // Build a map from task title → task id + done status
  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean }> = {};
    for (const t of kickoffTasks) {
      map[t.title] = { id: t.id, done: t.status === "done" };
    }
    return map;
  }, [kickoffTasks]);

  // FIX-6: useRef instead of useState — survives remounts and Strict Mode double-invocations
  // without resetting, preventing duplicate task creation.
  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(kickoffTasks.map((t) => t.title));
    for (const item of KICKOFF_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "kickoff",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [isLoading, kickoffTasks, clientId, createTask]);

  const allDone =
    KICKOFF_CHECKLIST.length > 0 &&
    KICKOFF_CHECKLIST.every((item) => taskMap[item.label]?.done);

  const handleToggle = async (item: ChecklistItem) => {
    const task = taskMap[item.label];
    if (!task) return;
    const newStatus = task.done ? "todo" : "done";
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: newStatus });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleMarkComplete = async () => {
    if (!allDone || !nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      toast.success("Kickoff phase complete", {
        description: "Moving to Prove phase.",
      });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  // Group items
  const groups = KICKOFF_CHECKLIST.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

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
          Complete the following items to initiate the Q1 engagement.
        </p>
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            {items.map((item) => {
              const task = taskMap[item.label];
              const isDone = task?.done ?? false;
              const isPending = updateTask.isPending;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggle(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20",
                    isPending && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm flex-1",
                      isDone ? "line-through text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Completion action — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All items complete — ready to advance."
              : `${KICKOFF_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} items remaining`}
          </p>
          <Button
            size="sm"
            disabled={!allDone || updateClient.isPending}
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
