import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  RefreshCw,
  Check,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  useFirmInsights,
  useFirmMetrics,
  useRunFirmScan,
  useUpdateInsightStatus,
  type FirmInsight,
  type InsightCategory,
} from "@/hooks/useFirmInsights";

// Visual config per category — maps the four spec buckets to brand tokens.
const CATEGORY_META: Record<
  InsightCategory,
  { label: string; icon: typeof TrendingUp; accent: string; chip: string }
> = {
  working: {
    label: "What's Working",
    icon: CheckCircle2,
    accent: "text-primary",
    chip: "bg-primary/10 text-primary border-primary/20",
  },
  strength: {
    label: "Methodology Strengths",
    icon: Award,
    accent: "text-accent-foreground",
    chip: "bg-accent/15 text-accent-foreground border-accent/30",
  },
  blocker: {
    label: "What's Blocking Progress",
    icon: AlertTriangle,
    accent: "text-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
  },
  weakness: {
    label: "Methodology Weaknesses",
    icon: TrendingDown,
    accent: "text-amber-600",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
};

const CATEGORY_ORDER: InsightCategory[] = ["working", "strength", "blocker", "weakness"];

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card rounded-lg border border-border px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-display font-semibold text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function InsightCard({
  insight,
  onUpdate,
  pending,
}: {
  insight: FirmInsight;
  onUpdate: (id: string, status: "approved" | "dismissed") => void;
  pending: boolean;
}) {
  const meta = CATEGORY_META[insight.category];
  const Icon = meta.icon;
  const isApproved = insight.status === "approved";

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", meta.accent)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display font-semibold text-foreground leading-snug">{insight.title}</h3>
            {isApproved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                <Check className="w-3 h-3" />
                Approved
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{insight.narrative}</p>

          {insight.engagements.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {insight.engagements.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border"
                >
                  {e.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isApproved && (
        <div className="flex items-center gap-2 pl-8">
          <button
            onClick={() => onUpdate(insight.id, "approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => onUpdate(insight.id, "dismissed")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default function FirmInsights() {
  const { user } = useAuth();

  // TFO-only — the client role never reaches this view (server also enforces 403).
  if (user?.role === "client") {
    return <Navigate to="/client" replace />;
  }

  const { data: metrics } = useFirmMetrics();
  const { data: insights = [], isLoading } = useFirmInsights();
  const runScan = useRunFirmScan();
  const updateStatus = useUpdateInsightStatus();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleScan() {
    try {
      const result = await runScan.mutateAsync();
      if (result.reason === "no_active_engagements") {
        toast.info("No active engagements to analyze yet.");
      } else {
        toast.success(`Scan complete — ${result.insights} insight${result.insights !== 1 ? "s" : ""} generated.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed.");
    }
  }

  async function handleUpdate(id: string, status: "approved" | "dismissed") {
    setUpdatingId(id);
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(status === "approved" ? "Insight approved." : "Insight dismissed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update insight.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Firm Insights</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cross-engagement patterns across all TFO engagements
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={runScan.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn("w-4 h-4", runScan.isPending && "animate-spin")} />
          {runScan.isPending ? "Scanning..." : "Run scan"}
        </button>
      </div>

      {/* Metrics summary strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Engagements" value={String(metrics.portfolio.activeEngagements)} hint="active" />
          <StatCard
            label="Deliverables"
            value={`${metrics.deliverables.approvedPct}%`}
            hint={`approved (${metrics.deliverables.total})`}
          />
          <StatCard
            label="Objectives"
            value={`${metrics.objectives.confirmedPct}%`}
            hint={`confirmed (${metrics.objectives.total})`}
          />
          <StatCard label="Open Risks" value={String(metrics.risks.totalUnresolved)} hint="unresolved" />
          <StatCard
            label="Scope Creep"
            value={String(metrics.scopeCreep.tasksAfterLock + metrics.scopeCreep.objectivesAfterLock)}
            hint="items after lock"
          />
          <StatCard label="Stale" value={String(metrics.meetings.staleEngagements)} hint="no meeting 30d+" />
        </div>
      )}

      {/* Insights */}
      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          Loading insights...
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No insights yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Run a scan to surface firm-level patterns across all engagements — what's working, what's
            blocking progress, and where the methodology is strongest and weakest.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((category) => {
            const group = insights.filter((i) => i.category === category);
            if (group.length === 0) return null;
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <section key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", meta.accent)} />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-muted-foreground/60">({group.length})</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onUpdate={handleUpdate}
                      pending={updatingId === insight.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
