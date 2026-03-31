import { useMemo } from "react";
import { TrendingUp, Shield, User, LayoutGrid, CheckCircle2, AlertTriangle, Star, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { getCategoryLabel } from "@/lib/assessmentUtils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AssessmentOverviewCard from "@/components/assessments/AssessmentOverviewCard";
import AssessmentFactorTable, { DisplayFactor } from "@/components/assessments/AssessmentFactorTable";
import { CategorySegment } from "@/components/assessments/CategoryBreakdownBar";
import { BACategory, BRCategory, VFCategory } from "@/lib/types/assessments";
import { useAssessmentScores } from "@/hooks/useAssessmentScores";
import { useClientContext } from "@/hooks/useClientContext";
import { allClientAssessments } from "@/lib/assessmentMockData";

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
  const clientAssessments = allClientAssessments[selectedClientId] ?? allClientAssessments["1"];
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

    const needsImprovement =
      (businessAttractiveness?.factors.filter((f) => f.score <= 2).length ?? 0) +
      (businessReadiness?.factors.filter((f) => f.score <= 2).length ?? 0) +
      (personalReadiness?.factors.filter((f) => f.score <= 2).length ?? 0) +
      (valueFactors?.factors.filter((f) => f.rating === "improvement").length ?? 0);

    const topStrengths =
      (businessAttractiveness?.factors.filter((f) => f.score >= 5).length ?? 0) +
      (businessReadiness?.factors.filter((f) => f.score >= 5).length ?? 0) +
      (personalReadiness?.factors.filter((f) => f.score >= 5).length ?? 0) +
      (valueFactors?.factors.filter((f) => f.rating === "positive").length ?? 0);

    return { totalFactors, needsImprovement, topStrengths };
  }, [businessAttractiveness, businessReadiness, personalReadiness, valueFactors]);

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
      </div>

      {/* Overview Grid — responsive 2×2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: TrendingUp,
            title: "Business Attractiveness",
            scorePercentage: displayBa,
            completedDate: businessAttractiveness?.completedDate ?? null,
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
          },
          {
            icon: AlertTriangle,
            label: "Needs Improvement",
            value: String(summaryStats.needsImprovement),
            color: "text-destructive",
            iconBg: "bg-destructive/10",
            iconColor: "text-destructive",
          },
          {
            icon: Star,
            label: "Top Strengths",
            value: String(summaryStats.topStrengths),
            color: "text-primary",
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            icon: Calendar,
            label: "Last Assessment",
            value: lastAssessmentDate,
            color: "text-foreground",
            iconBg: "bg-muted",
            iconColor: "text-muted-foreground",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg p-4 shadow-card flex items-center gap-3"
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

        {/* Business Attractiveness */}
        <TabsContent value="business-attractiveness" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {businessAttractiveness?.factors.length ?? 0} factors · Max {(businessAttractiveness?.factors.length ?? 0) * 6} points · Score: {displayBa}%
              </span>
            </div>
            {businessAttractiveness && (
              <AssessmentFactorTable
                factors={toDisplayFactors(businessAttractiveness.factors)}
                mode="scored"
              />
            )}
          </div>
        </TabsContent>

        {/* Business Readiness */}
        <TabsContent value="business-readiness" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {businessReadiness?.factors.length ?? 0} factors · Max {(businessReadiness?.factors.length ?? 0) * 6} points · Score: {displayBr}%
              </span>
            </div>
            {businessReadiness && (
              <AssessmentFactorTable
                factors={toDisplayFactors(businessReadiness.factors)}
                mode="scored"
              />
            )}
          </div>
        </TabsContent>

        {/* Personal Readiness */}
        <TabsContent value="personal-readiness" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {personalReadiness?.factors.length ?? 0} factors · Max {(personalReadiness?.factors.length ?? 0) * 6} points · Score: {displayPr}%
              </span>
            </div>
            {personalReadiness && (
              <AssessmentFactorTable
                factors={toDisplayFactors(personalReadiness.factors)}
                mode="scored"
                flat
              />
            )}
          </div>
        </TabsContent>

        {/* Value Factors */}
        <TabsContent value="value-factors" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {vfSummary.positive} positive · {vfSummary.neutral} neutral · {vfSummary.improvement} for improvement
              </span>
            </div>
            {valueFactors && (
              <AssessmentFactorTable
                factors={toDisplayFactors(valueFactors.factors)}
                mode="qualitative"
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvisorAssessmentsPage;
