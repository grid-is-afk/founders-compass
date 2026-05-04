import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChecklistItem, type SubtaskItem } from "@/components/clients/ChecklistItem";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface OptionalityItem {
  key: string;
  group: string;
  label: string;
  defaultSubtasks?: string[];
}

const OPTIONALITY_CHECKLIST: OptionalityItem[] = [
  {
    key: "q4_optionality_framework_review",
    group: "Founder's Optionality Framework",
    label: "Review Founder's Optionality Framework",
    defaultSubtasks: [
      "Confirm current optionality profile is documented",
      "Identify any changes to founder goals or timelines",
      "Review key decision rights and control mechanisms",
    ],
  },
  {
    key: "q4_optionality_pathways",
    group: "Founder's Optionality Framework",
    label: "Map exit and transition pathways",
    defaultSubtasks: [
      "Document all viable exit or transition scenarios",
      "Assess readiness for each pathway (financial, structural, operational)",
      "Identify gaps that would limit optionality",
    ],
  },
  {
    key: "q4_optionality_timing",
    group: "Stress Testing",
    label: "Stress-test timing optionality",
    defaultSubtasks: [
      "Identify the earliest viable exit or transition window",
      "Test what would need to be true for each timeline",
      "Assess which external factors could compress or extend timing",
    ],
  },
  {
    key: "q4_optionality_value_levers",
    group: "Stress Testing",
    label: "Identify value maximization levers",
    defaultSubtasks: [
      "Map the top 3 levers that increase enterprise value",
      "Assess which levers are within the founder's control",
      "Set priorities for the next annual cycle",
    ],
  },
  {
    key: "q4_optionality_personal_readiness",
    group: "Personal Readiness",
    label: "Assess personal financial readiness",
    defaultSubtasks: [
      "Review personal balance sheet relative to transition goals",
      "Confirm estate and succession planning is aligned",
      "Identify any personal financial gaps that limit optionality",
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OptionalityQ4PanelProps {
  clientId: string;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OptionalityQ4Panel({ clientId, nextPhase, onPhaseComplete }: OptionalityQ4PanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const optionalityTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "q4_optionality");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of optionalityTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [optionalityTasks]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(optionalityTasks.map((t) => t.title));
    for (const item of OPTIONALITY_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "q4_optionality",
          status: "todo",
          priority: "medium",
          ...(item.defaultSubtasks
            ? {
                subtasks: item.defaultSubtasks.map((title, i) => ({
                  title,
                  done: false,
                  sort_order: i,
                })),
              }
            : {}),
        });
      }
    }
  }, [isLoading, optionalityTasks, clientId, createTask]);

  const allDone =
    OPTIONALITY_CHECKLIST.length > 0 &&
    OPTIONALITY_CHECKLIST.every((item) => taskMap[item.label]?.done);

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
      await updateClient.mutateAsync({ id: clientId, q4_phase: nextPhase });
      toast.success("Optionality phase complete", { description: "Moving to Annual Align phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const groups = OPTIONALITY_CHECKLIST.reduce<Record<string, OptionalityItem[]>>((acc, item) => {
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
        <h2 className="text-lg font-display font-semibold text-foreground">Optionality</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Map exit and transition pathways, stress-test timing, and preserve founder optionality.
        </p>
      </div>

      {/* Framework intro card */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex gap-3">
        <GitBranch className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Founder's Optionality Framework™</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Optionality phase identifies and stress-tests exit and transition pathways to preserve and
            maximize founder choice, control, and timing. Every decision made today either expands or
            constrains the options available tomorrow.
          </p>
        </div>
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
                <ChecklistItem
                  key={item.key}
                  label={item.label}
                  isDone={task?.done ?? false}
                  subtasks={task?.subtasks ?? []}
                  isPending={updateTask.isPending}
                  onToggle={() => handleToggle(item.label)}
                  onSkip={() => {}}
                  onUnskip={() => {}}
                  onSubtasksChange={(subtasks) => handleSubtasksChange(item.label, subtasks)}
                />
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
              : `${OPTIONALITY_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} items remaining`}
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
