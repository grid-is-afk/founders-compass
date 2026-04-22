import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChecklistItem } from "./ChecklistItem";
import { api } from "@/lib/api";
import {
  useDiagnoseActionItems,
  useGenerateDiagnoseActionItems,
  type DiagnoseTask,
} from "@/hooks/useDiagnoseActionItems";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiagnoseActionPlanProps {
  clientId: string;
  allAssessmentsComplete: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPriorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1) + " Priority";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiagnoseActionPlan({
  clientId,
  allAssessmentsComplete,
}: DiagnoseActionPlanProps) {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useDiagnoseActionItems(clientId);
  const generate = useGenerateDiagnoseActionItems(clientId);

  // Don't render until all 3 assessments are complete
  if (!allAssessmentsComplete) return null;

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync();
      toast.success("Action plan generated", {
        description: "QB AI has created your prioritized action items.",
      });
    } catch {
      toast.error("Failed to generate action plan", {
        description: "Please try again.",
      });
    }
  };

  const handleToggleTask = async (task: DiagnoseTask) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      queryClient.invalidateQueries({
        queryKey: ["diagnose-action-items", clientId],
      });
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="border-t border-border/40 pt-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          QB AI Action Plan
        </span>
        {tasks.length > 0 && !generate.isPending && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {/* Loading state — generation in progress */}
      {generate.isPending && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          QB AI is analyzing your results...
        </div>
      )}

      {/* Initial loading state — fetching existing tasks */}
      {isLoading && !generate.isPending && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-md bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state — no items yet */}
      {!isLoading && !generate.isPending && tasks.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate an AI-powered action plan based on your diagnostic results.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Action Plan
          </Button>
        </div>
      )}

      {/* Items list */}
      {!isLoading && !generate.isPending && tasks.length > 0 && (
        <div className="divide-y divide-border/30">
          {tasks.map((task) => (
            <ChecklistItem
              key={task.id}
              label={task.title}
              category={formatPriorityLabel(task.priority)}
              isDone={task.status === "done"}
              subtasks={[]}
              onToggle={() => handleToggleTask(task)}
              onSubtasksChange={() => {
                /* no-op: action items have no subtasks */
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
