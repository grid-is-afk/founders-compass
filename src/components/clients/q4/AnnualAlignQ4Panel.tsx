import { useEffect, useMemo, useRef } from "react";
import { Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChecklistItem, type SubtaskItem } from "@/components/clients/ChecklistItem";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface AlignItem {
  key: string;
  group: string;
  label: string;
}

const ALIGN_CHECKLIST: AlignItem[] = [
  { key: "q4_align_protection_review", group: "Annual Progress Review", label: "Review full-year Protection Objectives" },
  { key: "q4_align_value_review", group: "Annual Progress Review", label: "Review full-year Value Enhancement goals" },
  { key: "q4_align_optionality_review", group: "Annual Progress Review", label: "Review Optionality findings and pathway status" },
  { key: "q4_align_objectives", group: "Next-Cycle Roadmap", label: "Set Objectives and Milestones for next annual cycle" },
  { key: "q4_align_champions", group: "Next-Cycle Roadmap", label: "Identify Champions for next cycle" },
  { key: "q4_align_referrals", group: "Referrals", label: "Make referrals to partners" },
  { key: "q4_align_annual_report", group: "Annual Report", label: "Deliver annual report to client" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnnualAlignQ4PanelProps {
  clientId: string;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnualAlignQ4Panel({ clientId, nextPhase, onPhaseComplete }: AnnualAlignQ4PanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const alignTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "q4_annual_align");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of alignTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [alignTasks]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(alignTasks.map((t) => t.title));
    for (const item of ALIGN_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "q4_annual_align",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [isLoading, alignTasks, clientId, createTask]);

  const allDone =
    ALIGN_CHECKLIST.length > 0 &&
    ALIGN_CHECKLIST.every((item) => taskMap[item.label]?.done);

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

  const handleCompleteChapter = async () => {
    try {
      await updateClient.mutateAsync({ id: clientId, q4_phase: "annual_align" });
      toast.success("Chapter 4: Elevate complete!", {
        description: "Annual cycle complete. Well done.",
      });
      onPhaseComplete();
    } catch {
      toast.error("Failed to complete chapter");
    }
  };

  const groups = ALIGN_CHECKLIST.reduce<Record<string, AlignItem[]>>((acc, item) => {
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
        <h2 className="text-lg font-display font-semibold text-foreground">Annual Align</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Recalibrate the founder's trajectory, set the next-cycle roadmap, and deliver the annual report.
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

      {/* Last phase — show chapter completion card */}
      {nextPhase === null ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-emerald-800">Chapter 4: Elevate</h3>
          </div>
          <p className="text-xs text-emerald-700">
            {allDone
              ? "All items complete — annual cycle finished. Ready for the next chapter."
              : `${ALIGN_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} items remaining.`}
          </p>
          <Button
            size="sm"
            onClick={handleCompleteChapter}
            disabled={updateClient.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {updateClient.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete Chapter 4
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All items complete."
              : `${ALIGN_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} items remaining`}
          </p>
          <Button
            size="sm"
            disabled={updateClient.isPending}
            onClick={handleCompleteChapter}
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
