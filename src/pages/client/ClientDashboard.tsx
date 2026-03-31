import StatCard from "@/components/dashboard/StatCard";
import ShareInvestorPortal from "@/components/ShareInvestorPortal";
import { sprintTasks } from "@/lib/mockData";
import { quarterlyEngagement } from "@/lib/journeyMockData";
import { TrendingUp, Shield, Target, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight, FileText, FileSpreadsheet, File, Paperclip, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const clientTasks = sprintTasks.filter(t => t.assignee === "Client");
  const totalSubs = clientTasks.reduce((a, t) => a + t.subtasks.length, 0);
  const doneSubs = clientTasks.reduce((a, t) => a + t.subtasks.filter(s => s.done).length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Your Engagement</h1>
        <p className="text-muted-foreground mt-1 text-sm">Meridian Industries — Q2 2026 — Protect &amp; Grow</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Capital Readiness" value="72" suffix="/100" />
        <StatCard icon={Shield} label="Customer Capital" value="68" suffix="/100" />
        <StatCard icon={Target} label="Sprint Progress" value="64" suffix="%" />
      </div>

      {/* Quarterly progress display */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              Q{quarterlyEngagement.currentQuarter} {quarterlyEngagement.year} Journey
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quarterlyEngagement.quarterStart} – {quarterlyEngagement.quarterEnd}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {quarterlyEngagement.daysToReview} days to review
          </span>
        </div>
        <div className="flex items-center gap-4">
          {quarterlyEngagement.phases.map((phase) => (
            <div key={phase.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                {phase.status === "complete" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : phase.status === "active" ? (
                  <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    phase.status === "active"
                      ? "text-foreground font-semibold"
                      : phase.status === "complete"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                  )}
                >
                  {phase.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-display font-semibold text-foreground">Your Tasks</h2>
          {totalSubs > 0 && (
            <span className="text-xs text-muted-foreground">{doneSubs}/{totalSubs} subtasks complete</span>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {clientTasks.map((task) => {
            const isOpen = expanded[task.id];
            const subtasksDone = task.subtasks.filter(s => s.done).length;
            return (
              <div key={task.id}>
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggle(task.id)}
                >
                  {(task.subtasks.length > 0 || task.linkedDocs.length > 0) ? (
                    isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <div className="w-4" />
                  )}
                  {statusIcon[task.status]}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", task.status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</p>
                    {task.subtasks.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{subtasksDone}/{task.subtasks.length} subtasks</p>
                    )}
                  </div>
                  {task.linkedDocs.length > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Paperclip className="w-3 h-3" />
                      <span className="text-[11px]">{task.linkedDocs.length}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                </div>

                {isOpen && (
                  <div className="bg-muted/20 px-5 pb-4 pt-1 ml-7 border-l-2 border-border space-y-3">
                    {task.subtasks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Subtasks</p>
                        {task.subtasks.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2.5 pl-2">
                            {sub.done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className={cn("text-xs", sub.done ? "text-muted-foreground line-through" : "text-foreground")}>{sub.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {task.linkedDocs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Linked Documents</p>
                        {task.linkedDocs.map(doc => (
                          <div key={doc.name} className="flex items-center gap-2.5 pl-2">
                            {docIcon[doc.type]}
                            <span className="text-xs text-primary hover:underline cursor-pointer">{doc.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Published Reports */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Published Reports</h2>
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Capital Readiness Memo</p>
              <p className="text-xs text-muted-foreground">Published by your advisor — Mar 5, 2026</p>
            </div>
            <span className="text-xs text-primary cursor-pointer hover:underline">View</span>
          </div>
        </div>
      </div>

      {/* Share Portal */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Share with Partners</h2>
        <ShareInvestorPortal variant="card" clientName="Meridian Industries" />
      </div>
    </div>
  );
};

export default ClientDashboard;
