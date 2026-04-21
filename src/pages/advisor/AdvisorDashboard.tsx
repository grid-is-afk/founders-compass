import { useNavigate } from "react-router-dom";
import ClientRow from "@/components/dashboard/ClientRow";
import AdvisorTasksPanel from "@/components/dashboard/AdvisorTasksPanel";
import { TrendingUp, Activity, UserPlus, Zap } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useActivity } from "@/hooks/useActivity";
import { useProspects } from "@/hooks/useProspects";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Prospect status display map
// ---------------------------------------------------------------------------
const PROSPECT_STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  discovery_scheduled: "Discovery Scheduled",
  discovery_complete: "Discovery Complete",
  fit_assessment: "Fit Assessment",
  fit: "Fit ✓",
  not_fit: "Not a Fit",
  onboarding: "Onboarding",
  nurture_call: "Nurture Call",
  kept_in_loop: "Kept in Loop",
  flagged_follow_up: "Follow Up",
};

const PROSPECT_STATUS_STYLE: Record<string, string> = {
  fit: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  not_fit: "bg-destructive/10 text-destructive border-destructive/20",
  onboarding: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  fit_assessment: "bg-amber-400/10 text-amber-700 border-amber-400/20",
  intake: "bg-muted text-muted-foreground border-border",
  discovery_scheduled: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  discovery_complete: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  nurture_call: "bg-muted text-muted-foreground border-border",
  kept_in_loop: "bg-muted text-muted-foreground border-border",
  flagged_follow_up: "bg-orange-500/10 text-orange-700 border-orange-500/20",
};

const AdvisorDashboard = () => {
  const navigate = useNavigate();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: activity = [], isLoading: activityLoading } = useActivity();
  const { data: prospects = [], isLoading: prospectsLoading } = useProspects();

  const recentProspects = (prospects as any[]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Advisor Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Portfolio overview and engagement intelligence
          </p>
        </div>
        <button
          onClick={() => navigate("/advisor/copilot")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Quarterback AI
        </button>
      </div>

      {/* Client Journey + Recent Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* Client table — 2/3 */}
        <div className="col-span-2">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Client Journey</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {clientsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading clients...</div>
            ) : (clients as any[]).length === 0 ? (
              <div className="p-12 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-semibold text-foreground mb-1">No clients yet</h3>
                <p className="text-sm text-muted-foreground">Add your first client to get started.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Stage</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Readiness</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Revenue</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {(clients as any[]).map((client: any) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      onClick={() => navigate(`/advisor/clients/${client.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activity — 1/3 */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : (activity as any[]).length === 0 ? (
              <div className="text-center py-6">
                <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              (activity as any[]).slice(0, 8).map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {item.action || "Activity recorded"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.client_name && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {item.client_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Prospects Journey */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Prospects Journey</h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {prospectsLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading prospects...</div>
          ) : recentProspects.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold text-foreground mb-1">No prospects yet</h3>
              <p className="text-sm text-muted-foreground">Add your first prospect to track the pipeline.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Prospect</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Fit Score</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Added</th>
                </tr>
              </thead>
              <tbody>
                {recentProspects.map((prospect: any) => (
                  <tr
                    key={prospect.id}
                    onClick={() => navigate("/advisor/prospects")}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{prospect.name}</p>
                      {prospect.contact && (
                        <p className="text-xs text-muted-foreground">{prospect.contact}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          PROSPECT_STATUS_STYLE[prospect.status] ?? "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {PROSPECT_STATUS_LABELS[prospect.status] ?? prospect.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {prospect.company ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {prospect.fit_score != null ? (
                        <span className="text-sm font-medium text-foreground">{prospect.fit_score}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(prospect.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {(prospects as any[]).length > 5 && (
          <button
            onClick={() => navigate("/advisor/prospects")}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all {(prospects as any[]).length} prospects →
          </button>
        )}
      </div>

      {/* All Tasks — cross-client */}
      <AdvisorTasksPanel />
    </div>
  );
};

export default AdvisorDashboard;
