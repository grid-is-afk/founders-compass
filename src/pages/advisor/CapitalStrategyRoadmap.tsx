import { useState } from "react";
import {
  Map,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import {
  useClientTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import CopilotMessages from "@/components/copilot/CopilotMessages";
import CopilotInput from "@/components/copilot/CopilotInput";
import CopilotSuggestions from "@/components/copilot/CopilotSuggestions";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type Domain = "Discover" | "Protect" | "Grow" | "Prove & Align";
type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

interface RoadmapTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string | null;
  due_date: string | null;
  phase: Domain | null;
  priority: string;
}

const DOMAIN_FILTERS = ["All", "Discover", "Protect", "Grow", "Prove & Align"] as const;
type DomainFilter = typeof DOMAIN_FILTERS[number];

const STATUS_CYCLE: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];

const domainColors: Record<Domain, string> = {
  Discover:        "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Protect:         "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Grow:            "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Prove & Align": "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

const statusColors: Record<TaskStatus, string> = {
  todo:        "bg-muted text-muted-foreground border-border",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  done:        "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  blocked:     "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels: Record<TaskStatus, string> = {
  todo:        "To Do",
  in_progress: "In Progress",
  done:        "Done",
  blocked:     "Blocked",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CapitalStrategyRoadmap = () => {
  const { selectedClient, selectedClientId } = useClientContext();
  const { data: rawTasks = [], isLoading } = useClientTasks(selectedClientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { messages, clearConversation, sendMessage } = useCopilotContext();

  // UI state
  const [activeFilter, setActiveFilter] = useState<DomainFilter>("All");
  const [actionsOpen, setActionsOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Add task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState<Domain>("Discover");
  const [newStatus, setNewStatus] = useState<TaskStatus>("todo");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const tasks: RoadmapTask[] = (rawTasks as any[]).map((t) => ({
    id:       t.id,
    title:    t.title,
    status:   (t.status ?? "todo") as TaskStatus,
    assignee: t.assignee ?? null,
    due_date: t.due_date ?? null,
    phase:    (t.phase ?? null) as Domain | null,
    priority: t.priority ?? "medium",
  }));

  const total       = tasks.length;
  const doneCount   = tasks.filter((t) => t.status === "done").length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const priorityActions = tasks
    .filter((t) => {
      if (t.status === "done") return false;
      const isOverdue     = !!t.due_date && new Date(t.due_date) < today;
      const isHighPriority = t.priority === "high" || t.priority === "urgent";
      return isOverdue || isHighPriority;
    })
    .sort((a, b) => {
      const urgency: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (urgency[a.priority] ?? 2) - (urgency[b.priority] ?? 2);
    })
    .slice(0, 5);

  const filteredTasks =
    activeFilter === "All"
      ? tasks
      : tasks.filter((t) => t.phase === activeFilter);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCycleStatus = (task: RoadmapTask) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
    updateTask.mutate(
      { id: task.id, clientId: selectedClientId, status: next },
      { onSuccess: () => toast("Status updated") }
    );
  };

  const handleDelete = (task: RoadmapTask) => {
    deleteTask.mutate(
      { id: task.id, clientId: selectedClientId },
      { onSuccess: () => toast("Task deleted") }
    );
  };

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    createTask.mutate(
      {
        client_id: selectedClientId,
        title:     newTitle.trim(),
        phase:     newDomain,
        status:    newStatus,
        assignee:  newAssignee.trim() || null,
        due_date:  newDueDate || null,
      },
      {
        onSuccess: () => {
          toast("Task created");
          setDialogOpen(false);
          setNewTitle("");
          setNewDomain("Discover");
          setNewStatus("todo");
          setNewAssignee("");
          setNewDueDate("");
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex gap-6 h-[calc(100vh-3.5rem-4rem)]">

      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="w-[60%] flex flex-col space-y-4 overflow-y-auto min-w-0 pb-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
              <Map className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Capital Strategy Architecture — Roadmap
              </h1>
              <p className="text-sm text-muted-foreground">
                Project roadmap for {selectedClient.name}
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        {/* Engagement Progress */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Engagement Progress</p>
            <span className="text-sm font-bold font-display text-foreground">{progressPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "No tasks yet — add your first task to track progress"
              : `${doneCount} of ${total} tasks complete`}
          </p>
        </div>

        {/* Priority Actions accordion */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-shrink-0">
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Priority Actions</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold">
                {priorityActions.length}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                actionsOpen && "rotate-180"
              )}
            />
          </button>

          {actionsOpen && (
            <div className="border-t border-border">
              {priorityActions.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No high-priority or overdue tasks
                </p>
              ) : (
                priorityActions.map((task, i) => {
                  const isOverdue = !!task.due_date && new Date(task.due_date) < today;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0",
                        isOverdue
                          ? "bg-red-500/5 border-l-2 border-l-red-500"
                          : "bg-amber-500/5 border-l-2 border-l-amber-500"
                      )}
                    >
                      <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        {task.phase && (
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-0.5",
                            domainColors[task.phase]
                          )}>
                            {task.phase}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Full Project Tasks heading */}
        <div className="flex-shrink-0">
          <h2 className="text-lg font-display font-semibold text-foreground">Full Project Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All tasks for {selectedClient.name}, filtered by domain</p>
        </div>

        {/* Domain filter tabs */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit flex-shrink-0">
          {DOMAIN_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeFilter === filter
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Task table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Domain</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading tasks...
                  </td>
                </tr>
              )}
              {!isLoading && filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Map className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {activeFilter === "All" ? "No tasks yet" : `No ${activeFilter} tasks`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeFilter === "All"
                        ? "Add a task to get started."
                        : `No tasks tagged with the "${activeFilter}" domain.`}
                    </p>
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* Title */}
                    <td className="px-4 py-3 font-medium text-foreground text-xs max-w-[200px]">
                      <span className="truncate block">{task.title}</span>
                    </td>

                    {/* Domain */}
                    <td className="px-4 py-3">
                      {task.phase ? (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-2 py-0 font-medium", domainColors[task.phase])}
                        >
                          {task.phase}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-2 py-0 font-medium", statusColors[task.status])}
                      >
                        {statusLabels[task.status]}
                      </Badge>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {task.assignee ?? "—"}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day:   "numeric",
                            year:  "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCycleStatus(task)}
                          title="Advance status"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task)}
                          title="Delete task"
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right column — QB AI chat ────────────────────────────────────── */}
      <div className="w-[40%] flex-shrink-0 flex flex-col bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-gold flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
            <span className="font-display text-base font-semibold text-foreground">Quarterback</span>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-xs text-muted-foreground h-7"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-5 py-8">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1 text-center">
                How can I help?
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-6">
                Ask me about this client's roadmap, priorities, or next steps.
              </p>
              <CopilotSuggestions onSelect={sendMessage} />
            </div>
          ) : (
            <CopilotMessages />
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border">
          <CopilotInput />
        </div>
      </div>

      {/* ── Add Task Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
              />
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Domain</label>
              <Select value={newDomain} onValueChange={(v) => setNewDomain(v as Domain)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Discover">Discover</SelectItem>
                  <SelectItem value="Protect">Protect</SelectItem>
                  <SelectItem value="Grow">Grow</SelectItem>
                  <SelectItem value="Prove & Align">Prove &amp; Align</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Assignee</label>
              <Input
                placeholder="Name or email"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTitle.trim() || createTask.isPending}
            >
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CapitalStrategyRoadmap;
