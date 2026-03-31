import { ScoredRating, QualitativeRating, ValueFactor } from "./types/assessments";

interface ScoredFactor {
  score: ScoredRating;
}

/**
 * Returns a percentage 0–100 representing how close the total score is to the
 * theoretical maximum (all factors rated 6).
 */
export function computeScoredPercentage(factors: ScoredFactor[]): number {
  if (factors.length === 0) return 0;
  const total = factors.reduce((sum, f) => sum + f.score, 0);
  const max = factors.length * 6;
  return Math.round((total / max) * 100);
}

export interface ValueFactorsSummary {
  positive: number;
  neutral: number;
  improvement: number;
  total: number;
  strengthPercentage: number;
}

/**
 * Returns counts for each qualitative rating bucket and a strength percentage
 * defined as (positive / total) * 100.
 */
export function computeValueFactorsSummary(
  factors: ValueFactor[]
): ValueFactorsSummary {
  const counts = { positive: 0, neutral: 0, improvement: 0 };
  for (const f of factors) {
    counts[f.rating]++;
  }
  const total = factors.length;
  const strengthPercentage =
    total > 0 ? Math.round((counts.positive / total) * 100) : 0;
  return { ...counts, total, strengthPercentage };
}

/**
 * Returns a Tailwind color class set appropriate to a 1–6 score tier.
 * 5–6  → olive green (primary)
 * 3–4  → gold (accent)
 * 1–2  → red (destructive)
 */
export function getRatingColor(score: ScoredRating): string {
  if (score >= 5) return "text-primary";
  if (score >= 3) return "text-accent-foreground";
  return "text-destructive";
}

export function getRatingBgColor(score: ScoredRating): string {
  if (score >= 5) return "bg-primary";
  if (score >= 3) return "bg-accent";
  return "bg-destructive";
}

export function getRatingContainerColor(score: ScoredRating): string {
  if (score >= 5) return "bg-primary/10 text-primary";
  if (score >= 3) return "bg-accent/15 text-accent-foreground";
  return "bg-destructive/10 text-destructive";
}

/**
 * Returns Tailwind classes for qualitative rating pills.
 */
export function getQualitativeColor(rating: QualitativeRating): {
  dot: string;
  container: string;
  text: string;
} {
  switch (rating) {
    case "positive":
      return {
        dot: "bg-primary",
        container: "bg-primary/10 border-primary/20 text-primary",
        text: "Positive",
      };
    case "neutral":
      return {
        dot: "bg-accent",
        container: "bg-accent/15 border-accent/30 text-accent-foreground",
        text: "Neutral",
      };
    case "improvement":
      return {
        dot: "bg-destructive",
        container: "bg-destructive/10 border-destructive/20 text-destructive",
        text: "For Improvement",
      };
  }
}

/**
 * Returns score-based color for progress/pulse indicators.
 * Thresholds: ≥75 = primary, ≥50 = accent, <50 = destructive.
 */
export function getScoreColor(percentage: number): string {
  if (percentage >= 75) return "bg-primary";
  if (percentage >= 50) return "bg-accent";
  return "bg-destructive";
}

export function getScoreTextColor(percentage: number): string {
  if (percentage >= 75) return "text-primary";
  if (percentage >= 50) return "text-accent-foreground";
  return "text-destructive";
}

/**
 * Human-readable labels for all category keys across all four assessments.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    // Business Attractiveness categories
    business: "Business Factors",
    forecast: "Financial Forecast",
    market: "Market Position",
    investor: "Investor Appeal",
    // Business Readiness categories
    brand_market: "Brand & Market",
    operations: "Operations",
    financial: "Financial",
    legal_compliance: "Legal & Compliance",
    personal_planning: "Personal Planning",
    strategy: "Strategy",
    // Value Factor categories
    personal: "Personal",
    business_operations: "Business Operations",
    industry_market: "Industry & Market",
    legal_regulatory: "Legal & Regulatory",
    economic_ma: "Economic & M&A",
  };
  return labels[category] ?? category;
}
