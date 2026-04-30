import { useState, useRef } from "react";
import {
  Map,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  Zap,
  ArrowRight,
  Sparkles,
  Upload,
  FileText,
} from "lucide-react";
import Papa from "papaparse";
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
  notes: string | null;
}

const DOMAIN_FILTERS = ["All", "Discover", "Protect", "Grow", "Prove & Align"] as const;
type DomainFilter = typeof DOMAIN_FILTERS[number];

// ---------------------------------------------------------------------------
// CSV Import Types
// ---------------------------------------------------------------------------

type ImportStep = 1 | 2 | 3;

interface CsvImportField {
  key: "title" | "assignee" | "due_date" | "priority" | "domain" | "notes";
  label: string;
  required: boolean;
}

interface ColumnMapping {
  title: string;
  assignee: string;
  due_date: string;
  priority: string;
  domain: string;
  notes: string;
}

interface ValidatedImportRow {
  title: string;
  assignee: string | null;
  due_date: string | null;
  priority: string;
  domain: Domain;
  notes: string | null;
}

const IMPORT_FIELDS: CsvImportField[] = [
  { key: "title",    label: "Task Title",             required: true  },
  { key: "assignee", label: "Assignee",               required: false },
  { key: "due_date", label: "Due Date (YYYY-MM-DD)",  required: false },
  { key: "priority", label: "Priority",               required: false },
  { key: "domain",   label: "Domain",                 required: false },
  { key: "notes",    label: "Notes",                  required: false },
];

const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const VALID_DOMAINS    = new Set<string>(["Discover", "Protect", "Grow", "Prove & Align"]);

