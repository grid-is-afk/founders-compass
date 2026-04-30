import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChecklistItem, type SubtaskItem } from "@/components/clients/ChecklistItem";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";
import { SixCsReconcileCard } from "./SixCsReconcileCard";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface ProveItem {
  key: string;
  group: string;
  label: string;
}

const PROVE_CHECKLIST: ProveItem[] = [
  { key: "q2_prove_add_assets", group: "Data & Documents", label: "Add assets to data room" },
  { key: "q2_prove_collect_docs", group: "Data & Documents", label: "Collect supporting documents" },
  { key: "q2_prove_six_cs", group: "Alignment", label: "Review and align to Six C's" },
  { key: "q2_prove_quarter_plan", group: "Alignment", label: "Review & Maintain current quarter plan" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProveQ2PanelProps {
  clientId: string;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProveQ2Panel({ clientId, nextPhase, onPhaseComplete }: ProveQ2PanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const proveTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "q2_prove");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of proveTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [proveTasks]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(proveTasks.map((t) => t.title));
    for (const item of PROVE_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "q2_prove",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [isLoading, proveTasks, clientId, createTask]);

  const allDone =
    PROVE_CHECKLIST.length > 0 &&
    PROVE_CHECKLIST.every((item) => taskMap[item.label]?.done);

  const handleToggle = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: task.done ? "todo" : "done" });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleSubtasksChange = async (label: string, subtasks: SubtaskItem[]) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, subtasks });
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  const handleMarkComplete = async () => {
    if (!nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q2_phase: nextPhase });
      toast.success("Prove phase complete", { description: "Moving to Protect phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const groups = PROVE_CHECKLIST.reduce<Record<string, ProveItem[]>>((acc, item) => {
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
        <h2 className="text-lg font-display font-semibold text-foreground">Prove</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Document your foundation and align with your Six C's baseline.
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
              return (
                <div key={item.key}>
                  <ChecklistItem
                    label={item.label}
                    isDone={task?.done ?? false}
                    subtasks={task?.subtasks ?? []}
                    isPending={updateTask.isPending}
                    onToggle={() => handleToggle(item.label)}
                    onSkip={() => {}}
                    onUnskip={() => {}}
                    onSubtasksChange={(subtasks) => handleSubtasksChange(item.label, subtasks)}
                  />
                  {item.label === "Review and align to Six C's" && (
                    <div className="px-4 pb-3 border-t border-border/40">
                      <SixCsReconcileCard clientId={clientId} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All items complete."
              : `${PROVE_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} items remaining`}
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
