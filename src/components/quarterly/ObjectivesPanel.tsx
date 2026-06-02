import { useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  Target,
  Sparkles,
  Trophy,
  X,
  Check,
  Ban,
  Link2,
  Unlink,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientTasks, useUpdateTask } from "@/hooks/useTasks";
import {
  useClientObjectives,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  type QuarterlyObjective,
  type ObjectiveStatus,
} from "@/hooks/useQuarterlyObjectives";

// ---------------------------------------------------------------------------
// Status presentation — built-in Badge variants only (no custom palette).
// ---------------------------------------------------------------------------
const STATUS_META: Record<
  ObjectiveStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  proposed: { label: "Proposed", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  achieved: { label: "Achieved", variant: "outline" },
  dropped: { label: "Dropped", variant: "outline" },
};

function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

// Minimal shape of a task we rely on for linking.
interface TaskLite {
  id: string;
  title: string;
  status: string;
  objective_id: string | null;
}

// A small status dot for a linked/linkable task.
function taskStatusDot(status: string): string {
  if (status === "done") return "bg-emerald-500";
  if (status === "in_progress") return "bg-amber-500";
  if (status === "blocked") return "bg-red-500";
  return "bg-muted-foreground/40"; // todo
}

// ---------------------------------------------------------------------------
// Single objective row — actions adapt to status (To do / Achieved / Dropped)
// ---------------------------------------------------------------------------
function ObjectiveRow({ obj, tasks }: { obj: QuarterlyObjective; tasks: TaskLite[] }) {
  const update = useUpdateObjective();
  const remove = useDeleteObjective();
  const updateTask = useUpdateTask();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(obj.title);

  const meta = STATUS_META[obj.status];
  const isActive = obj.status === "proposed" || obj.status === "confirmed";

  const linkedTasks = tasks.filter((t) => t.objective_id === obj.id);
  // Only active, unlinked tasks are linkable (hide done/skipped noise).
  const linkableTasks = tasks.filter(
    (t) => !t.objective_id && t.status !== "done" && t.status !== "skipped"
  );
  const isOrphan = obj.status === "confirmed" && linkedTasks.length === 0;

  const setStatus = (status: ObjectiveStatus) =>
    update.mutate(
      { id: obj.id, clientId: obj.client_id, status },
      { onError: (e) => toast.error((e as Error).message) }
    );

  const linkTask = (taskId: string) =>
    updateTask.mutate(
      { id: taskId, clientId: obj.client_id, objective_id: obj.id },
      { onError: (e) => toast.error((e as Error).message) }
    );

  const unlinkTask = (taskId: string) =>
    updateTask.mutate(
      { id: taskId, clientId: obj.client_id, objective_id: null },
      { onError: (e) => toast.error((e as Error).message) }
    );

  const saveTitle = () => {
    const next = draft.trim();
    if (!next) {
      toast.error("Objective can't be empty");
      return;
    }
    update.mutate(
      { id: obj.id, clientId: obj.client_id, title: next },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3",
        obj.status === "dropped" && "opacity-60"
      )}
    >
      {/* Top row: title + status-aware actions */}
      <div className="group flex items-start gap-3">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
                className="h-8"
              />
              <Button size="sm" className="gap-1" onClick={saveTitle} disabled={update.isPending}>
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => {
                  setDraft(obj.title);
                  setEditing(false);
                }}
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  "text-sm text-foreground",
                  obj.status === "dropped" && "line-through"
                )}
              >
                {obj.title}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant={meta.variant} className="text-[10px]">
                  {meta.label}
                </Badge>
                {obj.source === "extracted" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> AI-suggested
                  </span>
                )}
                {isOrphan && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> No supporting tasks
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {obj.status === "proposed" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("confirmed")}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
              </Button>
            )}
            {obj.status === "confirmed" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("achieved")}>
                <Trophy className="h-3.5 w-3.5" /> Achieved
              </Button>
            )}
            {isActive && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("dropped")}>
                <Ban className="h-3.5 w-3.5" /> Drop
              </Button>
            )}
            {obj.status === "achieved" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("confirmed")}>
                <RotateCcw className="h-3.5 w-3.5" /> Reopen
              </Button>
            )}
            {obj.status === "dropped" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("confirmed")}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            )}
            {isActive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2"
                onClick={() => {
                  setDraft(obj.title);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
              onClick={() =>
                remove.mutate(
                  { id: obj.id, clientId: obj.client_id },
                  { onError: (e) => toast.error((e as Error).message) }
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Supporting tasks + linking — only for active objectives (To do tab) */}
      {!editing && isActive && (
        <div className="mt-2 space-y-1.5 pl-7">
          {linkedTasks.map((t) => (
            <div key={t.id} className="group/task flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", taskStatusDot(t.status))} />
              <span className={cn("truncate text-foreground/80", t.status === "done" && "line-through")}>
                {t.title}
              </span>
              <button
                onClick={() => unlinkTask(t.id)}
                className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/task:opacity-100"
              >
                <Unlink className="h-3 w-3" /> Unlink
              </button>
            </div>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                disabled={linkableTasks.length === 0}
              >
                <Link2 className="h-3.5 w-3.5" />
                {linkableTasks.length === 0 ? "No tasks to link" : "Link task"}
              </Button>
            </DropdownMenuTrigger>
            {linkableTasks.length > 0 && (
              <DropdownMenuContent align="start" className="max-h-64 w-72 overflow-y-auto">
                {linkableTasks.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => linkTask(t.id)} className="gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", taskStatusDot(t.status))} />
                    <span className="truncate">{t.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-objective inline form (scoped to a specific quarter/year)
// ---------------------------------------------------------------------------
function AddObjectiveForm({
  clientId,
  quarter,
  year,
}: {
  clientId: string;
  quarter: number;
  year: number;
}) {
  const create = useCreateObjective();
  const [title, setTitle] = useState("");

  const submit = () => {
    const next = title.trim();
    if (!next) return;
    create.mutate(
      { client_id: clientId, quarter, year, title: next },
      {
        onSuccess: () => setTitle(""),
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add an objective the founder committed to…"
        className="h-9"
      />
      <Button className="gap-1" onClick={submit} disabled={create.isPending || !title.trim()}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped list of objectives (by quarter/year), shared across tabs
// ---------------------------------------------------------------------------
function ObjectiveGroups({
  objectives,
  tasks,
  clientId,
  showAdd,
}: {
  objectives: QuarterlyObjective[];
  tasks: TaskLite[];
  clientId: string;
  showAdd: boolean;
}) {
  const groups: { quarter: number; year: number; items: QuarterlyObjective[] }[] = [];
  for (const obj of objectives) {
    let g = groups.find((x) => x.quarter === obj.quarter && x.year === obj.year);
    if (!g) {
      g = { quarter: obj.quarter, year: obj.year, items: [] };
      groups.push(g);
    }
    g.items.push(obj);
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={`${g.year}-${g.quarter}`} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Q{g.quarter} {g.year}
          </p>
          {g.items.map((obj) => (
            <ObjectiveRow key={obj.id} obj={obj} tasks={tasks} />
          ))}
          {showAdd && <AddObjectiveForm clientId={clientId} quarter={g.quarter} year={g.year} />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel — tabbed (To do / Achieved / Dropped), Intelligence-Panel styling
// ---------------------------------------------------------------------------
export default function ObjectivesPanel({ clientId }: { clientId: string }) {
  const { data: objectives = [], isLoading } = useClientObjectives(clientId);
  const { data: rawTasks = [] } = useClientTasks(clientId);
  const tasks = rawTasks as TaskLite[];

  const todo = objectives.filter((o) => o.status === "proposed" || o.status === "confirmed");
  const achieved = objectives.filter((o) => o.status === "achieved");
  const dropped = objectives.filter((o) => o.status === "dropped");

  const fallbackQuarter = currentQuarter();
  const fallbackYear = new Date().getFullYear();

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold text-foreground">Quarterly Objectives</h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading objectives…</p>
      ) : (
        <Tabs defaultValue="todo">
          <TabsList className="mb-4">
            <TabsTrigger value="todo" className="flex items-center gap-1.5">
              To do
              {todo.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {todo.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="achieved" className="flex items-center gap-1.5">
              Achieved
              {achieved.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {achieved.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dropped" className="flex items-center gap-1.5">
              Dropped
              {dropped.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {dropped.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo">
            {todo.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No objectives in progress. They appear here as{" "}
                  <span className="font-medium text-foreground">AI-suggested</span> when you generate a
                  quarterly review prep (confirmed once the founder approves the review) — or add one
                  the founder committed to below.
                </p>
                <AddObjectiveForm clientId={clientId} quarter={fallbackQuarter} year={fallbackYear} />
              </div>
            ) : (
              <ObjectiveGroups objectives={todo} tasks={tasks} clientId={clientId} showAdd />
            )}
          </TabsContent>

          <TabsContent value="achieved">
            {achieved.length === 0 ? (
              <p className="text-sm text-muted-foreground">No achieved objectives yet.</p>
            ) : (
              <ObjectiveGroups objectives={achieved} tasks={tasks} clientId={clientId} showAdd={false} />
            )}
          </TabsContent>

          <TabsContent value="dropped">
            {dropped.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dropped objectives.</p>
            ) : (
              <ObjectiveGroups objectives={dropped} tasks={tasks} clientId={clientId} showAdd={false} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
