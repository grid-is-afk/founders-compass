import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";
import { useClientInstruments } from "@/hooks/useInstrumentsApi";
import { useClientGrow } from "@/hooks/useGrowApi";
import { useClientProtection } from "@/hooks/useProtectionApi";
import QuarterlyJourney from "@/components/dashboard/QuarterlyJourney";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  Circle,
  ShieldCheck,
  TrendingUp,
  Users,
  Network,
  Compass,
  CalendarDays,
  BarChart3,
  GitBranch,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

const InstrumentBadge = ({ status }: { status: string }) => {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
      <Circle className="w-3 h-3" /> Upcoming
    </span>
  );
};

const ProtectionBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    in_place: "bg-emerald-500/10 text-emerald-700",
    under_review: "bg-accent/10 text-accent",
    partial: "bg-amber-500/10 text-amber-700",
    not_documented: "bg-destructive/10 text-destructive",
    review: "bg-accent/10 text-accent",
  };
  const labels: Record<string, string> = {
    in_place: "In Place",
    under_review: "Under Review",
    partial: "Partial",
    not_documented: "Not Documented",
    review: "Under Review",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", map[status] ?? "bg-muted text-muted-foreground")}>
      {labels[status] ?? status}
    </span>
  );
};

const capitalColors: Record<string, { icon: string; bg: string }> = {
  human_capital:      { icon: "text-primary",     bg: "bg-primary/10" },
  customer_capital:   { icon: "text-accent",       bg: "bg-accent/10" },
  structural_capital: { icon: "text-emerald-600",  bg: "bg-emerald-500/10" },
  social_capital:     { icon: "text-violet-600",   bg: "bg-violet-500/10" },
  personal_path:      { icon: "text-amber-600",    bg: "bg-amber-500/10" },
};

const capitalIcons: Record<string, React.ReactNode> = {
  human_capital:      <Users className="w-4 h-4" />,
  customer_capital:   <TrendingUp className="w-4 h-4" />,
  structural_capital: <BarChart3 className="w-4 h-4" />,
  social_capital:     <Network className="w-4 h-4" />,
  personal_path:      <Compass className="w-4 h-4" />,
};

