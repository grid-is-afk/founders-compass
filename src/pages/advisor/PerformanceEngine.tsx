import { useClientContext } from "@/hooks/useClientContext";
import { useClientTasks } from "@/hooks/useTasks";
import { Target, CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="w-4 h-4 text-primary" />,
  in_progress: <Clock className="w-4 h-4 text-accent" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground" />,
};

interface DbTask {
  id: string;
  title: string;
  assignee: string | null;
  assignee_name: string | null;
  status: string;
  priority: string;
  due_date: string | null;
}

const PerformanceEngine = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawTasks = [] } = useClientTasks(selectedClientId);
  const clientName = selectedClient?.name || "your client";

  const tasks = (rawTasks as DbTask[]).map((t) => ({
    id: t.id,
    title: t.title,
    assignee: t.assignee_name ?? t.assignee ?? null,
    status: t.status ?? "todo",
    dueDate: t.due_date ?? "",
  }));

  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Performance & Execution</h1>
        <p className="text-muted-foreground mt-1 text-sm">Turn strategy into disciplined 90-day execution sprints — {clientName}</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No performance data yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sprint tasks, KPI tracking, and execution metrics will appear here once you create tasks for this client.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-display font-semibold text-foreground">Sprint Tasks</h2>
            <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length} complete</span>
          </div>
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-4">
                {statusIcon[task.status] || statusIcon.todo}
                <p className={cn("text-sm flex-1", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p>
                {task.assignee && <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{task.assignee}</span>}
                {task.dueDate && <span className="text-xs text-muted-foreground">{task.dueDate}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceEngine;
