import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChecklistItem, type SubtaskItem } from "./ChecklistItem";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface ChecklistSection {
  id: string;
  title: string;
  items: { key: string; label: string }[];
}

const DESIGN_OUTSIDE_SECTIONS: ChecklistSection[] = [
  {
    id: "personal",
    title: "Personal",
    items: [
      { key: "personal_after_exit_goals", label: "After-Exit Goal Planning" },
      { key: "personal_after_exit_prep", label: "After-Exit Preparation" },
    ],
  },
  {
    id: "business",
    title: "Business",
    items: [
      { key: "business_after_exit_goals", label: "After-Exit Goal Planning" },
      { key: "business_after_exit_prep", label: "After-Exit Preparation" },
    ],
  },
];

// Flatten all items with section prefix for unique task titles
function taskTitle(sectionTitle: string, label: string) {
  return `[${sectionTitle}] ${label}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DesignOutsideTFOPanelProps {
  clientId: string;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DesignOutsideTFOPanel({
  clientId,
  nextPhase,
  onPhaseComplete,
}: DesignOutsideTFOPanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const designOutsideTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "design_outside");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of designOutsideTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [designOutsideTasks]);

  // FIX-6: useRef instead of useState — prevents duplicate task seeding on remount.
  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(designOutsideTasks.map((t) => t.title));
    for (const section of DESIGN_OUTSIDE_SECTIONS) {
      for (const item of section.items) {
        const title = taskTitle(section.title, item.label);
        if (!existing.has(title)) {
          createTask.mutate({
            client_id: clientId,
            title,
            phase: "design_outside",
            status: "todo",
            priority: "medium",
          });
        }
      }
    }
  }, [isLoading, designOutsideTasks, clientId, createTask]);

  const allItems = DESIGN_OUTSIDE_SECTIONS.flatMap((s) =>
    s.items.map((i) => taskTitle(s.title, i.label))
  );
  const allDone = allItems.length > 0 && allItems.every((title) => taskMap[title]?.done);

  const handleToggle = async (title: string) => {
    const task = taskMap[title];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: task.done ? "todo" : "done" });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleSubtasksChange = async (title: string, subtasks: SubtaskItem[]) => {
    const task = taskMap[title];
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
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      toast.success("Design (Outside TFO) phase complete", { description: "Moving to Review & Wrap." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Design (Outside TFO)</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Plan for the founder's life and business after exit — personal and business goals.
        </p>
      </div>

      {DESIGN_OUTSIDE_SECTIONS.map((section) => (
        <div key={section.id} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            {section.items.map((item) => {
              const title = taskTitle(section.title, item.label);
              const task = taskMap[title];
              return (
                <ChecklistItem
                  key={item.key}
                  label={item.label}
                  isDone={task?.done ?? false}
                  subtasks={task?.subtasks ?? []}
                  isPending={updateTask.isPending}
                  onToggle={() => handleToggle(title)}
                  onSubtasksChange={(subtasks) => handleSubtasksChange(title, subtasks)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Phase completion — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All items complete."
              : `${allItems.filter((title) => !taskMap[title]?.done).length} items remaining`}
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
