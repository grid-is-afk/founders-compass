import { useOutletContext } from "react-router-dom";
import { InvestmentProbabilitySection } from "@/components/clients/dashboard/InvestmentProbabilitySection";
import { AssessmentPulseWidget } from "@/components/clients/dashboard/AssessmentPulseWidget";
import { QuarterProgressWidget } from "@/components/clients/dashboard/QuarterProgressWidget";
import { QuarterbackActionsPanel } from "@/components/clients/dashboard/QuarterbackActionsPanel";
import { SixKeysScoreGrid } from "@/components/clients/dashboard/SixKeysScoreGrid";
import { CapitalOptionalityPanel } from "@/components/clients/dashboard/CapitalOptionalityPanel";
import { AssessmentHistoryWidget } from "@/components/clients/AssessmentHistoryWidget";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientRiskAlerts, useRunRiskScan } from "@/hooks/useRiskAlerts";
import { AlertCircle, AlertTriangle, Info, ScanSearch } from "lucide-react";
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

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Priority Actions</h3>
        <a
          href={`/advisor/capital-strategy-roadmap/${clientId}`}
          className="text-xs text-primary hover:underline"
        >
          View full roadmap →
        </a>
      </div>
      {priorityTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No overdue or high-priority tasks — all on track.
        </p>
      ) : (
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
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Alerts Widget
// ---------------------------------------------------------------------------

const SEVERITY_ICON = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />,
  info: <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />,
};

const SEVERITY_STYLE = {
  critical: "border-destructive/20 bg-destructive/5",
  warning: "border-amber-400/20 bg-amber-400/5",
  info: "border-blue-400/20 bg-blue-400/5",
};

function RiskAlertsWidget({ clientId }: { clientId: string }) {
  const { data: rawAlerts = [] } = useClientRiskAlerts(clientId);
  const { mutate: runScan, isPending: scanning } = useRunRiskScan(clientId);

  const alerts = (rawAlerts as Array<{ id: string; severity: string; title: string; detail: string | null }>)
    .map((a) => ({ ...a, severity: (a.severity ?? "info") as "critical" | "warning" | "info" }));

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Risk Alerts</h3>
        <button
          onClick={() => runScan()}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No risk alerts. Run a scan to check for issues.</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className={cn("p-2.5 rounded-md border text-xs", SEVERITY_STYLE[alert.severity])}>
              <div className="flex items-start gap-2">
                {SEVERITY_ICON[alert.severity]}
                <div>
                  <p className="font-medium text-foreground leading-snug">{alert.title}</p>
                  {alert.detail && !alert.detail.startsWith("[auto]") && (
                    <p className="text-muted-foreground mt-0.5">{alert.detail}</p>
                  )}
                  {alert.detail?.startsWith("[auto]") && (
                    <p className="text-muted-foreground mt-0.5">{alert.detail.replace("[auto]", "").trim()}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {alerts.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+{alerts.length - 5} more alerts</p>
          )}
        </div>
      )}
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

        <RiskAlertsWidget clientId={client.id} />

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
