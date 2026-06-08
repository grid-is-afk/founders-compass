import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle, Handshake, Building2, User } from "lucide-react";
import {
  useClientCommitments,
  useUpdateTask,
  type ClientTask,
  type CommitmentOwnerType,
} from "@/hooks/useTasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInCalendarDays, format, isPast, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// UC-12 Commitments ledger — a neutral, full view of who is on the hook for
// what (TFO and client side). Two filter dimensions: status (Open/Done/All)
// and owner (All/TFO/Client). Completed commitments are never hidden — they
// move to the Done view as a trail. Severity colour is intentionally absent:
// that "fire alarm" framing belongs to Priority Actions.
// ---------------------------------------------------------------------------

const STATUS_ORDER: ClientTask["status"][] = ["todo", "in_progress", "done", "blocked"];

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
type StatusFilter = "open" | "done" | "all";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const isOpen = (t: ClientTask) => t.status !== "done";

  // Global status counts (across all owners) drive the status pills.
  const statusCounts = useMemo(
    () => ({
      open: tasks.filter(isOpen).length,
      done: tasks.filter((t) => t.status === "done").length,
      all: tasks.length,
    }),
    [tasks]
  );

  // Apply the status filter first; owner pill counts reflect that subset.
  const statusFiltered = useMemo(() => {
    if (statusFilter === "open") return tasks.filter(isOpen);
    if (statusFilter === "done") return tasks.filter((t) => t.status === "done");
    return tasks;
  }, [tasks, statusFilter]);

  const ownerCounts = useMemo(
    () => ({
      all: statusFiltered.length,
      tfo: statusFiltered.filter((t) => t.owner_type === "tfo").length,
      client: statusFiltered.filter((t) => t.owner_type === "client").length,
    }),
    [statusFiltered]
  );

  const filtered = useMemo(() => {
    const byOwner =
      ownerFilter === "all" ? statusFiltered : statusFiltered.filter((t) => t.owner_type === ownerFilter);
    // Open: oldest-open first (staleness is the signal). Done: most recently
    // completed first (the freshest trail at the top).
    return [...byOwner].sort((a, b) =>
      a.status === "done" && b.status === "done"
        ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [statusFiltered, ownerFilter]);

  const handleStatusChange = (task: ClientTask, next: ClientTask["status"]) => {
    if (!clientId || next === task.status) return;
    updateTask.mutate(
      { id: task.id, clientId, status: next },
      {
        onSuccess: () => toast.success(`"${task.title}" → ${STATUS_CONFIG[next].label}`),
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

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">No commitments yet</h3>
        <p className="text-sm text-muted-foreground">
          Commitments captured from meetings or added manually will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPill label={`Open (${statusCounts.open})`} active={statusFilter === "open"} onClick={() => setStatusFilter("open")} />
        <FilterPill label={`Done (${statusCounts.done})`} active={statusFilter === "done"} onClick={() => setStatusFilter("done")} />
        <FilterPill label={`All (${statusCounts.all})`} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
      </div>

      {/* Owner filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPill label={`All owners (${ownerCounts.all})`} active={ownerFilter === "all"} onClick={() => setOwnerFilter("all")} />
        <FilterPill label={`TFO (${ownerCounts.tfo})`} active={ownerFilter === "tfo"} onClick={() => setOwnerFilter("tfo")} />
        <FilterPill label={`Client (${ownerCounts.client})`} active={ownerFilter === "client"} onClick={() => setOwnerFilter("client")} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No {statusFilter === "all" ? "" : statusFilter} commitments for this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isDone = task.status === "done";
            const daysOpen = differenceInCalendarDays(new Date(), parseISO(task.created_at));
            const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date));

            return (
              <div key={task.id} className="p-3 rounded-md border border-border bg-card">
                <div className="flex items-start gap-2.5">
                  {/* Explicit status picker — discoverable, no guessing */}
                  <Select
                    value={task.status}
                    onValueChange={(v) => handleStatusChange(task, v as ClientTask["status"])}
                    disabled={updateTask.isPending}
                  >
                    <SelectTrigger className="h-7 w-[130px] text-xs flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => {
                        const Icon = STATUS_CONFIG[s].icon;
                        return (
                          <SelectItem key={s} value={s} className="text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon className={cn("w-3.5 h-3.5", STATUS_CONFIG[s].className)} />
                              {STATUS_CONFIG[s].label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium text-foreground leading-snug",
                        isDone && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <OwnerChip task={task} />
                      {isDone ? (
                        <span className="text-[11px] text-emerald-600">
                          done {format(parseISO(task.updated_at), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">open {daysOpen}d</span>
                      )}
                      {task.due_date && !isDone && (
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
      )}
    </div>
  );
};

export default CommitmentsTab;
