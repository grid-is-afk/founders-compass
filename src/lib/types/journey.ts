export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type JourneyPhase =
  | "prove"
  | "protect"
  | "grow"
  | "align"
  | "diagnose"
  | "design_tfo"
  | "client_fit"
  | "project_kickoff"
  | "align_quarterly"
  | "align_annual"
  | "optionality"
  | "project_reset";

export type PhaseStatus = "not_started" | "in_progress" | "complete" | "blocked";

export type DisplayPhaseStatus = "complete" | "active" | "in_progress" | "upcoming";

export type ProspectStatus =
  | "intake"
  | "discovery_scheduled"
  | "discovery_complete"
  | "fit_assessment"
  | "not_fit"
  | "fit"
  | "onboarding"
  // Off-pipeline statuses
  | "nurture_call"
  | "kept_in_loop"
  | "flagged_follow_up";

export type GrowCapitalType =
  | "human_capital"
  | "customer_capital"
  | "structural_capital"
  | "social_capital"
  | "personal_path";

export type InstrumentType =
  | "founder_business_index"
  | "founder_snapshot"
  | "founder_matrix"
  | "economic_certainty_framework"
  | "capital_strategy_architecture"
  | "optionality_framework"
  | "wealth_gap_analysis"
  | "protection_architecture";

export interface QuarterPhase {
  id: string;
  phase: JourneyPhase;
  label: string;
  status: PhaseStatus;
  completedTasks: number;
  totalTasks: number;
  instruments?: InstrumentRef[];
}

export interface QuarterPlan {
  quarter: Quarter;
  year: number;
  label: string;
  status: "upcoming" | "active" | "complete";
  phases: QuarterPhase[];
  reviewDate?: string;
}

export interface InstrumentRef {
  id: string;
  type: InstrumentType;
  name: string;
  status: "not_started" | "in_progress" | "complete";
  completedDate?: string;
  linkedPhase: JourneyPhase;
}

export interface Prospect {
  id: string;
  name: string;
  contact: string;
  company: string;
  revenue: string;
  source: string;
  status: ProspectStatus;
  date: string;
  fitScore?: number;
  fitDecision?: "fit" | "no_fit" | null;
  notes?: string;
}

export interface GrowEngagement {
  id: string;
  capitalType: GrowCapitalType;
  label: string;
  partner?: string;
  status: "not_started" | "in_progress" | "complete";
  adoptedFromTemplate: boolean;
  taskCount: number;
  completedTasks: number;
}

export interface ProtectionItem {
  id: string;
  category: "asset_matrix" | "insurance" | "ip_protection";
  label: string;
  status: "not_documented" | "partial" | "in_place" | "under_review";
  risk: "high" | "medium" | "low";
  recommendation: string;
}
