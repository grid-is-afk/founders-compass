import { sprintTasks } from "@/lib/mockData";
import StatCard from "@/components/dashboard/StatCard";
import { Target, CheckCircle2, Clock, Circle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon = {
  done: <CheckCircle2 className="w-4 h-4 text-primary" />,
  in_progress: <Clock className="w-4 h-4 text-accent" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground" />,
};

const kpis = [
  { metric: "Monthly Recurring Revenue", current: "$1.2M", target: "$1.5M", progress: 80 },
  { metric: "Gross Margin", current: "68%", target: "72%", progress: 94 },
  { metric: "Customer Retention", current: "89%", target: "95%", progress: 93 },
  { metric: "Founder Hours / Week", current: "52h", target: "35h", progress: 67 },
];

const PerformanceEngine = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Performance & Execution</h1>
        <p className="text-muted-foreground mt-1 text-sm">Turn strategy into disciplined 90-day execution sprints</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Target} label="Sprint Progress" value="64" suffix="%" />
        <StatCard icon={CheckCircle2} label="Tasks Complete" value="12" suffix="/20" />
        <StatCard icon={BarChart3} label="KPIs On Track" value="3" suffix="/4" />
        <StatCard icon={Clock} label="Days Remaining" value="47" />
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">KPI Dashboard</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {kpis.map((kpi) => (
            <div key={kpi.metric} className="flex items-center gap-6 px-5 py-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{kpi.metric}</p>
              </div>
              <span className="text-sm text-foreground font-medium w-16">{kpi.current}</span>
              <span className="text-xs text-muted-foreground w-16">Target: {kpi.target}</span>
              <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full gradient-olive" style={{ width: `${kpi.progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8">{kpi.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Sprint Tasks</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {sprintTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-4 px-5 py-4">
              {statusIcon[task.status]}
              <p className={cn("text-sm flex-1", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p>
              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{task.assignee}</span>
              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceEngine;
