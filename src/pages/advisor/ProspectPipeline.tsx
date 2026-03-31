import { useState } from "react";
import { motion } from "framer-motion";
import { prospects } from "@/lib/journeyMockData";
import ProspectCard from "@/components/dashboard/ProspectCard";
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
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar, TrendingUp, Users, CheckCircle2, XCircle } from "lucide-react";
import type { Prospect, ProspectStatus } from "@/lib/types/journey";
import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

interface Column {
  id: string;
  label: string;
  statuses: ProspectStatus[];
  accent: string;
}

const columns: Column[] = [
  {
    id: "intake",
    label: "Intake",
    statuses: ["intake"],
    accent: "bg-muted text-muted-foreground",
  },
  {
    id: "discovery",
    label: "Discovery",
    statuses: ["discovery_scheduled", "discovery_complete"],
    accent: "bg-blue-500/10 text-blue-700",
  },
  {
    id: "fit_assessment",
    label: "Fit Assessment",
    statuses: ["fit_assessment", "not_fit", "fit"],
    accent: "bg-accent/10 text-accent",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    statuses: ["onboarding"],
    accent: "bg-emerald-500/10 text-emerald-700",
  },
];

const filterProspects = (col: Column, all: Prospect[]) =>
  all.filter((p) => col.statuses.includes(p.status));

const statusLabel: Record<ProspectStatus, string> = {
  intake: "Intake",
  discovery_scheduled: "Discovery Scheduled",
  discovery_complete: "Discovery Complete",
  fit_assessment: "Fit Assessment",
  not_fit: "Not a Fit",
  fit: "Fit",
  onboarding: "Onboarding",
};

const ProspectDetailDialog = ({
  prospect,
  onClose,
}: {
  prospect: Prospect | null;
  onClose: () => void;
}) => {
  if (!prospect) return null;
  return (
    <Dialog open={!!prospect} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{prospect.name}</DialogTitle>
          <DialogDescription>{prospect.contact} · {prospect.company}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status + source */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {statusLabel[prospect.status]}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {prospect.source}
            </Badge>
            {prospect.fitDecision === "fit" && (
              <Badge className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Fit
              </Badge>
            )}
            {prospect.fitDecision === "no_fit" && (
              <Badge className="text-[10px] px-2 py-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                <XCircle className="w-3 h-3 mr-1" /> No Fit
              </Badge>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Company</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{prospect.company}</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Revenue</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{prospect.revenue}</p>
            </div>
          </div>

          {/* Fit score */}
          {prospect.fitScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Fit Score</span>
                <span className="font-bold text-foreground">{prospect.fitScore}/100</span>
              </div>
              <Progress value={prospect.fitScore} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                {prospect.fitScore >= 75
                  ? "Strong fit — recommend engagement"
                  : prospect.fitScore >= 50
                  ? "Moderate fit — further discovery recommended"
                  : "Low fit — may not meet TFO criteria"}
              </p>
            </div>
          )}

          {/* Contact info */}
          <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Contact</p>
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{prospect.contact}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Added {prospect.date}</span>
            </div>
          </div>

          {/* Notes */}
          {prospect.notes && (
            <div className="rounded-lg bg-muted/20 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{prospect.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onClose} className="gap-2">
            <Users className="w-4 h-4" /> Begin Discovery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProspectPipeline = () => {
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Prospect Pipeline</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pre-client fit assessment and onboarding funnel</p>
      </motion.div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col, colIdx) => {
          const colProspects = filterProspects(col, prospects);
          return (
            <motion.div
              key={col.id}
              custom={colIdx}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="space-y-3"
            >
              {/* Column header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-semibold ${col.accent}`}
                >
                  {colProspects.length}
                </Badge>
              </div>

              {/* Drop zone background */}
              <div className="rounded-lg bg-muted/30 border border-dashed border-border min-h-[120px] p-2 space-y-2">
                {colProspects.length === 0 && (
                  <div className="flex items-center justify-center h-16">
                    <span className="text-xs text-muted-foreground/50">No prospects</span>
                  </div>
                )}
                {colProspects.map((prospect) => (
                  <div key={prospect.id} onClick={() => setSelectedProspect(prospect)}>
                    <ProspectCard prospect={prospect} />
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Prospect detail dialog */}
      <ProspectDetailDialog
        prospect={selectedProspect}
        onClose={() => setSelectedProspect(null)}
      />
    </div>
  );
};

export default ProspectPipeline;
