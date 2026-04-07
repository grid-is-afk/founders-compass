import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientGrow } from "@/hooks/useGrowApi";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  TrendingUp,
  BarChart3,
  Network,
  Compass,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import type { GrowCapitalType, GrowEngagement } from "@/lib/types/journey";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4 },
  }),
};

// ---------------------------------------------------------------------------
// Capital type config
// ---------------------------------------------------------------------------
interface CapitalConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  description: string;
  details: string;
}

const capitalConfig: Record<GrowCapitalType, CapitalConfig> = {
  human_capital: {
    label: "Human Capital",
    icon: <Users className="w-5 h-5" />,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    description: "Leadership, talent, and org development to scale performance beyond the founder.",
    details: "Human Capital growth focuses on building leadership depth, implementing performance management systems, and reducing the business's dependency on the founder. This includes key hire planning, succession mapping, and culture codification.",
  },
  customer_capital: {
    label: "Customer Capital",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    description: "Retention, concentration reduction, and lifetime value expansion.",
    details: "Customer Capital engagement targets the reduction of revenue concentration risk, improves customer retention, and drives Net Revenue Retention. The TFO partner network is engaged to execute diversification campaigns and long-term contract strategies.",
  },
  structural_capital: {
    label: "Structural Capital",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Systems, IP, processes, and infrastructure that operate without the founder.",
    details: "Structural Capital ensures the business can operate, scale, and eventually transfer value independently of the founder. This includes SOPs, technology stack documentation, IP registration, and governance infrastructure.",
  },
  social_capital: {
    label: "Social Capital",
    icon: <Network className="w-5 h-5" />,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    description: "Relationships, reputation, and referral networks that compound value over time.",
    details: "Social Capital development grows the founder's and business's market reputation to create proprietary deal flow and inbound capital interest. This includes thought leadership, strategic partnerships, and advisor network development.",
  },
  personal_path: {
    label: "Personal Path",
    icon: <Compass className="w-5 h-5" />,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "The founder's personal transition, wealth, and life design beyond the business.",
    details: "The Personal Path engagement focuses on the founder's life after the business event — personal financial planning, lifestyle design, philanthropic intent, and identity transition. This ensures the founder is personally ready for the capital or exit event.",
  },
};

// ---------------------------------------------------------------------------
// Partner referral data
// ---------------------------------------------------------------------------
const growPartners: { name: string; capitalType: GrowCapitalType; direction: string; status: string }[] = [];

