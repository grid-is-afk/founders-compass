import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Trash2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProposedTask } from "@/hooks/useTasks";

// ---------------------------------------------------------------------------
// Internal editable task state — extends ProposedTask with UI state
// ---------------------------------------------------------------------------

interface EditableTask extends ProposedTask {
  /** Stable local key for React list rendering */
  _key: string;
  included: boolean;
  rationaleExpanded: boolean;
}

function toEditableTasks(tasks: ProposedTask[]): EditableTask[] {
  return tasks.map((t, i) => ({
    ...t,
    _key: `${i}-${t.title}`,
    included: true,
    rationaleExpanded: false,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PRIORITY_CYCLE: ProposedTask["priority"][] = ["high", "medium", "low"];
const ASSIGNEE_LABELS: Record<ProposedTask["assignee"], string> = {
  advisor: "Advisor",
  client: "Client",
};
const PRIORITY_COLORS: Record<ProposedTask["priority"], string> = {
  high: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  medium: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  low: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
};
const ASSIGNEE_COLORS: Record<ProposedTask["assignee"], string> = {
  advisor: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  client: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
};

interface TaskCardProps {
  task: EditableTask;
  onToggleIncluded: () => void;
  onTitleChange: (value: string) => void;
  onToggleAssignee: () => void;
  onCyclePriority: () => void;
  onToggleRationale: () => void;
  onRemove: () => void;
}

function TaskCard({
  task,
  onToggleIncluded,
  onTitleChange,
  onToggleAssignee,
  onCyclePriority,
  onToggleRationale,
  onRemove,
}: TaskCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-opacity",
        task.included ? "border-border opacity-100" : "border-border/40 opacity-50"
      )}
    >
      {/* Card header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.included}
          onChange={onToggleIncluded}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
          aria-label={task.included ? "Exclude task" : "Include task"}
        />

        {/* Title + badges */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Editable title */}
          <input
            type="text"
            value={task.title}
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={!task.included}
            className={cn(
              "w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground",
              "border-b border-transparent focus:border-border focus:outline-none transition-colors",
              !task.included && "cursor-not-allowed"
            )}
            aria-label="Task title"
          />

          {/* Phase label */}
          {task.phase && (
            <p className="text-xs text-muted-foreground">
              {task.phase}
            </p>
          )}

          {/* Assignee + Priority badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onToggleAssignee}
              disabled={!task.included}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                ASSIGNEE_COLORS[task.assignee],
                !task.included && "cursor-not-allowed opacity-60"
              )}
              title="Click to toggle assignee"
            >
              {ASSIGNEE_LABELS[task.assignee]}
            </button>

            <button
              type="button"
              onClick={onCyclePriority}
              disabled={!task.included}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                PRIORITY_COLORS[task.priority],
                !task.included && "cursor-not-allowed opacity-60"
              )}
              title="Click to change priority"
            >
              {task.priority}
            </button>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove task"
          aria-label="Remove task"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>

      {/* Rationale toggle */}
      {(task.rationale || task.sourceContext) && (
        <div className="border-t border-border/60">
          <button
            type="button"
            onClick={onToggleRationale}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {task.rationaleExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Rationale
          </button>

          {task.rationaleExpanded && (
            <div className="px-4 pb-3 space-y-2">
              {task.rationale && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {task.rationale}
                </p>
              )}
              {task.sourceContext && (
                <blockquote className="border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground italic leading-relaxed">
                  {task.sourceContext}
                </blockquote>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

interface KickoffPlanModalProps {
  open: boolean;
  tasks: ProposedTask[];
  clientName: string;
  personalizationLevel?: "full" | "methodology-only";
  onClose: () => void;
  onApprove: (tasks: ProposedTask[]) => void;
  isApproving?: boolean;
}

export function KickoffPlanModal({
  open,
  tasks: initialTasks,
  clientName,
  personalizationLevel,
  onClose,
  onApprove,
  isApproving = false,
}: KickoffPlanModalProps) {
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>(() =>
    toEditableTasks(initialTasks)
  );

  const approvedTasks = editableTasks.filter((t) => t.included);
  const approvedCount = approvedTasks.length;

  // ---------------------------------------------------------------------------
  // Mutation helpers — all produce a new array reference (no mutation in place)
  // ---------------------------------------------------------------------------

  const updateTask = (key: string, patch: Partial<EditableTask>) => {
    setEditableTasks((prev) =>
      prev.map((t) => (t._key === key ? { ...t, ...patch } : t))
    );
  };

  const removeTask = (key: string) => {
    setEditableTasks((prev) => prev.filter((t) => t._key !== key));
  };

  const handleApprove = () => {
    const toCreate: ProposedTask[] = approvedTasks.map(
      ({ _key: _k, included: _i, rationaleExpanded: _r, ...rest }) => rest
    );
    onApprove(toCreate);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !isApproving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">
                  Kickoff Plan — {clientName}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Review and approve the proposed Q1 tasks before they are added to the engagement.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable task list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {personalizationLevel === "methodology-only" && (
            <div className="rounded-md border border-amber-400/40 bg-amber-50/10 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                Generated from TFO methodology only — no relevant excerpts were found in this client's Data Room. Review tasks carefully before approving.
              </p>
            </div>
          )}
          {editableTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All tasks have been removed. Add tasks back or cancel.
            </p>
          ) : (
            editableTasks.map((task) => (
              <TaskCard
                key={task._key}
                task={task}
                onToggleIncluded={() =>
                  updateTask(task._key, { included: !task.included })
                }
                onTitleChange={(value) =>
                  updateTask(task._key, { title: value })
                }
                onToggleAssignee={() =>
                  updateTask(task._key, {
                    assignee: task.assignee === "advisor" ? "client" : "advisor",
                  })
                }
                onCyclePriority={() => {
                  const idx = PRIORITY_CYCLE.indexOf(task.priority);
                  const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
                  updateTask(task._key, { priority: next });
                }}
                onToggleRationale={() =>
                  updateTask(task._key, {
                    rationaleExpanded: !task.rationaleExpanded,
                  })
                }
                onRemove={() => removeTask(task._key)}
              />
            ))
          )}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {approvedCount > 0
              ? `${approvedCount} task${approvedCount !== 1 ? "s" : ""} selected`
              : "No tasks selected"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approvedCount === 0 || isApproving}
              className="gap-1.5"
            >
              {isApproving ? (
                "Creating tasks..."
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Approve {approvedCount} Task{approvedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
