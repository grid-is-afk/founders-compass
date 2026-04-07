import { useState, useMemo, useCallback } from "react";
import { TrendingUp, Shield, User, LayoutGrid, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useSaveAssessment } from "@/hooks/useAssessmentsApi";
import {
  ASSESSMENT_CONFIGS,
  type AssessmentTypeKey,
  type FactorDefinition,
} from "@/lib/assessmentFactors";
import { getCategoryLabel } from "@/lib/assessmentUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoredValue = 1 | 2 | 3 | 4 | 5 | 6;
type QualitativeValue = "positive" | "neutral" | "improvement";

interface FactorState {
  score?: ScoredValue;
  rating?: QualitativeValue;
  considerations: string;
}

type FormScores = Record<string, FactorState>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssessmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

// ─── Step 1: Type Selection ───────────────────────────────────────────────────

const TYPE_CARDS = [
  {
    key: "business_attractiveness" as AssessmentTypeKey,
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    selectedBg: "bg-primary/5",
  },
  {
    key: "business_readiness" as AssessmentTypeKey,
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    selectedBg: "bg-blue-50/60",
  },
  {
    key: "personal_readiness" as AssessmentTypeKey,
    icon: User,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    selectedBg: "bg-violet-50/60",
  },
  {
    key: "value_factors" as AssessmentTypeKey,
    icon: LayoutGrid,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    selectedBg: "bg-amber-50/60",
  },
];

// ─── Numeric score pills (1–6) ────────────────────────────────────────────────

const SCORE_COLORS: Record<number, { selected: string; hover: string }> = {
  1: { selected: "bg-destructive text-white border-destructive", hover: "hover:bg-destructive/10 hover:border-destructive/50" },
  2: { selected: "bg-destructive/80 text-white border-destructive/80", hover: "hover:bg-destructive/10 hover:border-destructive/40" },
  3: { selected: "bg-amber-500 text-white border-amber-500", hover: "hover:bg-amber-50 hover:border-amber-300" },
  4: { selected: "bg-amber-400 text-white border-amber-400", hover: "hover:bg-amber-50 hover:border-amber-200" },
  5: { selected: "bg-primary text-white border-primary", hover: "hover:bg-primary/10 hover:border-primary/50" },
  6: { selected: "bg-primary text-white border-primary ring-2 ring-primary/30", hover: "hover:bg-primary/10 hover:border-primary/50" },
};

interface ScorePillsProps {
  value?: ScoredValue;
  onChange: (v: ScoredValue) => void;
}

const ScorePills = ({ value, onChange }: ScorePillsProps) => (
  <div className="flex items-center gap-1.5" role="radiogroup">
    {([1, 2, 3, 4, 5, 6] as ScoredValue[]).map((n) => {
      const isSelected = value === n;
      const colors = SCORE_COLORS[n];
      return (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onChange(n)}
          className={cn(
            "w-7 h-7 rounded-full text-xs font-semibold border transition-all flex items-center justify-center flex-shrink-0",
            isSelected
              ? colors.selected
              : cn("border-border text-muted-foreground bg-background", colors.hover)
          )}
        >
          {n}
        </button>
      );
    })}
  </div>
);

// ─── Qualitative buttons ──────────────────────────────────────────────────────

const QUALITATIVE_OPTIONS: Array<{
  value: QualitativeValue;
  label: string;
  selected: string;
  hover: string;
}> = [
  {
    value: "positive",
    label: "Positive",
    selected: "bg-primary text-primary-foreground border-primary",
    hover: "hover:bg-primary/10 hover:border-primary/40 hover:text-primary",
  },
  {
    value: "neutral",
    label: "Neutral",
    selected: "bg-amber-500 text-white border-amber-500",
    hover: "hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700",
  },
  {
    value: "improvement",
    label: "For Improvement",
    selected: "bg-destructive text-destructive-foreground border-destructive",
    hover: "hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive",
  },
];

interface QualitativeButtonsProps {
  value?: QualitativeValue;
  onChange: (v: QualitativeValue) => void;
}