const PhaseSection = ({
  title,
  subtitle,
  accent,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              {accent && <div className={cn("w-2 h-6 rounded-full", accent)} />}
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-5 py-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Adapt DB quarterly plan rows to the QuarterlyJourney component's expected shape
function adaptQuarterPlans(dbPlans: any[]) {
  return dbPlans.map((p) => ({
    quarter: `Q${p.quarter}`,
    year: p.year,
    label: p.label ?? "",
    status: p.status ?? "upcoming",
    reviewDate: p.review_date ?? null,
    phases: (p.phases ?? []).map((ph: any) => ({
      id: ph.id ?? `${p.id}-${ph.phase}`,
      phase: ph.phase,
      label: ph.label ?? ph.phase,
      status: ph.status ?? "not_started",
      completedTasks: ph.completed_tasks ?? 0,
      totalTasks: ph.total_tasks ?? 0,
    })),
  }));
}

const AdvisorJourney = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawPlans = [], isLoading: plansLoading } = useClientQuarterlyPlans(selectedClientId);
  const { data: rawInstruments = [] } = useClientInstruments(selectedClientId);
  const { data: rawGrow = [] } = useClientGrow(selectedClientId);
  const { data: rawProtection = [] } = useClientProtection(selectedClientId);

  const quarterPlans = adaptQuarterPlans(rawPlans as any[]);
  const instruments = rawInstruments as any[];
  const growEngagements = rawGrow as any[];
  const protection = rawProtection as any[];

  const activeQuarterPlan = quarterPlans.find((q) => q.status === "active") ?? quarterPlans[0];
  const activeQuarterNum = activeQuarterPlan
    ? (parseInt(activeQuarterPlan.quarter.replace("Q", "")) as 1 | 2 | 3 | 4)
    : 1;

  const quarters = quarterPlans.map((q) => {
    const ranges: Record<string, string> = {
      Q1: "Jan 1 – Mar 31",
      Q2: "Apr 1 – Jun 30",
      Q3: "Jul 1 – Sep 30",
      Q4: "Oct 1 – Dec 31",
    };
    return {
      label: q.quarter,
      year: q.year,
      range: ranges[q.quarter],
      status: q.status === "complete" ? "complete" : q.status === "active" ? "active" : "upcoming",
      daysLeft: q.status === "active" ? undefined : undefined,
    };
  });

  const proveInstruments = instruments.filter((i) =>
    ["diagnose", "design_tfo"].includes(i.linked_phase ?? "")
  );

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Journey</h1>
          <p className="text-muted-foreground mt-1 text-sm">Quarterly cycle engagement</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground">Add your first client to begin tracking their engagement journey.</p>
        </div>
      </div>
    );
  }

  if (plansLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Journey — {selectedClient.name}</h1>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading journey data...
        </div>
      </div>
    );
  }

  if (quarterPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Journey — {selectedClient.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Quarterly cycle engagement</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No quarterly plans yet</h3>
          <p className="text-sm text-muted-foreground">Create quarterly plans to track the client journey.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">
          Client Journey — {selectedClient.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Quarterly cycle · {selectedClient.contact_name ?? "—"} ·{" "}
          {activeQuarterPlan
            ? `${activeQuarterPlan.quarter} ${activeQuarterPlan.year} ${
                activeQuarterPlan.status === "active"
                  ? "Active"
                  : activeQuarterPlan.status === "complete"
                  ? "Complete"
                  : "Upcoming"
              }`
            : ""}
        </p>
      </motion.div>

      {/* Quarter indicator bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex gap-2"
      >
        {quarters.map((q) => (
          <div
            key={q.label}
            className={cn(
              "flex-1 rounded-lg border px-4 py-3 transition-all",
              q.status === "active"
                ? "gradient-gold border-accent/40 shadow-sm"
                : q.status === "complete"
                ? "bg-muted/60 border-border"
                : "bg-card border-border opacity-60"
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className={cn("text-xs font-bold", q.status === "active" ? "text-accent-foreground" : "text-foreground")}>
                {q.label}
              </span>
              {q.status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <p className={cn("text-[10px]", q.status === "active" ? "text-accent-foreground/80" : "text-muted-foreground")}>
              {q.range}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Quarterly Journey Ring */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeIn}>
        <QuarterlyJourney quarterPlans={quarterPlans as any} activeQuarter={activeQuarterNum} />
      </motion.div>

      {/* Phase Sections */}
      <div className="space-y-3">
        {/* Prove */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeIn}>
          <PhaseSection
            title="Prove"
            subtitle={`${proveInstruments.filter((i) => i.status === "complete").length}/${proveInstruments.length} instruments complete`}
            accent="bg-primary"
            defaultOpen
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Instruments and deliverables completed during Diagnose and Design phases.
              </p>
              {proveInstruments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No instruments on file yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {proveInstruments.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{inst.name}</p>
                        {inst.completed_date && (
                          <p className="text-[10px] text-muted-foreground">{inst.completed_date}</p>
                        )}
                      </div>
                      <InstrumentBadge status={inst.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PhaseSection>
        </motion.div>

        {/* Protect */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeIn}>
          <PhaseSection
            title="Protect"
            subtitle={`${protection.filter((i) => i.status === "in_place").length}/${protection.length} items in place`}
            accent="bg-accent"
          >
            {protection.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No protection items on file yet.</p>
            ) : (
              <div className="space-y-2">
                {protection.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.recommendation ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <ProtectionBadge status={item.status} />
                      <span className={cn("text-[10px] font-medium",
                        item.risk === "high" ? "text-destructive" : item.risk === "medium" ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {item.risk ?? "—"} risk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PhaseSection>
        </motion.div>

        {/* Grow */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeIn}>
          <PhaseSection
            title="Grow"
            subtitle={`${growEngagements.filter((e) => e.status === "in_progress").length}/${growEngagements.length} engagements active`}
            accent="bg-emerald-600"
          >
            {growEngagements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No grow engagements on file yet.</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {growEngagements.map((eng) => {
                  const colors = capitalColors[eng.capital_type ?? ""] ?? { icon: "text-muted-foreground", bg: "bg-muted" };
                  const icon = capitalIcons[eng.capital_type ?? ""] ?? null;
                  const pct = eng.task_count > 0 ? Math.round((eng.completed_tasks / eng.task_count) * 100) : 0;
                  return (
                    <div key={eng.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", colors.bg)}>
                        <span className={colors.icon}>{icon}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-tight">{eng.label}</p>
                      {eng.partner && <p className="text-[10px] text-muted-foreground truncate">{eng.partner}</p>}
                      <Progress value={pct} className="h-1" />
                      <p className="text-[10px] text-muted-foreground">{eng.completed_tasks}/{eng.task_count} tasks</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        eng.status === "in_progress" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                      )}>
                        {eng.status === "in_progress" ? "Active" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </PhaseSection>
        </motion.div>

        {/* Align */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
          <PhaseSection
            title="Align"
            subtitle={`Quarterly review ${activeQuarterPlan?.reviewDate ?? "TBD"}`}
            accent="bg-muted-foreground"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20">
                <CalendarDays className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeQuarterPlan?.quarter} Quarterly Review
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Scheduled — {activeQuarterPlan?.reviewDate ?? "TBD"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Review objectives will be defined when the quarterly review is scheduled.
                </p>
              </div>
            </div>
          </PhaseSection>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvisorJourney;
