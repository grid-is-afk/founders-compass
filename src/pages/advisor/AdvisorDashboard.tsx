import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ClientRow from "@/components/dashboard/ClientRow";
import StatCard from "@/components/dashboard/StatCard";
import CommandBar from "@/components/dashboard/CommandBar";
import AssessmentPulse from "@/components/dashboard/AssessmentPulse";
import { TrendingUp, Shield, Target, Zap, Sparkles, Activity } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAssessmentScores } from "@/hooks/useAssessmentScores";
import { useClientContext } from "@/hooks/useClientContext";
import { useClients } from "@/hooks/useClients";
import { useActivity } from "@/hooks/useActivity";

const AdvisorDashboard = () => {
  const [copilotEnabled, setCopilotEnabled] = useState(true);
  const navigate = useNavigate();
  const { selectedClientId } = useClientContext();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: activity = [], isLoading: activityLoading } = useActivity();

  // Scores from context (all zeros until assessments are wired)
  const { baScore, brScore, prScore, vfScore } = useAssessmentScores();

  return (
    <div className="space-y-6">
      {/* Header + Quarterback toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Advisor Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Portfolio overview and engagement intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-gold flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-accent-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Quarterback</span>
          </div>
          <Switch checked={copilotEnabled} onCheckedChange={setCopilotEnabled} />
        </div>
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Business Attractiveness"
          value={String(baScore)}
          suffix="%"
          sourceLabel="Business Attractiveness"
          onClick={() => navigate("/advisor/assessments")}
        />
        <StatCard
          icon={Shield}
          label="Business Readiness"
          value={String(brScore)}
          suffix="%"
          sourceLabel="Business Readiness"
          onClick={() => navigate("/advisor/assessments")}
        />
        <StatCard
          icon={Target}
          label="Personal Readiness"
          value={String(prScore)}
          suffix="%"
          sourceLabel="Personal Readiness"
          onClick={() => navigate("/advisor/assessments")}
        />
        <StatCard
          icon={Zap}
          label="Value Strength"
          value={String(vfScore)}
          suffix="%"
          sourceLabel="54 Value Factors"
          onClick={() => navigate("/advisor/assessments")}
        />
      </div>

      {/* Assessment Pulse strip */}
      <AssessmentPulse />

      {/* CommandBar — only when Quarterback is on */}
      <AnimatePresence>
        {copilotEnabled && (
          <motion.div
            key="command-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <CommandBar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Portfolio + Recent Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* Client table — 2/3 */}
        <div className="col-span-2">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Client Portfolio</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {clientsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading clients...</div>
            ) : clients.length === 0 ? (
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
                  {clients.map((client: any) => (
                    <ClientRow key={client.id} client={client} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activity — 1/3 */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : activity.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              activity.map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground leading-snug">
                      {item.action}
                      {item.client_name ? ` — ${item.client_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
