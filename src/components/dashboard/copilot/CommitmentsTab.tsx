import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle, Handshake, Building2, User } from "lucide-react";
import {
  useClientCommitments,
  useUpdateTask,
  type ClientTask,
  type CommitmentOwnerType,
} from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInCalendarDays, format, isPast, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// UC-12 Commitments ledger — a neutral, full view of who is on the hook for
// what (TFO and client side), with aging. Severity colour is intentionally
// absent: that "fire alarm" framing belongs to Priority Actions. Here every
// open commitment is an equal row sorted by how long it has been open.
// ---------------------------------------------------------------------------

const STATUS_CYCLE: ClientTask["status"][] = ["todo", "in_progress", "done", "blocked"];

const STATUS_CONFIG: Record<
  ClientTask["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  todo: { label: "To Do", icon: Circle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, className: "text-blue-500" },
  done: { label: "Done", icon: CheckCircle2, className: "text-emerald-500" },
  blocked: { label: "Blocked", icon: AlertCircle, className: "text-destructive" },
};

type OwnerFilter = "all" | CommitmentOwnerType;

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function OwnerChip({ task }: { task: ClientTask }) {
  if (task.owner_type === "client") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-700">
        <User className="w-3 h-3" />
        {task.owner_stakeholder_name ?? "Client"}
        <span className="opacity-70">· Client</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
      <Building2 className="w-3 h-3" />
      {task.assignee_name ?? "TFO · Unassigned"}
    </span>
  );
}

const CommitmentsTab = ({ clientId }: { clientId?: string }) => {
  const { data: tasks = [], isLoading } = useClientCommitments(clientId ?? "");
  const updateTask = useUpdateTask();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

  // Open commitments only — the ledger answers "what's still outstanding".
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks]
  );

  const filtered = useMemo(() => {
    const byOwner = ownerFilter === "all" ? openTasks : openTasks.filter((t) => t.owner_type === ownerFilter);
    // Oldest-open first — staleness is the signal that matters here.
    return [...byOwner].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [openTasks, ownerFilter]);

  const counts = useMemo(
    () => ({
      all: openTasks.length,
      tfo: openTasks.filter((t) => t.owner_type === "tfo").length,
      client: openTasks.filter((t) => t.owner_type === "client").length,
    }),
    [openTasks]
  );

  const handleStatusChange = (task: ClientTask, next: ClientTask["status"]) => {
    if (!clientId) return;
    updateTask.mutate(
      { id: task.id, clientId, status: next },
      {
        onSuccess: () => toast.success(`Marked "${task.title}" as ${STATUS_CONFIG[next].label}`),
        onError: () => toast.error("Could not update commitment"),
      }
    );
  };

  if (!clientId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Select a client to see their commitments.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  }

  if (openTasks.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">No open commitments</h3>
        <p className="text-sm text-muted-foreground">
          Nothing is outstanding on either side right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Owner filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPill label={`All (${counts.all})`} active={ownerFilter === "all"} onClick={() => setOwnerFilter("all")} />
        <FilterPill label={`TFO (${counts.tfo})`} active={ownerFilter === "tfo"} onClick={() => setOwnerFilter("tfo")} />
        <FilterPill label={`Client (${counts.client})`} active={ownerFilter === "client"} onClick={() => setOwnerFilter("client")} />
      </div>

      <div className="space-y-2">
        {filtered.map((task) => {
          const cfg = STATUS_CONFIG[task.status];
          const Icon = cfg.icon;
          const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
          const daysOpen = differenceInCalendarDays(new Date(), parseISO(task.created_at));
          const isOverdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

          return (
            <div key={task.id} className="p-3 rounded-md border border-border bg-card">
              <div className="flex items-start gap-2.5">
                {/* Status cycle button — icon + text label per UI rule */}
                <button
                  title={`Mark as ${STATUS_CONFIG[nextStatus].label}`}
                  onClick={() => handleStatusChange(task, nextStatus)}
                  disabled={updateTask.isPending}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-muted/60 transition-colors disabled:opacity-50",
                    cfg.className
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium text-foreground leading-snug",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <OwnerChip task={task} />
                    <span className="text-[11px] text-muted-foreground">open {daysOpen}d</span>
                    {task.due_date && (
                      <span className={cn("text-[11px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                        {isOverdue ? "overdue · " : "due "}
                        {format(parseISO(task.due_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommitmentsTab;
