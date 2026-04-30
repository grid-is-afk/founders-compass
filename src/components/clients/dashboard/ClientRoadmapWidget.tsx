import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientRoadmapWidgetProps {
  clientId: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  phase: string | null;
  assignee: string | null;
  assignee_name: string | null;
  priority: string;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  TaskRow["status"],
  { label: string; className: string }
> = {
  todo: { label: "To Do", className: "bg-muted text-muted-foreground border-border/60" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  blocked: { label: "Blocked", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientRoadmapWidget({ clientId }: ClientRoadmapWidgetProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: rawTasks = [], isLoading } = useClientTasks(clientId);

  const tasks = (rawTasks as TaskRow[]).slice(0, 8);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-10 rounded bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          No tasks yet — start Q1 to generate tasks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Task</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                Phase
              </th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
              return (
                <tr
                  key={task.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-foreground max-w-[200px] truncate">
                    {task.title}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", cfg.className)}>
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {task.phase ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">
                        {task.phase}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell text-muted-foreground">
                    {task.assignee_name ?? task.assignee ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/advisor/clients/${id ?? clientId}/discover`)}
        >
          View All
        </Button>
      </div>
    </div>
  );
}
