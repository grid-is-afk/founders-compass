/**
 * Maps the flat DB assessment array (from GET /assessments?client_id=...)
 * into the strongly-typed ClientAssessments structure the UI expects.
 *
 * DB shape per assessment:
 *   { id, client_id, type, completed_date, created_at, factors: [...] }
 *
 * Factor shape:
 *   { id, assessment_id, factor_name, category, score, rating, considerations, sort_order }
 */

import type {
  ClientAssessments,
  BAFactor,
  BRFactor,
  PRFactor,
  ValueFactor,
  BACategory,
  BRCategory,
  VFCategory,
  ScoredRating,
  QualitativeRating,
} from "./types/assessments";

interface DbFactor {
  id: string;
  assessment_id: string;
  factor_name: string;
  category: string | null;
  score: number | null;
  rating: string | null;
  considerations: string | null;
  sort_order: number;
}

interface DbAssessment {
  id: string;
  client_id: string;
  type: string;
  completed_date: string | null;
  created_at: string;
  factors: DbFactor[];
}

export function adaptAssessments(dbRows: DbAssessment[], clientId: string): ClientAssessments {
  const find = (type: string) => dbRows.find((a) => a.type === type);

  const ba = find("business_attractiveness");
  const br = find("business_readiness");
  const pr = find("personal_readiness");
  const vf = find("value_factors");

  return {
    clientId,
    businessAttractiveness: ba
      ? {
          id: ba.id,
          clientId: ba.client_id,
          completedDate: ba.completed_date,
          lastModified: ba.created_at,
          factors: ba.factors.map(
            (f): BAFactor => ({
              id: f.id,
              name: f.factor_name,
              category: (f.category ?? "business") as BACategory,
              score: Math.max(1, Math.min(6, f.score ?? 1)) as ScoredRating,
              considerations: f.considerations ?? "",
            })
          ),
        }
      : null,
    businessReadiness: br
      ? {
          id: br.id,
          clientId: br.client_id,
          completedDate: br.completed_date,
          lastModified: br.created_at,
          factors: br.factors.map(
            (f): BRFactor => ({
              id: f.id,
              name: f.factor_name,
              category: (f.category ?? "operations") as BRCategory,
              score: Math.max(1, Math.min(6, f.score ?? 1)) as ScoredRating,
              considerations: f.considerations ?? "",
            })
          ),
        }
      : null,
    personalReadiness: pr
      ? {
          id: pr.id,
          clientId: pr.client_id,
          completedDate: pr.completed_date,
          lastModified: pr.created_at,
          factors: pr.factors.map(
            (f): PRFactor => ({
              id: f.id,
              name: f.factor_name,
              score: Math.max(1, Math.min(6, f.score ?? 1)) as ScoredRating,
              considerations: f.considerations ?? "",
            })
          ),
        }
      : null,
    valueFactors: vf
      ? {
          id: vf.id,
          clientId: vf.client_id,
          completedDate: vf.completed_date,
          lastModified: vf.created_at,
          factors: vf.factors.map(
            (f): ValueFactor => ({
              id: f.id,
              name: f.factor_name,
              category: (f.category ?? "financial") as VFCategory,
              rating: (f.rating ?? "neutral") as QualitativeRating,
              considerations: f.considerations ?? "",
            })
          ),
        }
      : null,
  };
}
