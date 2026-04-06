import StatCard from "@/components/dashboard/StatCard";
import ShareInvestorPortal from "@/components/ShareInvestorPortal";
import { TrendingUp, Shield, Target, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight, FileText, FileSpreadsheet, File, Paperclip, Activity, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useClients } from "@/hooks/useClients";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";

const statusIcon = {
  done: <CheckCircle2 className="w-4 h-4 text-primary" />,
  in_progress: <Clock className="w-4 h-4 text-accent" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground" />,
};

const docIcon = {
  pdf: <FileText className="w-3 h-3 text-destructive/70" />,
  spreadsheet: <FileSpreadsheet className="w-3 h-3 text-primary" />,
  document: <File className="w-3 h-3 text-accent" />,
};

const ClientDashboard = () => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // In the client portal, we infer the client from the logged-in user.
  // The server should scope this to the advisor's clients for the logged-in client user.
  const { data: clients = [] } = useClients();
  const firstClient = (clients as any[])[0];
  const clientId = firstClient?.id ?? "";

  const { data: rawTasks = [] } = useClientTasks(clientId);
  const { data: rawPlans = [] } = useClientQuarterlyPlans(clientId);

  // Filter to tasks assigned to the client user
  const clientTasks = (rawTasks as any[]).filter(
    (t) => t.assignee === "Client" || t.assignee?.toLowerCase() === "client"
  );

  const totalSubs = clientTasks.reduce((a: number, t: any) => a + (t.subtasks?.length ?? 0), 0);
  const doneSubs = clientTasks.reduce((a: number, t: any) => a + (t.subtasks?.filter((s: any) => s.done).length ?? 0), 0);

  const activePlan = (rawPlans as any[]).find((p) => p.status === "active") ?? (rawPlans as any[])[0];
  const phases = activePlan?.phases ?? [];

  const capitalReadiness = firstClient?.capital_readiness ?? 0;
  const customerCapital = firstClient?.customer_capital ?? 0;
  const sprintPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Your Engagement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {firstClient?.name ?? "Loading..."} — {activePlan ? `Q${activePlan.quarter} ${activePlan.year} — ${activePlan.label ?? ""}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Capital Readiness" value={String(capitalReadiness)} suffix="/100" />
        <StatCard icon={Shield} label="Customer Capital" value={String(customerCapital)} suffix="/100" />
        <StatCard icon={Target} label="Sprint Progress" value={String(sprintPct)} suffix="%" />
      </div>

      {/* Quarterly progress display */}
      {activePlan && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                Q{activePlan.quarter} {activePlan.year} Journey
              </p>
            </div>
            {activePlan.review_date && (
              <span className="text-xs text-muted-foreground">
                Review {new Date(activePlan.review_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {phases.map((phase: any) => (
              <div key={phase.id ?? phase.phase} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  {phase.status === "complete" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : phase.status === "in_progress" ? (
                    <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    phase.status === "in_progress"
                      ? "text-foreground font-semibold"
                      : phase.status === "complete"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                  )}>
                    {phase.label ?? phase.phase}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sprint Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-display font-semibold text-foreground">Your Tasks</h2>
          {totalSubs > 0 && (
            <span className="text-xs text-muted-foreground">{doneSubs}/{totalSubs} subtasks complete</span>
          )}
        </div>

        {clientTasks.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground mb-1">No tasks assigned yet</h3>
            <p className="text-sm text-muted-foreground">Your advisor will assign tasks as the engagement progresses.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {clientTasks.map((task: any) => {
              const isOpen = expanded[task.id];
              const subtasks = task.subtasks ?? [];
              const subtasksDone = subtasks.filter((s: any) => s.done).length;
              const status = (task.status ?? "todo") as "done" | "in_progress" | "todo";
              return (
                <div key={task.id}>
                  <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggle(task.id)}
                  >
                    {subtasks.length > 0 ? (
                      isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <div className="w-4" />
                    )}
                    {statusIcon[status]}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>
                        {task.title}
                      </p>
                      {subtasks.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{subtasksDone}/{subtasks.length} subtasks</p>
                      )}
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  {isOpen && subtasks.length > 0 && (
                    <div className="bg-muted/20 px-5 pb-4 pt-1 ml-7 border-l-2 border-border space-y-1.5">
                      {subtasks.map((sub: any) => (
                        <div key={sub.id} className="flex items-center gap-2.5 pl-2">
                          {sub.done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className={cn("text-xs", sub.done ? "text-muted-foreground line-through" : "text-foreground")}>{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Portal */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Share with Partners</h2>
        <ShareInvestorPortal variant="card" clientName={firstClient?.name ?? ""} />
      </div>
    </div>
  );
};

export default ClientDashboard;
