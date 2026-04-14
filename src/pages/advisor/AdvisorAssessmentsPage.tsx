import { useMemo, useState } from "react";
import { TrendingUp, Shield, User, LayoutGrid, CheckCircle2, AlertTriangle, Star, Calendar, ClipboardCheck, Plus, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { getCategoryLabel } from "@/lib/assessmentUtils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AssessmentOverviewCard from "@/components/assessments/AssessmentOverviewCard";
import AssessmentFactorTable, { DisplayFactor } from "@/components/assessments/AssessmentFactorTable";
import { CategorySegment } from "@/components/assessments/CategoryBreakdownBar";
import { BACategory, BRCategory, VFCategory } from "@/lib/types/assessments";
import { useAssessmentScores } from "@/hooks/useAssessmentScores";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientAssessments } from "@/hooks/useAssessmentsApi";
import { adaptAssessments } from "@/lib/assessmentAdapter";
import { Button } from "@/components/ui/button";
import AssessmentForm from "@/components/assessments/AssessmentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─── Display factor adapters ─────────────────────────────────────────────────

function toDisplayFactors(factors: Array<{ id: string; name: string; category?: string; score?: number; rating?: string; considerations: string }>): DisplayFactor[] {
  return factors.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    score: f.score as DisplayFactor["score"],
    rating: f.rating as DisplayFactor["rating"],
    considerations: f.considerations,
  }));
}

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35 },
  }),
};

// ─── Main page component ─────────────────────────────────────────────────────

