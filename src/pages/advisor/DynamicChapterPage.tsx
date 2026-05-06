import { useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, BookOpen, CheckCircle2, Circle, Clock } from "lucide-react";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";
import { useClientTasks, type AdvisorTask } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

interface DbPhase {
  id: string;
  phase: string;
  label: string | null;
  status: "pending" | "in_progress" | "complete";
  completed_tasks: number;
  total_tasks: number;
  sort_order: number;
}

interface DbPlan {
  id: string;
  quarter: number;
  year: number;
  label: string | null;
  status: "draft" | "active" | "complete";
  phases: DbPhase[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<DbPlan["status"], string> = {
  draft: "Draft",
  active: "Active",
  complete: "Complete",
};

const STATUS_CLASSES: Record<DbPlan["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary",
  complete: "bg-green-50 text-green-700",
};

function PhaseIcon({ status }: { status: DbPhase["status"] }) {
  if (status === "complete") return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />;
  if (status === "in_progress") return <Clock className="w-4 h-4 text-primary flex-shrink-0" />;
  return <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DynamicChapterPage() {
  const { planId } = useParams<{ planId: string }>();
  const { client } = useOutletContext<WorkspaceContext>();

  const { data: plansRaw = [], isLoading } = useClientQuarterlyPlans(client.id);
  const plans = plansRaw as DbPlan[];

  const { data: tasksRaw = [] } = useClientTasks(client.id);
  const unassignedTasks = (tasksRaw as AdvisorTask[]).filter((t) => t.phase === null);

  const plan = plans.find((p) => p.id === planId);
  const chapterNumber = plans.findIndex((p) => p.id === planId) + 1;
  const title = plan?.label ?? `Chapter ${chapterNumber}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading chapter...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm">Chapter not found.</span>
      </div>
    );
  }

  const sortedPhases = [...plan.phases].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Q{plan.quarter} {plan.year}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            STATUS_CLASSES[plan.status]
          )}
        >
          {STATUS_LABELS[plan.status]}
        </span>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Phases</h2>
        {sortedPhases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phases defined yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedPhases.map((phase) => {
              const progress =
                phase.total_tasks > 0
                  ? Math.round((phase.completed_tasks / phase.total_tasks) * 100)
                  : 0;
              return (
                <div
                  key={phase.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <PhaseIcon status={phase.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {phase.label ?? phase.phase}
                    </p>
                    {phase.total_tasks > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {phase.completed_tasks}/{phase.total_tasks}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
        {unassignedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
            <BookOpen className="w-6 h-6 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No tasks assigned to this chapter yet.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {unassignedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    task.status === "done" && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {task.due_date}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
