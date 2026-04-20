import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, UserPlus, Building2, Calendar, TrendingUp, Users, CheckCircle2, XCircle, Phone, Flag, Sparkles, Activity, BookOpen } from "lucide-react";
import { useProspects, useCreateProspect, useUpdateProspect } from "@/hooks/useProspects";
import { useExposureIndexMap, useProspectExposureIndex } from "@/hooks/useProspectExposureIndex";
import { useSixCsMap } from "@/hooks/useProspectSixCs";
import ProspectCard from "@/components/dashboard/ProspectCard";
import { ExposureIndexStrip } from "@/components/prospects/ExposureIndexStrip";
import { ExposureIndexModal } from "@/components/prospects/ExposureIndexModal";
import { SixCsStrip } from "@/components/prospects/SixCsStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProspectStatus, Prospect } from "@/lib/types/journey";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EXPOSURE_CATEGORIES,
  CATEGORY_SHORT_LABELS,
  exposureLevel,
  buildAskQuarterbackPrompt,
  type CategoryId,
} from "@/lib/exposureIndexQuestions";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

function toProspectShape(row: Record<string, unknown>): Prospect & {
  fitScore?: number;
  fitDecision?: "fit" | "no_fit" | null;
  notes?: string;
  date: string;
} {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    contact: String(row.contact ?? "—"),
    company: String(row.company ?? "—"),
    revenue: String(row.revenue ?? "—"),
    source: String(row.source ?? "—"),
    status: (row.status ?? "intake") as ProspectStatus,
    fitScore: row.fit_score != null ? Number(row.fit_score) : undefined,
    fitDecision: (row.fit_decision as "fit" | "no_fit" | null) ?? undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    date: row.date
      ? new Date(String(row.date)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
  };
}

type ProspectShape = ReturnType<typeof toProspectShape>;

// ---------------------------------------------------------------------------
// Status labels and pipeline config
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  intake: "Intake",
  discovery_scheduled: "Discovery Scheduled",
  discovery_complete: "Discovery Complete",
  fit_assessment: "Fit Assessment",
  not_fit: "Not a Fit",
  fit: "Fit",
  onboarding: "Onboarding",
  nurture_call: "Nurture Call",
  kept_in_loop: "Kept in Loop",
  flagged_follow_up: "Flagged Follow-Up",
};

// Zone 1 — active pipeline stages
interface PipelineColumn {
  id: string;
  label: string;
  statuses: string[];
  accent: string;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "intake",
    label: "Intake",
    statuses: ["intake"],
    accent: "bg-muted text-muted-foreground",
  },
  {
    id: "fit_assessment",
    label: "Fit Assessment",
    statuses: ["fit_assessment"],
    accent: "bg-accent/10 text-accent",
  },
  {
    id: "discovery",
    label: "Discovery",
    statuses: ["discovery_scheduled", "discovery_complete"],
    accent: "bg-blue-500/10 text-blue-700",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    statuses: ["fit", "onboarding"],
    accent: "bg-emerald-500/10 text-emerald-700",
  },
];

// Zone 2 — off-pipeline
interface OffPipelineColumn {
  id: string;
  label: string;
  statuses: string[];
  description: string;
}

const OFF_PIPELINE_COLUMNS: OffPipelineColumn[] = [
  {
    id: "referral_not_fit",
    label: "Referral — Not Fit",
    statuses: ["nurture_call", "not_fit"],
    description: "Referrals who weren't the right fit — keep the relationship warm.",
  },
  {
    id: "other_not_fit",
    label: "Other — Not Fit",
    statuses: ["kept_in_loop", "flagged_follow_up"],
    description: "Non-referral prospects who weren't a fit at this time.",
  },
];

// Pipeline advancement map — new order: Intake → Fit Assessment → Discovery → Onboarding
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  intake: { status: "fit_assessment", label: "Begin Fit Assessment" },
  fit_assessment: { status: "discovery_scheduled", label: "Schedule Discovery" },
  discovery_scheduled: { status: "discovery_complete", label: "Complete Discovery" },
  discovery_complete: { status: "fit", label: "Mark as Fit" },
  fit: { status: "onboarding", label: "Begin Onboarding" },
};