const AdvisorAssessmentsPage = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawAssessments = [], isLoading } = useClientAssessments(selectedClientId);
  const [formOpen, setFormOpen] = useState(false);
  const [improvementOpen, setImprovementOpen] = useState(false);
  const [strengthsOpen, setStrengthsOpen] = useState(false);

  const clientAssessments = useMemo(
    () => adaptAssessments(rawAssessments, selectedClientId),
    [rawAssessments, selectedClientId]
  );

  const { assessments, baScore, brScore, prScore, vfSummary, lastAssessmentDate } = useAssessmentScores(clientAssessments);
  const { businessAttractiveness, businessReadiness, personalReadiness, valueFactors } = assessments;

  const displayBa = baScore;
  const displayBr = brScore;
  const displayPr = prScore;
  const displayVf = vfSummary.strengthPercentage;

  const baCategories = useMemo((): CategorySegment[] => {
    if (!businessAttractiveness) return [];
    const catMap = new Map<BACategory, { score: number; maxScore: number }>();
    for (const f of businessAttractiveness.factors) {
      const existing = catMap.get(f.category) ?? { score: 0, maxScore: 0 };
      catMap.set(f.category, {
        score: existing.score + f.score,
        maxScore: existing.maxScore + 6,
      });
    }
    return Array.from(catMap.entries()).map(([cat, data]) => ({
      name: getCategoryLabel(cat),
      score: data.score,
      maxScore: data.maxScore,
    }));
  }, [businessAttractiveness]);

  const brCategories = useMemo((): CategorySegment[] => {
    if (!businessReadiness) return [];
    const catMap = new Map<BRCategory, { score: number; maxScore: number }>();
    for (const f of businessReadiness.factors) {
      const existing = catMap.get(f.category) ?? { score: 0, maxScore: 0 };
      catMap.set(f.category, {
        score: existing.score + f.score,
        maxScore: existing.maxScore + 6,
      });
    }
    return Array.from(catMap.entries()).map(([cat, data]) => ({
      name: getCategoryLabel(cat),
      score: data.score,
      maxScore: data.maxScore,
    }));
  }, [businessReadiness]);

  const vfCategories = useMemo((): CategorySegment[] => {
    if (!valueFactors) return [];
    const catMap = new Map<VFCategory, { score: number; maxScore: number }>();
    for (const f of valueFactors.factors) {
      const existing = catMap.get(f.category) ?? { score: 0, maxScore: 0 };
      const val = f.rating === "positive" ? 1 : 0;
      catMap.set(f.category, {
        score: existing.score + val,
        maxScore: existing.maxScore + 1,
      });
    }
    return Array.from(catMap.entries()).map(([cat, data]) => ({
      name: getCategoryLabel(cat),
      score: data.score * 6,
      maxScore: data.maxScore * 6,
    }));
  }, [valueFactors]);

  const summaryStats = useMemo(() => {
    const totalFactors =
      (businessAttractiveness?.factors.length ?? 0) +
      (businessReadiness?.factors.length ?? 0) +
      (personalReadiness?.factors.length ?? 0) +
      (valueFactors?.factors.length ?? 0);

    // Needs Improvement: scored factors ≤ 2, or value factors rated "improvement"
    const improvementScored = toDisplayFactors([
      ...(businessAttractiveness?.factors.filter((f) => f.score <= 2) ?? []),
      ...(businessReadiness?.factors.filter((f) => f.score <= 2) ?? []),
      ...(personalReadiness?.factors.filter((f) => f.score <= 2) ?? []),
    ]);
    const improvementQualitative = toDisplayFactors(
      valueFactors?.factors.filter((f) => f.rating === "improvement") ?? []
    );
    const needsImprovement = improvementScored.length + improvementQualitative.length;

    // Top Strengths: scored factors ≥ 5 (sorted desc) + value factors rated "positive", capped at 5
    const scoredStrengthsRaw = [
      ...(businessAttractiveness?.factors.filter((f) => f.score >= 5) ?? []),
      ...(businessReadiness?.factors.filter((f) => f.score >= 5) ?? []),
      ...(personalReadiness?.factors.filter((f) => f.score >= 5) ?? []),
    ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const qualitativeStrengthsRaw =
      valueFactors?.factors.filter((f) => f.rating === "positive") ?? [];
    const topStrengths = scoredStrengthsRaw.length + qualitativeStrengthsRaw.length;

    // Cap display to 5 total: scored first, then qualitative to fill remaining slots
    const cappedScored = toDisplayFactors(scoredStrengthsRaw.slice(0, 5));
    const cappedQualitative = toDisplayFactors(
      qualitativeStrengthsRaw.slice(0, Math.max(0, 5 - scoredStrengthsRaw.length))
    );

    return {
      totalFactors,
      needsImprovement,
      topStrengths,
      improvementScored,
      improvementQualitative,
      cappedScored,
      cappedQualitative,
    };
  }, [businessAttractiveness, businessReadiness, personalReadiness, valueFactors]);

  const hasNoAssessments =
    !businessAttractiveness &&
    !businessReadiness &&
    !personalReadiness &&
    !valueFactors;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Assessments — {selectedClient.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Exit readiness scorecards and value factor analysis
          </p>
        </div>
        {selectedClientId && !hasNoAssessments && (
          <Button size="sm" onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Assessment
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading assessments...
        </div>
      ) : !selectedClientId ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No client selected</h3>
          <p className="text-sm text-muted-foreground">Select a client to view their assessments.</p>
        </div>
      ) : hasNoAssessments ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No assessments yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start an assessment for {selectedClient.name} to build their exit readiness profile.
          </p>
          <Button onClick={() => setFormOpen(true)}>Start Assessment</Button>
        </div>
      ) : (
        <>
          {/* Overview Grid — responsive 2×2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: TrendingUp,
                title: "Business Attractiveness",
                scorePercentage: displayBa,
                completedDate: businessAttractiveness?.completedDate ?? null,
                hasData: !!businessAttractiveness,
                factorCount: businessAttractiveness?.factors.length ?? 0,
                lastModified: businessAttractiveness?.lastModified ?? "—",
                categories: baCategories,
                maxLabel: `${businessAttractiveness?.factors.reduce((s, f) => s + f.score, 0) ?? 0} / ${(businessAttractiveness?.factors.length ?? 0) * 6} points`,
              },
              {
                icon: Shield,
                title: "Business Readiness",
                scorePercentage: displayBr,
                completedDate: businessReadiness?.completedDate ?? null,
                hasData: !!businessReadiness,
                factorCount: businessReadiness?.factors.length ?? 0,
                lastModified: businessReadiness?.lastModified ?? "—",
                categories: brCategories,
                maxLabel: `${businessReadiness?.factors.reduce((s, f) => s + f.score, 0) ?? 0} / ${(businessReadiness?.factors.length ?? 0) * 6} points`,
              },
              {
                icon: User,
                title: "Personal Readiness",
                scorePercentage: displayPr,
                completedDate: personalReadiness?.completedDate ?? null,
                hasData: !!personalReadiness,
                factorCount: personalReadiness?.factors.length ?? 0,
                lastModified: personalReadiness?.lastModified ?? "—",
                categories: [],
                maxLabel: `${personalReadiness?.factors.reduce((s, f) => s + f.score, 0) ?? 0} / ${(personalReadiness?.factors.length ?? 0) * 6} points`,
              },
              {
                icon: LayoutGrid,
                title: "54 Value Factors",
                scorePercentage: displayVf,
                completedDate: valueFactors?.completedDate ?? null,
                hasData: !!valueFactors,
                factorCount: valueFactors?.factors.length ?? 0,
                lastModified: valueFactors?.lastModified ?? "—",
                categories: vfCategories,
                maxLabel: `${vfSummary.positive} of ${vfSummary.total} positive factors`,
              },
            ].map((card, i) => (
              <motion.div key={card.title} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
                <AssessmentOverviewCard {...card} />
              </motion.div>
            ))}
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                icon: CheckCircle2,
                label: "Total Factors Assessed",
                value: String(summaryStats.totalFactors),
                color: "text-foreground",
                iconBg: "bg-muted",
                iconColor: "text-muted-foreground",
                onClick: undefined as (() => void) | undefined,
              },
              {
                icon: AlertTriangle,
                label: "Needs Improvement",
                value: String(summaryStats.needsImprovement),
                color: "text-destructive",
                iconBg: "bg-destructive/10",
                iconColor: "text-destructive",
                onClick: () => setImprovementOpen(true),
              },
              {
                icon: Star,
                label: "Top Strengths",
                value: String(summaryStats.topStrengths),
                color: "text-primary",
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
                onClick: () => setStrengthsOpen(true),
              },
              {
                icon: Calendar,
                label: "Last Assessment",
                value: lastAssessmentDate,
                color: "text-foreground",
                iconBg: "bg-muted",
                iconColor: "text-muted-foreground",
                onClick: undefined as (() => void) | undefined,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`bg-card border border-border rounded-lg p-4 shadow-card flex items-center gap-3 ${stat.onClick ? "cursor-pointer hover:shadow-md hover:border-border/60 transition-all" : ""}`}
                onClick={stat.onClick}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <p className={`text-sm font-display font-semibold truncate ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Tabs */}
          <Tabs defaultValue="business-attractiveness">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1">
              <TabsTrigger value="business-attractiveness" className="text-xs py-2">
                Business Attractiveness
              </TabsTrigger>
              <TabsTrigger value="business-readiness" className="text-xs py-2">
                Business Readiness
              </TabsTrigger>
              <TabsTrigger value="personal-readiness" className="text-xs py-2">
                Personal Readiness
              </TabsTrigger>
              <TabsTrigger value="value-factors" className="text-xs py-2">
                54 Value Factors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="business-attractiveness" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {businessAttractiveness?.factors.length ?? 0} factors · Max {(businessAttractiveness?.factors.length ?? 0) * 6} points · Score: {displayBa}%
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    {businessAttractiveness ? "Re-score" : "Score Now"}
                  </Button>
                </div>
                {businessAttractiveness ? (
                  <AssessmentFactorTable factors={toDisplayFactors(businessAttractiveness.factors)} mode="scored" />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No Business Attractiveness assessment on file.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="business-readiness" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {businessReadiness?.factors.length ?? 0} factors · Max {(businessReadiness?.factors.length ?? 0) * 6} points · Score: {displayBr}%
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    {businessReadiness ? "Re-score" : "Score Now"}
                  </Button>
                </div>
                {businessReadiness ? (
                  <AssessmentFactorTable factors={toDisplayFactors(businessReadiness.factors)} mode="scored" />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No Business Readiness assessment on file.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="personal-readiness" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {personalReadiness?.factors.length ?? 0} factors · Max {(personalReadiness?.factors.length ?? 0) * 6} points · Score: {displayPr}%
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    {personalReadiness ? "Re-score" : "Score Now"}
                  </Button>
                </div>
                {personalReadiness ? (
                  <AssessmentFactorTable factors={toDisplayFactors(personalReadiness.factors)} mode="scored" flat />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No Personal Readiness assessment on file.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="value-factors" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {vfSummary.positive} positive · {vfSummary.neutral} neutral · {vfSummary.improvement} for improvement
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    {valueFactors ? "Re-score" : "Score Now"}
                  </Button>
                </div>
                {valueFactors ? (
                  <AssessmentFactorTable factors={toDisplayFactors(valueFactors.factors)} mode="qualitative" />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No Value Factors assessment on file.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Assessment creation form dialog */}
      {selectedClientId && (
        <AssessmentForm
          open={formOpen}
          onOpenChange={setFormOpen}
          clientId={selectedClientId}
          clientName={selectedClient.name}
        />
      )}

      {/* Needs Improvement detail dialog */}
      <Dialog open={improvementOpen} onOpenChange={setImprovementOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Needs Improvement
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                {summaryStats.needsImprovement} factor{summaryStats.needsImprovement !== 1 ? "s" : ""}
              </span>
            </DialogTitle>
            <DialogDescription>
              Factors scoring 2 or below, or rated For Improvement across all assessments.
            </DialogDescription>
          </DialogHeader>
          {summaryStats.needsImprovement === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No factors currently need improvement.</p>
          ) : (
            <div className="space-y-4 mt-2">
              {summaryStats.improvementScored.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scored Assessments</p>
                  <AssessmentFactorTable factors={summaryStats.improvementScored} mode="scored" flat />
                </div>
              )}
              {summaryStats.improvementQualitative.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Value Factors</p>
                  <AssessmentFactorTable factors={summaryStats.improvementQualitative} mode="qualitative" flat />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Top Strengths detail dialog */}
      <Dialog open={strengthsOpen} onOpenChange={setStrengthsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Top Strengths
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                {summaryStats.cappedScored.length + summaryStats.cappedQualitative.length} of {summaryStats.topStrengths} shown
              </span>
            </DialogTitle>
            <DialogDescription>
              Your highest-scoring factors across all assessments.
            </DialogDescription>
          </DialogHeader>
          {summaryStats.topStrengths === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No top-strength factors recorded yet.</p>
          ) : (
            <div className="space-y-4 mt-2">
              {summaryStats.cappedScored.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scored Assessments</p>
                  <AssessmentFactorTable factors={summaryStats.cappedScored} mode="scored" flat />
                </div>
              )}
              {summaryStats.cappedQualitative.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Value Factors</p>
                  <AssessmentFactorTable factors={summaryStats.cappedQualitative} mode="qualitative" flat />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvisorAssessmentsPage;
