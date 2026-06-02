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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ---------------------------------------------------------------------------
// Single objective row
// ---------------------------------------------------------------------------
function ObjectiveRow({ obj }: { obj: QuarterlyObjective }) {
  const update = useUpdateObjective();
  const remove = useDeleteObjective();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(obj.title);

  const meta = STATUS_META[obj.status];
  const isDropped = obj.status === "dropped";

  const setStatus = (status: ObjectiveStatus) =>
    update.mutate(
      { id: obj.id, clientId: obj.client_id, status },
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
        "group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3",
        isDropped && "opacity-60"
      )}
    >
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
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {obj.status === "proposed" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2"
              onClick={() => setStatus("confirmed")}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
            </Button>
          )}
          {obj.status === "confirmed" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2"
              onClick={() => setStatus("achieved")}
            >
              <Trophy className="h-3.5 w-3.5" /> Achieved
            </Button>
          )}
          {!isDropped && obj.status !== "achieved" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2"
              onClick={() => setStatus("dropped")}
            >
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
            quarterly review prep — or add the ones the founder committed to manually below.
          </p>
          <AddObjectiveForm
            clientId={clientId}
            quarter={fallbackQuarter}
            year={fallbackYear}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={`${g.year}-${g.quarter}`} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Q{g.quarter} {g.year}
              </p>
              {g.items.map((obj) => (
                <ObjectiveRow key={obj.id} obj={obj} />
              ))}
              <AddObjectiveForm clientId={clientId} quarter={g.quarter} year={g.year} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
