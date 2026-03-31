import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { clientProtection } from "@/lib/clientMockData";
import { insuranceOpportunities } from "@/lib/mockData";
import type { ProtectionItem } from "@/lib/types/journey";
import StatCard from "@/components/dashboard/StatCard";
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
  ShieldCheck,
  Umbrella,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
    in_place: {
      className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      label: "In Place",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    under_review: {
      className: "bg-accent/10 text-accent border-accent/20",
      label: "Under Review",
      icon: <Clock className="w-3 h-3" />,
    },
    partial: {
      className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      label: "Partial",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    not_documented: {
      className: "bg-destructive/10 text-destructive border-destructive/20",
      label: "Not Documented",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };
  const cfg = map[status] ?? { className: "bg-muted text-muted-foreground", label: status, icon: null };
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] px-1.5 py-0 flex items-center gap-1", cfg.className)}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
};

// ---------------------------------------------------------------------------
// Risk label
// ---------------------------------------------------------------------------
const RiskLabel = ({ risk }: { risk: "high" | "medium" | "low" }) => {
  const colors = {
    high: "text-destructive",
    medium: "text-amber-600",
    low: "text-muted-foreground",
  };
  return (
    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", colors[risk])}>
      {risk} risk
    </span>
  );
};

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
const ProtectionSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
    <div className="flex items-center gap-2">
      <span className="text-accent">{icon}</span>
      <h2 className="text-sm font-display font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Protection item row — clickable
// ---------------------------------------------------------------------------
const ProtectionItemRow = ({
  item,
  onClick,
}: {
  item: ProtectionItem;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all text-left"
  >
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground">{item.label}</p>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{item.recommendation}</p>
    </div>
    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
      <StatusBadge status={item.status} />
      <RiskLabel risk={item.risk} />
    </div>
  </button>
);

// ---------------------------------------------------------------------------
// Protection detail dialog
// ---------------------------------------------------------------------------
const actionsByStatus: Record<string, string[]> = {
  not_documented: [
    "Schedule documentation session with legal counsel",
    "Gather existing agreements and informal arrangements",
    "Draft formal documentation within 30 days",
    "File and store in secure data room",
  ],
  partial: [
    "Review existing documentation for gaps",
    "Identify missing components with specialist",
    "Complete remaining sections within 60 days",
    "Obtain sign-off from all relevant parties",
  ],
  under_review: [
    "Monitor review progress weekly",
    "Respond promptly to specialist requests",
    "Schedule completion call within 14 days",
    "Update data room upon finalization",
  ],
  in_place: [
    "Annual review scheduled — confirm renewal date",
    "Store current version in data room",
    "Notify relevant parties of any changes",
    "Schedule next review for Q3 2026",
  ],
};

const ProtectionDetailDialog = ({
  item,
  onClose,
}: {
  item: ProtectionItem | null;
  onClose: () => void;
}) => {
  if (!item) return null;
  const actions = actionsByStatus[item.status] ?? actionsByStatus["not_documented"];

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{item.label}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <StatusBadge status={item.status} />
            <RiskLabel risk={item.risk} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recommendation */}
          <div className="rounded-lg bg-muted/40 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Advisor Recommendation</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.recommendation}</p>
          </div>

          {/* Risk context */}
          {item.risk === "high" && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive mb-1">High Risk — Immediate Action Required</p>
                <p className="text-xs text-muted-foreground">This gap creates material risk to business value and the capital readiness score. Resolving this should be a Q2 priority.</p>
              </div>
            </div>
          )}
          {item.risk === "medium" && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">Medium Risk — Address Within 90 Days</p>
                <p className="text-xs text-muted-foreground">This item should be resolved before capital conversations begin. Include in Q2 sprint planning.</p>
              </div>
            </div>
          )}

          {/* Action steps */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Recommended Actions</p>
            {actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground">{action}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => {
            onClose();
          }} className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Add to Sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const ProtectionPage = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const protection = clientProtection[selectedClientId] ?? clientProtection["1"];
  const [selectedItem, setSelectedItem] = useState<ProtectionItem | null>(null);

  const assetItems = protection.filter((i) => i.category === "asset_matrix");
  const insuranceItems = protection.filter((i) => i.category === "insurance");
  const ipItems = protection.filter((i) => i.category === "ip_protection");

  // Compute simple scores
  const inPlaceCount = protection.filter((i) => i.status === "in_place").length;
  const totalItems = protection.length;
  const assetScore = Math.round((inPlaceCount / totalItems) * 100);
  const highRiskCount = protection.filter((i) => i.risk === "high").length;

  const clientInsurance = insuranceOpportunities.filter((i) => i.client === selectedClient.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">
          Protection Architecture — {selectedClient.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Asset protection, insurance, and IP coverage · Click any item to view details
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-4 gap-4"
      >
        <StatCard icon={ShieldCheck} label="Asset Protection Score" value={String(assetScore)} suffix="%" />
        <StatCard
          icon={Umbrella}
          label="Insurance Items"
          value={String(insuranceItems.length)}
          suffix=" reviewed"
        />
        <StatCard
          icon={Lock}
          label="IP Status"
          value={ipItems[0]?.status === "in_place" ? "Protected" : "Partial"}
        />
        <StatCard
          icon={AlertTriangle}
          label="High Risk Items"
          value={String(highRiskCount)}
          suffix=" flagged"
        />
      </motion.div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Asset Matrix */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeIn}>
          <ProtectionSection title="Asset Protection Matrix" icon={<ShieldCheck className="w-4 h-4" />}>
            {assetItems.map((item) => (
              <ProtectionItemRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </ProtectionSection>
        </motion.div>

        {/* Insurance */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeIn}>
          <ProtectionSection title="Insurance" icon={<Umbrella className="w-4 h-4" />}>
            <div className="space-y-2">
              {insuranceItems.map((item) => (
                <ProtectionItemRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />
              ))}
              {/* Insurance opportunities from copilot data */}
              {clientInsurance.length > 0 && (
                <>
                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                      Intelligence Layer — Additional Opportunities
                    </p>
                    {clientInsurance.map((opp) => (
                      <div
                        key={opp.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10 mb-2"
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                            opp.severity === "critical"
                              ? "bg-destructive"
                              : opp.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-muted-foreground"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{opp.type}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opp.reason}</p>
                          <p className="text-[11px] text-primary mt-1 leading-snug">{opp.action}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 capitalize flex-shrink-0",
                            opp.severity === "critical"
                              ? "border-destructive/30 text-destructive"
                              : opp.severity === "warning"
                              ? "border-amber-500/30 text-amber-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {opp.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ProtectionSection>
        </motion.div>

        {/* IP Protection */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeIn}>
          <ProtectionSection title="Intellectual Property" icon={<Lock className="w-4 h-4" />}>
            {ipItems.map((item) => (
              <ProtectionItemRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </ProtectionSection>
        </motion.div>
      </div>

      {/* Detail dialog */}
      <ProtectionDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default ProtectionPage;