// ---------------------------------------------------------------------------
// Prospect Detail Dialog
// ---------------------------------------------------------------------------

interface DetailDialogProps {
  prospect: ProspectShape | null;
  onClose: () => void;
  onAdvance: (id: string, newStatus: string) => void;
  onMarkNotFit: (id: string, source: string) => void;
  isPending: boolean;
}

function ProspectDetailDialog({
  prospect,
  onClose,
  onAdvance,
  onMarkNotFit,
  isPending,
}: DetailDialogProps) {
  const [retakeOpen, setRetakeOpen] = useState(false);
  const { data: fullRecord } = useProspectExposureIndex(prospect?.id ?? null);
  const { setIsOpen: setCopilotOpen, sendMessage, isStreaming } = useCopilotContext();

  if (!prospect) return null;

  const next = NEXT_STATUS[prospect.status];
  const showNotFitButton = prospect.status === "fit_assessment";
  const isTerminal = ["not_fit", "onboarding", "nurture_call", "kept_in_loop", "flagged_follow_up"].includes(
    prospect.status
  );

  const handleAskQuarterback = () => {
    if (!fullRecord?.category_scores) return;
    if (isStreaming) {
      toast.info("Quarterback is busy — please wait a moment");
      return;
    }
    const prompt = buildAskQuarterbackPrompt(
      prospect.name,
      fullRecord.category_scores as Record<CategoryId, number>
    );
    setCopilotOpen(true);
    setTimeout(() => sendMessage(prompt), 80);
  };

  return (
    <>
      <Dialog open={!!prospect} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{prospect.name}</DialogTitle>
            <DialogDescription>
              {prospect.contact} · {prospect.company}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {STATUS_LABEL[prospect.status] ?? prospect.status}
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

            {/* Data grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Company
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">{prospect.company}</p>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Revenue
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">{prospect.revenue}</p>
              </div>
            </div>

            {prospect.fitScore !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Fit Score</span>
                  <span className="font-bold text-foreground">{prospect.fitScore}/100</span>
                </div>
                <Progress value={prospect.fitScore} className="h-2" />
              </div>
            )}

            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                Contact
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{prospect.contact}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Added {prospect.date}</span>
              </div>
            </div>

            {/* Exposure Index section */}
            {fullRecord ? (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Founder Exposure Index™
                </p>
                <div className="space-y-2">
                  {EXPOSURE_CATEGORIES.map((cat) => {
                    const score = (fullRecord.category_scores as Record<CategoryId, number>)[cat.id] ?? 0;
                    const level = exposureLevel(score);
                    const levelColor =
                      level === "Low"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : level === "Medium"
                        ? "bg-amber-400/10 text-amber-700 border-amber-400/20"
                        : "bg-destructive/10 text-destructive border-destructive/20";
                    const barColor =
                      level === "Low"
                        ? "bg-emerald-500"
                        : level === "Medium"
                        ? "bg-amber-400"
                        : "bg-destructive";

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground font-medium">
                            {CATEGORY_SHORT_LABELS[cat.id]}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1.5 py-0 h-4", levelColor)}
                            >
                              {level}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {score}/9
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", barColor)}
                            style={{ width: `${(score / 9) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setRetakeOpen(true)}
                  >
                    Retake Assessment
                  </button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90 border-0"
                    onClick={handleAskQuarterback}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Quarterback
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setRetakeOpen(true)}
              >
                <Activity className="w-3.5 h-3.5" />
                Run Exposure Index
              </Button>
            )}

            {prospect.notes && (
              <div className="rounded-lg bg-muted/20 border border-border p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Notes
                </p>
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  {prospect.notes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {prospect.status === "onboarding" && (
              <Button
                variant="outline"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() =>
                  toast.info("Investment Probability Dashboard — coming soon")
                }
              >
                <TrendingUp className="w-4 h-4" />
                Investment Probability Dashboard
              </Button>
            )}
            {showNotFitButton && (
              <Button
                variant="destructive"
                onClick={() => onMarkNotFit(prospect.id, prospect.source)}
                disabled={isPending}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" /> Not a Fit
              </Button>
            )}
            {next && !isTerminal && (
              <Button
                onClick={() => onAdvance(prospect.id, next.status)}
                disabled={isPending}
                className="gap-2"
              >
                {isPending ? "Updating..." : next.label}
              </Button>
            )}
            {isTerminal && prospect.status !== "onboarding" && (
              <span className="text-xs text-muted-foreground italic px-2">
                Prospect is off-pipeline
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {retakeOpen && (
        <ExposureIndexModal
          open={retakeOpen}
          onClose={() => setRetakeOpen(false)}
          prospectId={prospect.id}
          prospectName={prospect.name}
          existingRecord={fullRecord ?? null}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Prospect Dialog
// ---------------------------------------------------------------------------

function AddProspectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProspect = useCreateProspect();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    company: "",
    revenue: "",
    source: "" as "Referral" | "Other" | "",
    notes: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Prospect name is required");
      return;
    }
    if (!form.source) {
      toast.error("Source is required");
      return;
    }
    try {
      await createProspect.mutateAsync({
        name: form.name.trim(),
        contact: form.contact.trim() || null,
        company: form.company.trim() || null,
        revenue: form.revenue.trim() || null,
        source: form.source,
        notes: form.notes.trim() || null,
        status: "intake",
      });
      toast.success(`Prospect "${form.name}" added`);
      setForm({ name: "", contact: "", company: "", revenue: "", source: "", notes: "" });
      onClose();
    } catch {
      toast.error("Failed to add prospect");
    }
  };

  const textFields: Array<{ label: string; key: keyof typeof form; placeholder: string }> = [
    { label: "Name *", key: "name", placeholder: "e.g. John Smith" },
    { label: "Contact", key: "contact", placeholder: "e.g. john@company.com" },
    { label: "Company", key: "company", placeholder: "e.g. Acme Corp" },
    { label: "Revenue", key: "revenue", placeholder: "e.g. $5M" },
    { label: "Notes", key: "notes", placeholder: "Optional notes..." },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Prospect</DialogTitle>
          <DialogDescription>
            Enter prospect details to add them to the pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {textFields.map(({ label, key, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-foreground">{label}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          {/* Source — required Select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Source *</label>
            <Select
              value={form.source}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, source: v as "Referral" | "Other" }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createProspect.isPending}
          >
            {createProspect.isPending ? "Adding..." : "Add Prospect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const ProspectPipeline = () => {
  const { data: rawProspects = [], isLoading } = useProspects();
  const updateProspect = useUpdateProspect();
  const { data: exposureMap } = useExposureIndexMap("fit_assessment");
  const { data: sixCsMap } = useSixCsMap("fit_assessment");
  const [selectedProspect, setSelectedProspect] = useState<ProspectShape | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const prospects = (rawProspects as Record<string, unknown>[]).map(toProspectShape);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAdvance = async (id: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { id, status: newStatus };
      if (newStatus === "fit") updates.fit_decision = "fit";
      await updateProspect.mutateAsync(updates);
      toast.success("Prospect updated", {
        description: `Status changed to ${STATUS_LABEL[newStatus] || newStatus}.`,
      });
      setSelectedProspect(null);
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  /**
   * Fork logic: referral → nurture_call, other → kept_in_loop
   */
  const handleMarkNotFit = async (id: string, source: string) => {
    const isReferral = source.toLowerCase() === "referral";
    const newStatus: ProspectStatus = isReferral ? "nurture_call" : "kept_in_loop";
    try {
      await updateProspect.mutateAsync({ id, status: newStatus, fit_decision: "no_fit" });
      toast.success(
        isReferral
          ? "Moved to Nurture Call — referral relationship preserved"
          : "Marked as Kept in Loop"
      );
      setSelectedProspect(null);
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const handleScheduleNurtureCall = async (id: string) => {
    try {
      await updateProspect.mutateAsync({ id, status: "nurture_call" });
      toast.success("Scheduled for Nurture Call");
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const handleFlagFollowUp = async (id: string) => {
    try {
      await updateProspect.mutateAsync({ id, status: "flagged_follow_up" });
      toast.success("Flagged for Follow-Up");
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  // ---------------------------------------------------------------------------
  // Bucketing
  // ---------------------------------------------------------------------------

  const pipelineProspects = prospects.filter((p) =>
    PIPELINE_COLUMNS.some((col) => col.statuses.includes(p.status))
  );

  const zone1HasProspects = pipelineProspects.length > 0;
  const hasAny = prospects.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">
              Prospect Pipeline
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pre-client fit assessment and onboarding funnel
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Loading prospects...
        </div>
      ) : (
        <>
          {/* ================================================================
              Zone 1 — Active Pipeline
          ================================================================ */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <div className="hidden lg:flex items-start gap-0">
              {PIPELINE_COLUMNS.map((col, colIdx) => {
                const colProspects = prospects.filter((p) =>
                  col.statuses.includes(p.status)
                );
                const isLast = colIdx === PIPELINE_COLUMNS.length - 1;

                return (
                  <div key={col.id} className="flex items-start flex-1 min-w-0">
                    <motion.div
                      custom={colIdx}
                      variants={fadeIn}
                      className="flex-1 min-w-0 flex flex-col"
                    >
                      {/* Column header */}
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-base font-semibold text-foreground">
                          {col.label}
                        </h2>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-semibold",
                            col.accent
                          )}
                        >
                          {colProspects.length}
                        </Badge>
                      </div>

                      {/* Column body */}
                      <div className="bg-muted/30 border border-dashed border-border rounded-lg p-2 space-y-2 min-h-[120px]">
                        {colProspects.length === 0 && (
                          <div className="flex items-center justify-center h-16">
                            <span className="text-xs text-muted-foreground/50">
                              No prospects
                            </span>
                          </div>
                        )}
                        {colProspects.map((prospect) => (
                          <div key={prospect.id} className="space-y-1.5">
                            <div
                              onClick={() => setSelectedProspect(prospect)}
                              className="cursor-pointer"
                            >
                              <ProspectCard prospect={prospect as Prospect} />
                            </div>
                            {/* Assessment tools — fit_assessment column */}
                            {col.id === "fit_assessment" && (
                              <>
                                <ExposureIndexStrip
                                  prospect={prospect as Prospect}
                                  summary={exposureMap?.[prospect.id] ?? null}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="w-full h-8 text-xs gap-1.5 opacity-50 cursor-not-allowed"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  Why.OS — Coming Soon
                                </Button>
                                <SixCsStrip
                                  prospect={prospect as Prospect}
                                  record={sixCsMap?.[prospect.id] ?? null}
                                />
                              </>
                            )}
                            {/* Investment Probability Dashboard — onboarding column */}
                            {col.id === "onboarding" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info(
                                    "Investment Probability Dashboard — coming soon"
                                  );
                                }}
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Investment Probability Dashboard
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Chevron connector between columns */}
                    {!isLast && (
                      <div
                        className="flex-shrink-0 flex items-start pt-8 px-1"
                        aria-hidden="true"
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile/tablet stacked layout (< lg) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              {PIPELINE_COLUMNS.map((col, colIdx) => {
                const colProspects = prospects.filter((p) =>
                  col.statuses.includes(p.status)
                );
                return (
                  <motion.div
                    key={col.id}
                    custom={colIdx}
                    variants={fadeIn}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-foreground">
                        {col.label}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-semibold",
                          col.accent
                        )}
                      >
                        {colProspects.length}
                      </Badge>
                    </div>
                    <div className="bg-muted/30 border border-dashed border-border rounded-lg p-2 space-y-2 min-h-[120px]">
                      {colProspects.length === 0 && (
                        <div className="flex items-center justify-center h-16">
                          <span className="text-xs text-muted-foreground/50">No prospects</span>
                        </div>
                      )}
                      {colProspects.map((prospect) => (
                        <div key={prospect.id} className="space-y-1.5">
                          <div
                            onClick={() => setSelectedProspect(prospect)}
                            className="cursor-pointer"
                          >
                            <ProspectCard prospect={prospect as Prospect} />
                          </div>
                          {col.id === "fit_assessment" && (
                            <>
                              <ExposureIndexStrip
                                prospect={prospect as Prospect}
                                summary={exposureMap?.[prospect.id] ?? null}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full h-8 text-xs gap-1.5 opacity-50 cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                Why.OS — Coming Soon
                              </Button>
                              <SixCsStrip
                                prospect={prospect as Prospect}
                                record={sixCsMap?.[prospect.id] ?? null}
                              />
                            </>
                          )}
                          {col.id === "onboarding" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(
                                  "Investment Probability Dashboard — coming soon"
                                );
                              }}
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              Investment Probability Dashboard
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ================================================================
              Zone divider — Off-Pipeline
          ================================================================ */}
          {hasAny && (
            <div className="relative flex items-center py-2">
              <div className="flex-1 border-t border-border/40" />
              <span className="ml-0 absolute left-0 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold bg-background pr-3">
                Off-Pipeline
              </span>
            </div>
          )}

          {/* ================================================================
              Zone 2 — Off-Pipeline
          ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-90">
            {OFF_PIPELINE_COLUMNS.map((col, colIdx) => {
              const colProspects = prospects.filter((p) =>
                col.statuses.includes(p.status)
              );

              return (
                <motion.div
                  key={col.id}
                  custom={colIdx + PIPELINE_COLUMNS.length}
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{col.label}</h2>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        {col.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-semibold bg-muted text-muted-foreground"
                    >
                      {colProspects.length}
                    </Badge>
                  </div>

                  <div className="bg-muted/20 border border-dashed border-border/60 rounded-lg p-2 space-y-2 min-h-[80px]">
                    {colProspects.length === 0 && (
                      <div className="flex items-center justify-center h-12">
                        <span className="text-xs text-muted-foreground/40">Empty</span>
                      </div>
                    )}
                    {colProspects.map((prospect) => (
                      <div key={prospect.id} className="space-y-1.5">
                        <div
                          onClick={() => setSelectedProspect(prospect)}
                          className="cursor-pointer"
                        >
                          <ProspectCard prospect={prospect as Prospect} />
                        </div>

                        {/* Zone 2 action buttons — outside the clickable card */}
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {col.id === "referral_not_fit" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground gap-1.5"
                              onClick={() => handleScheduleNurtureCall(prospect.id)}
                              disabled={updateProspect.isPending || prospect.status === "nurture_call"}
                            >
                              <Phone className="w-3 h-3" />
                              {prospect.status === "nurture_call" ? "Nurture Call Scheduled" : "Schedule Nurture Call"}
                            </Button>
                          )}
                          {col.id === "other_not_fit" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground gap-1.5"
                              onClick={() => handleFlagFollowUp(prospect.id)}
                              disabled={
                                updateProspect.isPending ||
                                prospect.status === "flagged_follow_up"
                              }
                            >
                              <Flag className="w-3 h-3" />
                              {prospect.status === "flagged_follow_up"
                                ? "Flagged"
                                : "Flag for Follow Up"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {prospects.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">
            No prospects yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first prospect to start the pipeline.
          </p>
          <Button onClick={() => setAddOpen(true)}>Add Prospect</Button>
        </div>
      )}

      {/* Dialogs */}
      <ProspectDetailDialog
        prospect={selectedProspect}
        onClose={() => setSelectedProspect(null)}
        onAdvance={handleAdvance}
        onMarkNotFit={handleMarkNotFit}
        isPending={updateProspect.isPending}
      />
      <AddProspectDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default ProspectPipeline;