const SAMPLE_CSV_CONTENT = [
  "title,assignee,due_date,priority,domain,notes",
  "Set up legal entity,Jane Smith,2024-06-01,high,Discover,Consult with attorney on LLC vs C-Corp",
  "Build financial model,John Doe,2024-07-15,medium,Grow,3-year projection with scenario analysis",
].join("\n");

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
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);

  // Add task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState<Domain>("Discover");
  const [newStatus, setNewStatus] = useState<TaskStatus>("todo");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Edit task form state
  const [editTitle, setEditTitle] = useState("");
  const [editDomain, setEditDomain] = useState<Domain>("Discover");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // CSV import state
  const [importOpen, setImportOpen]           = useState(false);
  const [importStep, setImportStep]           = useState<ImportStep>(1);
  const [csvHeaders, setCsvHeaders]           = useState<string[]>([]);
  const [csvRows, setCsvRows]                 = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping]     = useState<ColumnMapping>({
    title: "", assignee: "", due_date: "", priority: "", domain: "", notes: "",
  });
  const [validatedRows, setValidatedRows]     = useState<ValidatedImportRow[]>([]);
  const [skippedCount, setSkippedCount]       = useState(0);
  const [importProgress, setImportProgress]   = useState<number | null>(null);
  const [isDragOver, setIsDragOver]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    notes:    t.notes ?? null,
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
        notes:     newNotes.trim() || null,
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
          setNewNotes("");
        },
      }
    );
  };

  const handleOpenEdit = (task: RoadmapTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDomain((task.phase ?? "Discover") as Domain);
    setEditStatus(task.status);
    setEditAssignee(task.assignee ?? "");
    setEditDueDate(task.due_date ?? "");
    setEditNotes(task.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editingTask || !editTitle.trim()) return;
    updateTask.mutate(
      {
        id:       editingTask.id,
        clientId: selectedClientId,
        title:    editTitle.trim(),
        phase:    editDomain,
        status:   editStatus,
        assignee: editAssignee.trim() || null,
        due_date: editDueDate || null,
        notes:    editNotes.trim() || null,
      },
      {
        onSuccess: () => {
          toast("Task updated");
          setEditingTask(null);
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // CSV Import Handlers
  // ---------------------------------------------------------------------------

  const resetImport = () => {
    setImportStep(1);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({ title: "", assignee: "", due_date: "", priority: "", domain: "", notes: "" });
    setValidatedRows([]);
    setSkippedCount(0);
    setImportProgress(null);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportClose = () => {
    setImportOpen(false);
    resetImport();
  };

  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { title: "", assignee: "", due_date: "", priority: "", domain: "", notes: "" };
    for (const field of IMPORT_FIELDS) {
      const matched = headers.find((h) => h.toLowerCase() === field.key.toLowerCase());
      if (matched) mapping[field.key] = matched;
    }
    return mapping;
  };

  const parseCsvFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const rows    = result.data;
        setCsvHeaders(headers);
        setCsvRows(rows);
        setColumnMapping(autoDetectMapping(headers));
        setImportStep(2);
      },
      error: () => {
        toast.error("Failed to parse CSV file. Please check the file format.");
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsvFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      parseCsvFile(file);
    } else {
      toast.error("Please drop a CSV file.");
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "tasks-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMappingNext = () => {
    const validated: ValidatedImportRow[] = [];
    let skipped = 0;

    for (const row of csvRows) {
      const rawTitle = columnMapping.title ? (row[columnMapping.title] ?? "").trim() : "";
      if (!rawTitle) { skipped++; continue; }

      const rawPriority = columnMapping.priority ? (row[columnMapping.priority] ?? "").trim().toLowerCase() : "";
      const priority    = VALID_PRIORITIES.has(rawPriority) ? rawPriority : "medium";

      const rawDomain = columnMapping.domain ? (row[columnMapping.domain] ?? "").trim() : "";
      const domain    = (VALID_DOMAINS.has(rawDomain) ? rawDomain : "Discover") as Domain;

      const rawDate   = columnMapping.due_date ? (row[columnMapping.due_date] ?? "").trim() : "";
      let   due_date: string | null = null;
      if (rawDate) {
        const parsed = new Date(rawDate);
        due_date = isNaN(parsed.getTime()) ? null : rawDate;
      }

      const rawAssignee = columnMapping.assignee ? (row[columnMapping.assignee] ?? "").trim() : "";
      const rawNotes    = columnMapping.notes    ? (row[columnMapping.notes]    ?? "").trim() : "";

      validated.push({
        title:    rawTitle,
        assignee: rawAssignee || null,
        due_date,
        priority,
        domain,
        notes:    rawNotes || null,
      });
    }

    setValidatedRows(validated);
    setSkippedCount(skipped);
    setImportStep(3);
  };

  const handleImportTasks = async () => {
    setImportProgress(0);
    let successCount = 0;

    for (let i = 0; i < validatedRows.length; i++) {
      const row = validatedRows[i];
      setImportProgress(i + 1);
      try {
        await createTask.mutateAsync({
          client_id: selectedClientId,
          title:     row.title,
          assignee:  row.assignee,
          due_date:  row.due_date,
          priority:  row.priority,
          phase:     row.domain,
          notes:     row.notes,
        });
        successCount++;
      } catch {
        toast.error(`Failed to import: "${row.title}"`);
      }
    }

    setImportProgress(null);
    handleImportClose();
    toast.success(`${successCount} task${successCount !== 1 ? "s" : ""} imported successfully`);
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
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
                      {task.notes && (
                        <span className="truncate block text-muted-foreground font-normal mt-0.5">
                          {task.notes}
                        </span>
                      )}
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
                          onClick={() => handleOpenEdit(task)}
                          title="Edit task"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Add context, blockers, or anything relevant..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
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

      {/* ── Import CSV Dialog ─────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) handleImportClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {importStep === 1 && "Import Tasks — Upload CSV"}
              {importStep === 2 && "Import Tasks — Map Columns"}
              {importStep === 3 && "Import Tasks — Preview & Import"}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-1">
            {([1, 2, 3] as ImportStep[]).map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                  importStep === step
                    ? "bg-accent text-accent-foreground"
                    : importStep > step
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={cn(
                    "h-px w-8 transition-colors",
                    importStep > step ? "bg-emerald-500" : "bg-border"
                  )} />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-1">Step {importStep} of 3</span>
          </div>

          {/* Step content — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* ── Step 1: Upload ── */}
            {importStep === 1 && (
              <div className="space-y-4 py-2">
                {/* Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                    isDragOver
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50 hover:bg-muted/30"
                  )}
                >
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop your CSV here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported format: .csv
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Template download */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Not sure about the format?</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
                  >
                    Download sample template
                  </button>
                </div>

                {/* Expected columns info */}
                <div className="bg-muted/40 rounded-md p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground mb-2">Expected CSV columns</p>
                  {IMPORT_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 text-xs">
                      <code className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-[11px]">
                        {f.key}
                      </code>
                      <span className="text-muted-foreground">{f.label}</span>
                      {f.required && (
                        <span className="text-destructive font-semibold">required</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Map Columns ── */}
            {importStep === 2 && (
              <div className="space-y-5 py-2">
                <p className="text-sm text-muted-foreground">
                  Match your CSV columns to the task fields below. Auto-detection has been applied where possible.
                </p>

                {/* Field mapping selects */}
                <div className="space-y-3">
                  {IMPORT_FIELDS.map((field) => (
                    <div key={field.key} className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                      </div>
                      <Select
                        value={columnMapping[field.key]}
                        onValueChange={(v) =>
                          setColumnMapping((prev) => ({ ...prev, [field.key]: v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="— Not mapped —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Not mapped —</SelectItem>
                          {csvHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* CSV preview — first 3 rows */}
                {csvRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Preview (first 3 rows)</p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border">
                            {csvHeaders.map((h) => (
                              <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-b border-border/60 last:border-0">
                              {csvHeaders.map((h) => (
                                <td key={h} className="px-2 py-1.5 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">
                                  {row[h] ?? ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {csvRows.length} total rows in file
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Preview & Import ── */}
            {importStep === 3 && (
              <div className="space-y-4 py-2">
                {/* Summary */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-foreground">
                    {validatedRows.length} task{validatedRows.length !== 1 ? "s" : ""} will be imported.
                  </span>
                  {skippedCount > 0 && (
                    <span className="text-muted-foreground">
                      {skippedCount} row{skippedCount !== 1 ? "s" : ""} skipped (empty title).
                    </span>
                  )}
                </div>

                {/* Progress indicator */}
                {importProgress !== null && (
                  <div className="bg-accent/10 border border-accent/20 rounded-md px-4 py-3 text-sm font-medium text-accent">
                    Importing {importProgress} of {validatedRows.length}...
                  </div>
                )}

                {/* Preview table */}
                {validatedRows.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No valid rows to import. Go back and check your column mapping.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Title</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Domain</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Priority</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Assignee</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Due Date</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validatedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 font-medium text-foreground max-w-[160px] truncate">{row.title}</td>
                            <td className="px-3 py-2">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                domainColors[row.domain]
                              )}>
                                {row.domain}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground capitalize">{row.priority}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.assignee ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.due_date ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{row.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validatedRows.length > 10 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                        + {validatedRows.length - 10} more rows not shown
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t border-border mt-2">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onClick={handleImportClose}
                disabled={importProgress !== null}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {importStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setImportStep((s) => (s - 1) as ImportStep)}
                    disabled={importProgress !== null}
                  >
                    Back
                  </Button>
                )}
                {importStep === 2 && (
                  <Button
                    onClick={handleMappingNext}
                    disabled={!columnMapping.title}
                  >
                    Next
                  </Button>
                )}
                {importStep === 3 && (
                  <Button
                    onClick={handleImportTasks}
                    disabled={validatedRows.length === 0 || importProgress !== null}
                  >
                    {importProgress !== null
                      ? `Importing ${importProgress} of ${validatedRows.length}...`
                      : `Import ${validatedRows.length} Task${validatedRows.length !== 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Task Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Task title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              />
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Domain</label>
              <Select value={editDomain} onValueChange={(v) => setEditDomain(v as Domain)}>
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
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TaskStatus)}>
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
                value={editAssignee}
                onChange={(e) => setEditAssignee(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Add context, blockers, or anything relevant..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || updateTask.isPending}
            >
              {updateTask.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CapitalStrategyRoadmap;
