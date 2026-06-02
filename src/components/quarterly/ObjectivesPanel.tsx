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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
// Status presentation — uses built-in Badge variants only (no custom palette).
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

// ---------------------------------------------------------------------------
// Single objective row (incl. supporting-task links — UC-08)
// ---------------------------------------------------------------------------
function ObjectiveRow({ obj, tasks }: { obj: QuarterlyObjective; tasks: TaskLite[] }) {
  const update = useUpdateObjective();
  const remove = useDeleteObjective();
  const updateTask = useUpdateTask();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(obj.title);

  const meta = STATUS_META[obj.status];
  const isDropped = obj.status === "dropped";

  const linkedTasks = tasks.filter((t) => t.objective_id === obj.id);
  const unlinkedTasks = tasks.filter((t) => !t.objective_id);
  // A confirmed objective with no supporting tasks is exactly what UC-11 flags.
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
        isDropped && "opacity-60"
      )}
    >
      {/* Top row: objective title + actions */}
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
              <p className={cn("text-sm text-foreground", isDropped && "line-through")}>
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
            {!isDropped && obj.status !== "achieved" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setStatus("dropped")}>
                <Ban className="h-3.5 w-3.5" /> Drop
              </Button>
            )}
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

      {/* Supporting tasks — only meaningful once the objective isn't dropped */}
      {!editing && !isDropped && (
        <div className="mt-2 space-y-1.5 pl-7">
          {linkedTasks.map((t) => (
            <div key={t.id} className="group/task flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  t.status === "done" ? "bg-emerald-500" : "bg-muted-foreground/40"
                )}
              />
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
                disabled={unlinkedTasks.length === 0}
              >
                <Link2 className="h-3.5 w-3.5" />
                {unlinkedTasks.length === 0 ? "No unlinked tasks" : "Link task"}
              </Button>
            </DropdownMenuTrigger>
            {unlinkedTasks.length > 0 && (
              <DropdownMenuContent align="start" className="max-h-64 w-72 overflow-y-auto">
                {unlinkedTasks.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => linkTask(t.id)} className="text-xs">
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
// Main panel
// ---------------------------------------------------------------------------
export default function ObjectivesPanel({ clientId }: { clientId: string }) {
  const { data: objectives = [], isLoading } = useClientObjectives(clientId);
  const { data: rawTasks = [] } = useClientTasks(clientId);
  const tasks = rawTasks as TaskLite[];

  // Group by quarter/year, preserving the server's DESC ordering.
  const groups: { quarter: number; year: number; items: QuarterlyObjective[] }[] = [];
  for (const obj of objectives) {
    let g = groups.find((x) => x.quarter === obj.quarter && x.year === obj.year);
    if (!g) {
      g = { quarter: obj.quarter, year: obj.year, items: [] };
      groups.push(g);
    }
    g.items.push(obj);
  }

  const fallbackQuarter = currentQuarter();
  const fallbackYear = new Date().getFullYear();

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Quarterly Objectives
        </h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading objectives…</p>
      ) : groups.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No objectives yet. They appear here automatically as{" "}
            <span className="font-medium text-foreground">AI-suggested</span> when you generate a
            quarterly review prep, and are confirmed when the founder approves the review — or add
            the ones the founder committed to manually below.
          </p>
          <AddObjectiveForm clientId={clientId} quarter={fallbackQuarter} year={fallbackYear} />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={`${g.year}-${g.quarter}`} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Q{g.quarter} {g.year}
              </p>
              {g.items.map((obj) => (
                <ObjectiveRow key={obj.id} obj={obj} tasks={tasks} />
              ))}
              <AddObjectiveForm clientId={clientId} quarter={g.quarter} year={g.year} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