const QualitativeButtons = ({ value, onChange }: QualitativeButtonsProps) => (
  <div className="flex items-center gap-1.5" role="radiogroup">
    {QUALITATIVE_OPTIONS.map((opt) => {
      const isSelected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap",
            isSelected
              ? opt.selected
              : cn("border-border text-muted-foreground bg-background", opt.hover)
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ─── Category section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: string;
  factors: FactorDefinition[];
  scores: FormScores;
  scoringType: "numeric" | "qualitative";
  onScore: (factorName: string, score: ScoredValue) => void;
  onRating: (factorName: string, rating: QualitativeValue) => void;
  onConsiderations: (factorName: string, value: string) => void;
  openConsiderations: Set<string>;
  onToggleConsiderations: (factorName: string) => void;
  defaultOpen?: boolean;
}

const CategorySection = ({
  category,
  factors,
  scores,
  scoringType,
  onScore,
  onRating,
  onConsiderations,
  openConsiderations,
  onToggleConsiderations,
  defaultOpen = true,
}: CategorySectionProps) => {
  const [expanded, setExpanded] = useState(defaultOpen);

  const scoredCount = factors.filter((f) => {
    const s = scores[f.name];
    return scoringType === "numeric" ? s?.score !== undefined : s?.rating !== undefined;
  }).length;

  const allScored = scoredCount === factors.length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Category header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm font-display font-semibold text-foreground">
            {getCategoryLabel(category)}
          </span>
          <span className="text-[10px] text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
            {factors.length} factor{factors.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allScored ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {scoredCount}/{factors.length}
            </span>
          )}
        </div>
      </button>

      {/* Factors list */}
      {expanded && (
        <div className="divide-y divide-border">
          {factors.map((factor) => {
            const state = scores[factor.name] ?? { considerations: "" };
            const isConsOpen = openConsiderations.has(factor.name);

            return (
              <div key={factor.name} className="px-4 py-3 space-y-2">
                {/* Factor row */}
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-foreground leading-snug">{factor.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {factor.considerations}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                    {scoringType === "numeric" ? (
                      <ScorePills
                        value={state.score}
                        onChange={(v) => onScore(factor.name, v)}
                      />
                    ) : (
                      <QualitativeButtons
                        value={state.rating}
                        onChange={(v) => onRating(factor.name, v)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleConsiderations(factor.name)}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors flex-shrink-0"
                    >
                      {isConsOpen ? "Hide notes" : "Add notes"}
                    </button>
                  </div>
                </div>

                {/* Considerations input */}
                {isConsOpen && (
                  <textarea
                    value={state.considerations}
                    onChange={(e) => onConsiderations(factor.name, e.target.value)}
                    placeholder="Advisory notes for this factor…"
                    rows={2}
                    className={cn(
                      "w-full text-xs text-foreground placeholder:text-muted-foreground/60",
                      "bg-muted/30 border border-border rounded-md px-3 py-2 resize-none",
                      "focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring",
                      "transition-colors leading-relaxed"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main form component ──────────────────────────────────────────────────────

const AssessmentForm = ({ open, onOpenChange, clientId, clientName }: AssessmentFormProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<AssessmentTypeKey | null>(null);
  const [scores, setScores] = useState<FormScores>({});
  const [openConsiderations, setOpenConsiderations] = useState<Set<string>>(new Set());

  const saveAssessment = useSaveAssessment();

  const config = selectedType ? ASSESSMENT_CONFIGS[selectedType] : null;

  // ── Derived progress ─────────────────────────────────────────────────────

  const { scoredCount, totalCount } = useMemo(() => {
    if (!config) return { scoredCount: 0, totalCount: 0 };
    const total = config.factors.length;
    const scored = config.factors.filter((f) => {
      const s = scores[f.name];
      return config.scoringType === "numeric" ? s?.score !== undefined : s?.rating !== undefined;
    }).length;
    return { scoredCount: scored, totalCount: total };
  }, [config, scores]);

  const progressPct = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

  // ── Grouped factors ──────────────────────────────────────────────────────

  const groupedFactors = useMemo(() => {
    if (!config) return new Map<string, FactorDefinition[]>();
    const map = new Map<string, FactorDefinition[]>();
    for (const f of config.factors) {
      const cat = f.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }
    return map;
  }, [config]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleScore = useCallback((factorName: string, score: ScoredValue) => {
    setScores((prev) => ({
      ...prev,
      [factorName]: { ...prev[factorName], score, considerations: prev[factorName]?.considerations ?? "" },
    }));
  }, []);

  const handleRating = useCallback((factorName: string, rating: QualitativeValue) => {
    setScores((prev) => ({
      ...prev,
      [factorName]: { ...prev[factorName], rating, considerations: prev[factorName]?.considerations ?? "" },
    }));
  }, []);

  const handleConsiderations = useCallback((factorName: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [factorName]: { ...prev[factorName], considerations: value },
    }));
  }, []);

  const handleToggleConsiderations = useCallback((factorName: string) => {
    setOpenConsiderations((prev) => {
      const next = new Set(prev);
      if (next.has(factorName)) {
        next.delete(factorName);
      } else {
        next.add(factorName);
      }
      return next;
    });
  }, []);

  const handleSelectType = (key: AssessmentTypeKey) => {
    setSelectedType(key);
    setScores({});
    setOpenConsiderations(new Set());
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedType(null);
    setScores({});
    setOpenConsiderations(new Set());
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStep(1);
      setSelectedType(null);
      setScores({});
      setOpenConsiderations(new Set());
    }, 200);
  };

  const handleSave = async () => {
    if (!selectedType || !config) return;

    const factors = config.factors.map((f) => {
      const s = scores[f.name];
      return {
        factor_name: f.name,
        category: f.category,
        score: config.scoringType === "numeric" ? (s?.score ?? null) : null,
        rating: config.scoringType === "qualitative" ? (s?.rating ?? null) : null,
        considerations: s?.considerations ?? null,
      };
    });

    try {
      await saveAssessment.mutateAsync({
        clientId,
        type: selectedType,
        completed_date: new Date().toISOString().slice(0, 10),
        factors,
      });
      toast.success(`${config.label} assessment saved`, {
        description: `${scoredCount} of ${totalCount} factors scored for ${clientName}.`,
      });
      handleClose();
    } catch {
      toast.error("Failed to save assessment", {
        description: "Please try again or check your connection.",
      });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          step === 1
            ? "max-w-2xl"
            : "max-w-4xl w-[95vw] h-[90vh] max-h-[90vh]"
        )}
      >
        {/* ── Step 1: Choose type ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <DialogTitle className="font-display text-lg">Start Assessment</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Choose which scorecard to complete for <span className="font-medium text-foreground">{clientName}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 grid grid-cols-2 gap-3">
              {TYPE_CARDS.map(({ key, icon: Icon, color, bg, border, selectedBg }) => {
                const cfg = ASSESSMENT_CONFIGS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectType(key)}
                    className={cn(
                      "text-left p-4 rounded-lg border-2 transition-all group",
                      "hover:shadow-md hover:-translate-y-0.5",
                      border,
                      selectedBg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0", bg)}>
                        <Icon className={cn("w-4 h-4", color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-semibold text-foreground leading-tight">
                          {cfg.label}
                        </p>
                        <p className={cn("text-xs font-medium mt-0.5", color)}>
                          {cfg.factorCount} factors
                          {cfg.scoringType === "numeric" && ` · Max ${cfg.maxScore} pts`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {cfg.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 2: Score factors ───────────────────────────────────────── */}
        {step === 2 && config && (
          <>
            {/* Fixed header */}
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle className="font-display text-base leading-tight">
                    {config.label}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {clientName} · {config.factorCount} factors
                    {config.scoringType === "numeric" && ` · Score each factor 1–6`}
                    {config.scoringType === "qualitative" && ` · Rate each factor`}
                  </DialogDescription>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {scoredCount} of {totalCount} factors scored
                  </span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {progressPct}%
                  </span>
                </div>
                <Progress value={progressPct} className="h-1.5" />
              </div>
            </DialogHeader>

            {/* Scrollable factor list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
              {Array.from(groupedFactors.entries()).map(([category, factors], i) => (
                <CategorySection
                  key={category}
                  category={category}
                  factors={factors}
                  scores={scores}
                  scoringType={config.scoringType}
                  onScore={handleScore}
                  onRating={handleRating}
                  onConsiderations={handleConsiderations}
                  openConsiderations={openConsiderations}
                  onToggleConsiderations={handleToggleConsiderations}
                  defaultOpen={i === 0}
                />
              ))}
              {/* Bottom spacing */}
              <div className="h-2" />
            </div>

            {/* Fixed footer */}
            <div className="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-between bg-background">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {scoredCount < totalCount && (
                  <span className="text-xs text-muted-foreground">
                    {totalCount - scoredCount} factor{totalCount - scoredCount !== 1 ? "s" : ""} unscored — will save as blank
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saveAssessment.isPending}
                  size="sm"
                >
                  {saveAssessment.isPending ? "Saving…" : "Save Assessment"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentForm;