// ---------------------------------------------------------------------------
// Capital Card
// ---------------------------------------------------------------------------
const CapitalCard = ({
  capitalType,
  engagements,
  onClick,
}: {
  capitalType: GrowCapitalType;
  engagements: GrowEngagement[];
  onClick: () => void;
}) => {
  const engagement = engagements.find((e) => e.capitalType === capitalType);
  const config = capitalConfig[capitalType];
  const pct = engagement && engagement.taskCount > 0
    ? Math.round((engagement.completedTasks / engagement.taskCount) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn("rounded-xl border p-4 space-y-3 transition-all hover:shadow-md hover:scale-[1.02] text-left w-full cursor-pointer", config.border)}
    >
      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
        <span className={config.color}>{config.icon}</span>
      </div>

      {/* Label */}
      <div>
        <p className="text-sm font-semibold text-foreground">{config.label}</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{config.description}</p>
      </div>

      {/* Partner */}
      {engagement?.partner && (
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{engagement.partner}</span>
        </div>
      )}

      {/* Progress */}
      {engagement && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{engagement.completedTasks}/{engagement.taskCount} tasks</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {/* Status badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 py-0",
          engagement?.status === "in_progress"
            ? "bg-accent/10 text-accent border-accent/20"
            : "text-muted-foreground"
        )}
      >
        {engagement?.status === "in_progress"
          ? "Active"
          : engagement?.adoptedFromTemplate
          ? "Template Ready"
          : "Upcoming"}
      </Badge>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Capital Detail Dialog
// ---------------------------------------------------------------------------
const CapitalDetailDialog = ({
  capitalType,
  engagements,
  onClose,
}: {
  capitalType: GrowCapitalType | null;
  engagements: GrowEngagement[];
  onClose: () => void;
}) => {
  if (!capitalType) return null;
  const config = capitalConfig[capitalType];
  const engagement = engagements.find((e) => e.capitalType === capitalType);
  const pct = engagement && engagement.taskCount > 0
    ? Math.round((engagement.completedTasks / engagement.taskCount) * 100)
    : 0;

  return (
    <Dialog open={!!capitalType} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
              <span className={config.color}>{config.icon}</span>
            </div>
            <div>
              <DialogTitle className="font-display">{config.label}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-lg bg-muted/40 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Engagement Overview</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{config.details}</p>
          </div>

          {/* Progress */}
          {engagement && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Engagement Progress</span>
                <span className="font-bold text-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{engagement.completedTasks} of {engagement.taskCount} tasks complete</p>
            </div>
          )}

          {/* Partner */}
          {engagement?.partner && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">{engagement.partner}</p>
                <p className="text-[10px] text-muted-foreground">TFO subcontractor partner — executing this lane</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const GrowLanePage = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawGrow = [] } = useClientGrow(selectedClientId);
  // Map DB rows to the GrowEngagement shape the cards expect
  const engagements: GrowEngagement[] = (rawGrow as any[]).map((g) => ({
    id: g.id,
    clientId: g.client_id,
    capitalType: (g.capital_type ?? "human_capital") as GrowCapitalType,
    label: g.label,
    partner: g.partner ?? null,
    status: g.status ?? "exploring",
    adoptedFromTemplate: g.adopted_from_template ?? false,
    taskCount: g.task_count ?? 0,
    completedTasks: g.completed_tasks ?? 0,
  }));
  const [selectedCapital, setSelectedCapital] = useState<GrowCapitalType | null>(null);

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Grow Lane</h1>
          <p className="text-muted-foreground mt-1 text-sm">Five capital types · Subcontractor partner model</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Network className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No grow engagements yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add your first client to begin managing their Grow Lane engagements across all five capital types.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">
          Grow Lane — {selectedClient.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Five capital types · Subcontractor partner model
        </p>
      </motion.div>

      {/* Explanation banner */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4"
      >
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">The Grow Lane Model</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            TFO does not deliver Grow services directly. Instead, we architect a subcontractor network of trusted partners across all five capital types. Partners execute, TFO orchestrates. Referrals flow both directions — TFO sends clients to partners, partners refer founders back to TFO when readiness signals emerge.
          </p>
        </div>
      </motion.div>

      {/* Five Capital Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {(Object.keys(capitalConfig) as GrowCapitalType[]).map((type, i) => (
          <motion.div key={type} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
            <CapitalCard capitalType={type} engagements={engagements} onClick={() => setSelectedCapital(type)} />
          </motion.div>
        ))}
      </div>

      {/* Partner Section */}
      <motion.div custom={5} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-foreground">Grow Partners</h2>
          {growPartners.length === 0 ? (
            <div className="text-center py-6">
              <Network className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold text-foreground mb-1">No partners added yet</h3>
              <p className="text-sm text-muted-foreground">Partner referrals will appear here once subcontractor relationships are established.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {growPartners.map((partner, i) => {
                const config = capitalConfig[partner.capitalType];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", config.bg)}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{partner.name}</p>
                        <p className="text-[10px] text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>{partner.direction}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          partner.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "text-muted-foreground"
                        )}
                      >
                        {partner.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Capital detail dialog */}
      <CapitalDetailDialog
        capitalType={selectedCapital}
        engagements={engagements}
        onClose={() => setSelectedCapital(null)}
      />
    </div>
  );
};

export default GrowLanePage;
