import { useOutletContext } from "react-router-dom";
import { InvestmentProbabilitySection } from "@/components/clients/dashboard/InvestmentProbabilitySection";
import { AssessmentPulseWidget } from "@/components/clients/dashboard/AssessmentPulseWidget";
import { QuarterProgressWidget } from "@/components/clients/dashboard/QuarterProgressWidget";
import { QuarterbackActionsPanel } from "@/components/clients/dashboard/QuarterbackActionsPanel";
import { SixKeysScoreGrid } from "@/components/clients/dashboard/SixKeysScoreGrid";
import { CapitalOptionalityPanel } from "@/components/clients/dashboard/CapitalOptionalityPanel";
import { AssessmentHistoryWidget } from "@/components/clients/AssessmentHistoryWidget";
import { useClientTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (match ClientWorkspace outlet context)
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  onboarded_at: string | null;
  capital_readiness: number;
  current_quarter?: number;
  current_year?: number;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Priority Actions Panel
// ---------------------------------------------------------------------------

function PriorityActionsPanel({ clientId }: { clientId: string }) {
  const { data: tasks = [] } = useClientTasks(clientId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const priorityTasks = (tasks as Array<{ id: string; title: string; status: string; due_date: string | null; priority: string | null; phase: string | null }>)
    .filter((t) => {
      if (t.status === "done" || t.status === "complete") return false;
      const isOverdue = t.due_date ? new Date(t.due_date) < today : false;
      const isHighPriority = t.priority === "high";
      return isOverdue || isHighPriority;
    })
    .slice(0, 3);

  if (priorityTasks.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Priority Actions</h3>
        <a
          href={`/advisor/tools/capital-strategy`}
          className="text-xs text-primary hover:underline"
        >
          View full roadmap →
        </a>
      </div>
      <div className="space-y-2">
        {priorityTasks.map((task) => {
          const isOverdue = task.due_date ? new Date(task.due_date) < today : false;
          return (
            <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
              <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", isOverdue ? "bg-destructive" : "bg-amber-500")} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                {task.due_date && (
                  <p className={cn("text-[10px] mt-0.5", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                    {isOverdue ? "Overdue · " : "Due · "}
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDashboardTab() {
  const { client } = useOutletContext<WorkspaceContext>();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ================================================================
          LEFT COLUMN — 2/3 width
      ================================================================ */}
      <div className="lg:col-span-2 space-y-6">
        <InvestmentProbabilitySection clientId={client.id} />

        <AssessmentPulseWidget clientId={client.id} clientName={client.name} />

        <div>
          <div className="relative flex items-center pt-1 pb-5">
            <div className="flex-1 border-t border-border" />
            <span className="absolute left-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground bg-muted px-3 py-0.5 rounded-full">
              Quarter Progress
            </span>
          </div>
          <QuarterProgressWidget client={client} />
        </div>

        <PriorityActionsPanel clientId={client.id} />

      </div>

      {/* ================================================================
          RIGHT SIDEBAR — 1/3 width
      ================================================================ */}
      <div className="space-y-6">
        <QuarterbackActionsPanel clientId={client.id} clientName={client.name} />

        <AssessmentHistoryWidget clientId={client.id} />

        <div>
          <div className="relative flex items-center pt-1 pb-3">
            <div className="flex-1 border-t border-border" />
            <span className="absolute left-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground bg-muted px-3 py-0.5 rounded-full">
              Six Keys of Capital
            </span>
          </div>
          <SixKeysScoreGrid clientId={client.id} />
        </div>

        <div className="space-y-2">
          <CapitalOptionalityPanel clientId={client.id} />
        </div>
      </div>
    </div>
  );
}
