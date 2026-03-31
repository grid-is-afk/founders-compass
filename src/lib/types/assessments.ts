export type ScoredRating = 1 | 2 | 3 | 4 | 5 | 6;
export type QualitativeRating = "positive" | "neutral" | "improvement";

// Assessment 1: Business Attractiveness (25 factors, max 150)
export type BACategory = "business" | "forecast" | "market" | "investor";

export interface BAFactor {
  id: string;
  name: string;
  category: BACategory;
  score: ScoredRating;
  considerations: string;
}

export interface BusinessAttractivenessAssessment {
  id: string;
  clientId: string;
  completedDate: string | null;
  lastModified: string;
  factors: BAFactor[];
}

// Assessment 2: Business Readiness (22 factors, max 132)
export type BRCategory =
  | "brand_market"
  | "operations"
  | "financial"
  | "legal_compliance"
  | "personal_planning"
  | "strategy";

export interface BRFactor {
  id: string;
  name: string;
  category: BRCategory;
  score: ScoredRating;
  considerations: string;
}

export interface BusinessReadinessAssessment {
  id: string;
  clientId: string;
  completedDate: string | null;
  lastModified: string;
  factors: BRFactor[];
}

// Assessment 3: Personal Readiness (11 factors, max 66)
export interface PRFactor {
  id: string;
  name: string;
  score: ScoredRating;
  considerations: string;
}

export interface PersonalReadinessAssessment {
  id: string;
  clientId: string;
  completedDate: string | null;
  lastModified: string;
  factors: PRFactor[];
}

// Assessment 4: 54 Value Factors
export type VFCategory =
  | "personal"
  | "business_operations"
  | "industry_market"
  | "legal_regulatory"
  | "financial"
  | "economic_ma";

export interface ValueFactor {
  id: string;
  name: string;
  category: VFCategory;
  rating: QualitativeRating;
  considerations: string;
}

export interface ValueFactorsAssessment {
  id: string;
  clientId: string;
  completedDate: string | null;
  lastModified: string;
  factors: ValueFactor[];
}

export interface ClientAssessments {
  clientId: string;
  businessAttractiveness: BusinessAttractivenessAssessment | null;
  businessReadiness: BusinessReadinessAssessment | null;
  personalReadiness: PersonalReadinessAssessment | null;
  valueFactors: ValueFactorsAssessment | null;
}
