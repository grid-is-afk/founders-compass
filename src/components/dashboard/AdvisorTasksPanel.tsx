import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Clock, AlertCircle, Minus, ExternalLink } from "lucide-react";
import { useAdvisorTasks, useUpdateAdvisorTask, type AdvisorTask } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CYCLE: AdvisorTask["status"][] = ["todo", "in_progress", "done", "blocked"];

const STATUS_CONFIG: Record<AdvisorTask["status"], { label: string; icon: React.ElementType; className: string }> = {
  todo:        { label: "To Do",      icon: Circle,       className: "text-muted-foreground" },
  in_progress: { label: "In Progress",icon: Clock,        className: "text-blue-500" },
  done:        { label: "Done",       icon: CheckCircle2, className: "text-emerald-500" },
  blocked:     { label: "Blocked",    icon: AlertCircle,  className: "text-destructive" },
};

const PRIORITY_CONFIG: Record<AdvisorTask["priority"], { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high:   { label: "High",   className: "bg-amber-400/10 text-amber-700 border-amber-400/20" },
  medium: { label: "Medium", className: "bg-blue-400/10 text-blue-700 border-blue-400/20" },
  low:    { label: "Low",    className: "bg-muted text-muted-foreground border-border" },
};

const CLIENT_COLORS = [
  "bg-violet-500/10 text-violet-700 border-violet-500/20",
  "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "bg-pink-500/10 text-pink-700 border-pink-500/20",
];

function clientColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Filter pill
// ---------------------------------------------------------------------------

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

function TaskRow({ task, onStatusChange }: { task: AdvisorTask; onStatusChange: (id: string, status: AdvisorTask["status"]) => void }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[task.status];
  const Icon = cfg.icon;
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
  const isOverdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

  return (
    <tr className="border-b border-border last:border-0 group hover:bg-muted/20 transition-colors">
      {/* Status toggle */}
      <td className="px-3 py-3 w-8">
        <button
          title={`Mark as ${STATUS_CONFIG[nextStatus].label}`}
          onClick={() => onStatusChange(task.id, nextStatus)}
          className={cn("w-5 h-5 flex items-center justify-center rounded-full hover:scale-110 transition-transform", cfg.className)}
        >
          <Icon className="w-4 h-4" />
        </button>
      </td>

      {/* Title */}
      <td className="px-2 py-3">
        <span className={cn("text-sm text-foreground", task.status === "done" && "line-through text-muted-foreground")}>
          {task.title}
        </span>
        {task.notes && (
          <p className="text-[11px] text-muted-foreground truncate max-w-xs">{task.notes}</p>
        )}
      </td>

      {/* Client badge */}
      <td className="px-2 py-3">
        <button
          onClick={() => navigate(`/advisor/clients/${task.client_id}`)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap hover:opacity-80 transition-opacity",
            clientColor(task.client_id)
          )}
        >
          {task.client_name}
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </td>

      {/* Priority */}
      <td className="px-2 py-3">
        <span className={cn(
          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border",
          PRIORITY_CONFIG[task.priority].className
        )}>
          {PRIORITY_CONFIG[task.priority].label}
        </span>
      </td>

      {/* Due date */}
      <td className="px-3 py-3 text-right">
        {task.due_date ? (
          <span className={cn("text-xs tabular-nums", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
            {isOverdue ? "Overdue · " : ""}
            {format(parseISO(task.due_date), "MMM d")}
          </span>
        ) : (
          <Minus className="w-3 h-3 text-muted-foreground/40 ml-auto" />
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const PRIORITY_FILTERS = [
  { label: "All Priorities", value: "" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

const PRIORITY_RANK: Record<AdvisorTask["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortTasks(tasks: AdvisorTask[]): AdvisorTask[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = a.due_date && a.status !== "done" && isPast(parseISO(a.due_date));
    const bOverdue = b.due_date && b.status !== "done" && isPast(parseISO(b.due_date));

    // Tier 1: overdue + urgent
    const aTier1 = aOverdue && a.priority === "urgent";
    const bTier1 = bOverdue && b.priority === "urgent";
    if (aTier1 !== bTier1) return aTier1 ? -1 : 1;

    // Tier 2: overdue (any priority)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    // Tier 3: priority rank
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;

    // Tier 4: due date ascending, nulls last
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function AdvisorTasksPanel() {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // Filtered tasks for display
  const { data: tasks = [], isLoading } = useAdvisorTasks({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    clientId: clientFilter || undefined,
  });

  // Unfiltered tasks for computing global stats
  const { data: allTasks = [] } = useAdvisorTasks();

  const updateTask = useUpdateAdvisorTask();

  const handleStatusChange = async (id: string, status: AdvisorTask["status"]) => {
    try {
      await updateTask.mutateAsync({ id, status });
    } catch {
      toast.error("Failed to update task");
    }
  };

  // Derive unique clients from full task list for client filter dropdown
  const uniqueClients = Array.from(
    new Map(allTasks.map((t) => [t.client_id, t.client_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  // Global stats from unfiltered tasks
  const urgentCount = allTasks.filter(
    (t) => t.priority === "urgent" && t.status !== "done"
  ).length;
  const overdueCount = allTasks.filter(
    (t) => t.due_date && t.status !== "done" && isPast(parseISO(t.due_date))
  ).length;
  const inProgressCount = allTasks.filter((t) => t.status === "in_progress").length;

  const sortedTasks = sortTasks(tasks);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-display font-semibold text-foreground">All Tasks</h2>
          {/* Stats bar */}
          {allTasks.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              {urgentCount > 0 && (
                <span className="text-destructive font-medium">{urgentCount} urgent</span>
              )}
              {overdueCount > 0 && (
                <span className="text-amber-600 font-medium">{overdueCount} overdue</span>
              )}
              {inProgressCount > 0 && (
                <span className="text-blue-600 font-medium">{inProgressCount} in progress</span>
              )}
              {urgentCount === 0 && overdueCount === 0 && inProgressCount === 0 && (
                <span className="text-muted-foreground">All clear</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Client filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Clients</option>
            {uniqueClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          />
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks match the current filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 px-3 py-2" />
                <th className="text-left px-2 py-2 font-medium text-muted-foreground text-xs">Task</th>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground text-xs">Client</th>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground text-xs">Priority</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">Due</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
