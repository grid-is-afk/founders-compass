import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { clientInstruments } from "@/lib/clientMockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Camera,
  Grid3X3,
  Landmark,
  GitBranch,
  ShieldCheck,
  Route,
  TrendingDown,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
} from "lucide-react";
import type { InstrumentType, InstrumentRef } from "@/lib/types/journey";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

// ---------------------------------------------------------------------------
// Instrument metadata
// ---------------------------------------------------------------------------
const instrumentMeta: Record<
  InstrumentType,
  { icon: React.ReactNode; description: string; phase: string; details: string }
> = {
  founder_business_index: {
    icon: <BarChart3 className="w-5 h-5" />,
    description: "Measures the overall attractiveness and readiness of the founder's business across 25 key factors.",
    phase: "Diagnose",
    details: "This index evaluates five core dimensions — revenue quality, customer concentration, operational dependency, governance maturity, and competitive positioning. The resulting score drives the capital readiness narrative and benchmarks the business against institutional buyer standards.",
  },
  founder_snapshot: {
    icon: <Camera className="w-5 h-5" />,
    description: "A point-in-time baseline of the founder's personal and business position relative to their goals.",
    phase: "Diagnose",
    details: "The Founder Snapshot captures the founder's current financial position, lifestyle requirements, risk tolerance, and timeline to transition. This establishes the Economic Certainty floor and anchors all subsequent planning decisions to the founder's personal outcome.",
  },
  founder_matrix: {
    icon: <Grid3X3 className="w-5 h-5" />,
    description: "Maps the founder's values, motivations, and risk tolerance against capital alignment objectives.",
    phase: "Diagnose",
    details: "The Founder Matrix is a structured values and motivations assessment covering legacy intent, control preferences, speed of transition, and financial risk appetite. Results are used to identify fit with capital structures and ensure alignment between the founder's personal goals and the engagement strategy.",
  },
  economic_certainty_framework: {
    icon: <Landmark className="w-5 h-5" />,
    description: "Defines the economic floor and target outcome required for the founder to achieve financial certainty.",
    phase: "Diagnose",
    details: "This framework quantifies the minimum capital required for the founder to maintain their desired lifestyle post-transition, the target transaction value to achieve legacy goals, and the gap between current business value and the target. The output is a clear economic certainty number that governs all strategy decisions.",
  },
  capital_strategy_architecture: {
    icon: <GitBranch className="w-5 h-5" />,
    description: "Blueprints the capital structure, entity alignment, and strategic pathway to the founder's target outcome.",
    phase: "Design TFO",
    details: "The Capital Strategy Architecture documents the optimal entity structure, identifies tax minimization opportunities, defines the capital raise or exit pathway, and aligns the strategy to the founder's economic certainty target. This becomes the master blueprint for all subsequent execution work.",
  },
  optionality_framework: {
    icon: <Route className="w-5 h-5" />,
    description: "Identifies and stress-tests exit and transition pathways to preserve and maximize founder optionality.",
    phase: "Align",
    details: "This framework maps available exit and transition options — strategic sale, private equity recapitalization, management buyout, family succession — and stress-tests each against the founder's economic certainty targets, timeline, and risk tolerance. The output preserves optionality while identifying the highest-probability path to the founder's desired outcome.",
  },
  wealth_gap_analysis: {
    icon: <TrendingDown className="w-5 h-5" />,
    description: "Quantifies the gap between current business value and the capital needed to fund the founder's future.",
    phase: "Design TFO",
    details: "The Wealth Gap Analysis computes current business enterprise value against the Economic Certainty target. The gap drives urgency and informs growth, protection, and capital strategy decisions. This instrument is updated each quarter as business performance and market conditions evolve.",
  },
  protection_architecture: {
    icon: <ShieldCheck className="w-5 h-5" />,
    description: "Documents and structures the insurance and asset protection layer to preserve value against risk.",
    phase: "Protect",
    details: "The Protection Architecture assesses the founder's current exposure across key person risk, buy-sell funding, business continuity, estate planning, and executive retention. It produces a prioritized action plan for closing protection gaps and integrating insurance into the overall capital strategy.",
  },
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status }: { status: "complete" | "in_progress" | "not_started" }) => {
  if (status === "complete") {
    return (
      <Badge className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="text-[10px] px-2 py-0 bg-accent/10 text-accent border-accent/20 hover:bg-accent/10">
        <Clock className="w-3 h-3 mr-1" />
        In Progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
      <Circle className="w-3 h-3 mr-1" />
      Not Started
    </Badge>
  );
};

// ---------------------------------------------------------------------------
// Instrument detail dialog content
// ---------------------------------------------------------------------------

const InstrumentDialog = ({
  inst,
  meta,
  open,
  onClose,
  clientName,
}: {
  inst: InstrumentRef;
  meta: typeof instrumentMeta[InstrumentType];
  open: boolean;
  onClose: () => void;
  clientName: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {meta.icon}
            </div>
            <div>
              <DialogTitle className="font-display text-base">{inst.name}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">{meta.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Status + phase row */}
          <div className="flex items-center gap-3">
            <StatusBadge status={inst.status} />
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Phase: {meta.phase}
            </span>
            {inst.completedDate && (
              <span className="text-xs text-muted-foreground">Completed {inst.completedDate}</span>
            )}
          </div>

          {/* Detail body */}
          {inst.status === "complete" && (
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Instrument Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{meta.details}</p>
            </div>
          )}

          {inst.status === "in_progress" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">In Progress</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This instrument is actively being completed. Work is underway on the {meta.phase} phase for {clientName}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-4">
                <p className="text-xs font-semibold text-foreground mb-2">About This Instrument</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{meta.details}</p>
              </div>
            </div>
          )}

          {/* Linked phase */}
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span>Linked to engagement phase:</span>
            <Badge variant="outline" className="text-[10px] px-2 py-0">{inst.linkedPhase.replace(/_/g, " ")}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const InstrumentsPage = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const instruments = clientInstruments[selectedClientId] ?? clientInstruments["1"];
  const [selectedInst, setSelectedInst] = useState<InstrumentRef | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">
          Instruments — {selectedClient.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Diagnostic and design instruments powering the TFO methodology
        </p>
      </motion.div>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex gap-4"
      >
        {[
          { label: "Complete", count: instruments.filter((i) => i.status === "complete").length, color: "text-emerald-600" },
          { label: "In Progress", count: instruments.filter((i) => i.status === "in_progress").length, color: "text-accent" },
          { label: "Upcoming", count: instruments.filter((i) => i.status === "not_started").length, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border px-5 py-3">
            <p className={cn("text-2xl font-bold font-display", s.color)}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Instrument grid */}
      <div className="grid grid-cols-2 gap-4">
        {instruments.map((inst, i) => {
          const meta = instrumentMeta[inst.type];
          return (
            <motion.div
              key={inst.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {meta.icon}
                </div>
                <StatusBadge status={inst.status} />
              </div>

              {/* Name */}
              <div>
                <p className="text-sm font-semibold text-foreground">{inst.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{meta.description}</p>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{meta.phase}</span>
                {inst.completedDate && (
                  <span>Completed {inst.completedDate}</span>
                )}
                {inst.status === "in_progress" && !inst.completedDate && (
                  <span className="text-accent">In progress</span>
                )}
              </div>

              {/* View button */}
              {inst.status === "not_started" ? (
                <Button variant="outline" size="sm" className="w-full text-xs mt-auto" disabled>
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                  Not yet available
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs mt-auto"
                  onClick={() => setSelectedInst(inst)}
                >
                  View Instrument
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail dialog */}
      {selectedInst && (
        <InstrumentDialog
          inst={selectedInst}
          meta={instrumentMeta[selectedInst.type]}
          open={!!selectedInst}
          onClose={() => setSelectedInst(null)}
          clientName={selectedClient.name}
        />
      )}
    </div>
  );
};

export default InstrumentsPage;
