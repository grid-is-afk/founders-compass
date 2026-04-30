import { useEffect, useMemo, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChecklistItem, type SubtaskItem } from "./ChecklistItem";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface ChecklistSection {
  id: string;
  title: string;
  items: { key: string; label: string }[];
}

const REVIEW_SECTIONS: ChecklistSection[] = [
  {
    id: "findings",
    title: "Discovery Findings",
    items: [
      { key: "financial_truth", label: "Financial Truth" },
      { key: "exposure_risk_index", label: "Exposure & Risk Index" },
      { key: "optionality_framework", label: "Optionality Framework" },
      { key: "capital_alignment_method", label: "Capital Alignment Method (Master Plan)" },
    ],
  },
  {
    id: "roadmap",
    title: "Quarterly Roadmap",
    items: [
      { key: "set_objectives", label: "Set Objectives and Milestones" },
      { key: "identify_champions", label: "Identify Champions" },
      { key: "make_referrals", label: "Make Referrals" },
    ],
  },
];

function taskTitle(sectionTitle: string, label: string) {
  return `[${sectionTitle}] ${label}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReviewWrapPanelProps {
  clientId: string;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewWrapPanel({ clientId }: ReviewWrapPanelProps) {
  const { data: tasksRaw = [], isLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const reviewTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "review");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of reviewTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [reviewTasks]);

  // FIX-6: useRef prevents duplicate task seeding on remount / Strict Mode.
  const seededRef = useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(reviewTasks.map((t) => t.title));
    for (const section of REVIEW_SECTIONS) {
      for (const item of section.items) {
        const title = taskTitle(section.title, item.label);
        if (!existing.has(title)) {
          createTask.mutate({
            client_id: clientId,
            title,
            phase: "review",
            status: "todo",
            priority: "medium",
          });
        }
      }
    }
  }, [isLoading, reviewTasks, clientId, createTask]);

  const allItems = REVIEW_SECTIONS.flatMap((s) =>
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
        <h2 className="text-lg font-display font-semibold text-foreground">Review & Wrap</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Final review of all Q1 deliverables and sign-off.
        </p>
      </div>

      {/* Align Quarterly Review callout */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Align Quarterly Review</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Schedule and conduct the Q1 Align session with the client before completing the items below.
          </p>
        </div>
      </div>

      {REVIEW_SECTIONS.map((section) => (
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

      {/* Final completion state — shown when all items are done (review is the last phase) */}
      {allDone && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-1.5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-display font-semibold text-foreground text-sm">Q1 Discover Complete</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All deliverables reviewed and signed off. Ready to transition to Q2.
          </p>
        </div>
      )}
    </div>
  );
}
