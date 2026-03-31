import type { QuarterPlan, InstrumentRef, GrowEngagement, ProtectionItem } from "./types/journey";
import {
  meridianQuarterPlans,
  meridianInstruments,
  meridianGrowEngagements,
  meridianProtection,
} from "./journeyMockData";

// ---------------------------------------------------------------------------
// Assessment scores per client
// ---------------------------------------------------------------------------

export const clientAssessmentScores: Record<
  string,
  { ba: number; br: number; pr: number; vf: number }
> = {
  "1": { ba: 72, br: 68, pr: 80, vf: 65 }, // Meridian — computed from full assessment data
  "2": { ba: 45, br: 42, pr: 38, vf: 35 }, // Atlas — early stage, low scores
  "3": { ba: 88, br: 85, pr: 82, vf: 78 }, // Pinnacle — mature, high scores
  "4": { ba: 63, br: 58, pr: 55, vf: 50 }, // Vanguard — mid stage
};

// ---------------------------------------------------------------------------
// Quarter plans per client
// ---------------------------------------------------------------------------

export const clientQuarterPlans: Record<string, QuarterPlan[]> = {
  "1": meridianQuarterPlans,

  // Atlas Manufacturing — early stage, Q1 active, in Diagnose
  "2": [
    {
      quarter: "Q1",
      year: 2026,
      label: "Discover",
      status: "active",
      reviewDate: "Mar 31, 2026",
      phases: [
        { id: "atlas-q1-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "atlas-q1-diagnose", phase: "diagnose", label: "Diagnose", status: "in_progress", completedTasks: 2, totalTasks: 5 },
        { id: "atlas-q1-design", phase: "design_tfo", label: "Design TFO", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "atlas-q1-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q2",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "upcoming",
      reviewDate: "Jun 30, 2026",
      phases: [
        { id: "atlas-q2-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "atlas-q2-protect", phase: "protect", label: "Protect", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "atlas-q2-grow", phase: "grow", label: "Grow", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "atlas-q2-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q3",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "upcoming",
      reviewDate: "Sep 30, 2026",
      phases: [
        { id: "atlas-q3-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "atlas-q3-protect", phase: "protect", label: "Protect", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "atlas-q3-grow", phase: "grow", label: "Grow", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "atlas-q3-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q4",
      year: 2026,
      label: "Realign & Optionality",
      status: "upcoming",
      reviewDate: "Dec 31, 2026",
      phases: [
        { id: "atlas-q4-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "atlas-q4-optionality", phase: "optionality", label: "Optionality", status: "not_started", completedTasks: 0, totalTasks: 3 },
        { id: "atlas-q4-align-annual", phase: "align_annual", label: "Annual Align", status: "not_started", completedTasks: 0, totalTasks: 4 },
      ],
    },
  ],

  // Pinnacle Services Group — mature, Q3 active, repeating cycle
  "3": [
    {
      quarter: "Q1",
      year: 2026,
      label: "Discover",
      status: "complete",
      reviewDate: "Jan 15, 2026",
      phases: [
        { id: "pinnacle-q1-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "pinnacle-q1-diagnose", phase: "diagnose", label: "Diagnose", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "pinnacle-q1-design", phase: "design_tfo", label: "Design TFO", status: "complete", completedTasks: 4, totalTasks: 4 },
        { id: "pinnacle-q1-align", phase: "align_quarterly", label: "Align", status: "complete", completedTasks: 3, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q2",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "complete",
      reviewDate: "Mar 31, 2026",
      phases: [
        { id: "pinnacle-q2-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "pinnacle-q2-protect", phase: "protect", label: "Protect", status: "complete", completedTasks: 4, totalTasks: 4 },
        { id: "pinnacle-q2-grow", phase: "grow", label: "Grow", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "pinnacle-q2-align", phase: "align_quarterly", label: "Align", status: "complete", completedTasks: 3, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q3",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "active",
      reviewDate: "Jun 30, 2026",
      phases: [
        { id: "pinnacle-q3-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "pinnacle-q3-protect", phase: "protect", label: "Protect", status: "complete", completedTasks: 4, totalTasks: 4 },
        { id: "pinnacle-q3-grow", phase: "grow", label: "Grow", status: "in_progress", completedTasks: 4, totalTasks: 5 },
        { id: "pinnacle-q3-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q4",
      year: 2026,
      label: "Realign & Optionality",
      status: "upcoming",
      reviewDate: "Dec 31, 2026",
      phases: [
        { id: "pinnacle-q4-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "pinnacle-q4-optionality", phase: "optionality", label: "Optionality", status: "not_started", completedTasks: 0, totalTasks: 3 },
        { id: "pinnacle-q4-align-annual", phase: "align_annual", label: "Annual Align", status: "not_started", completedTasks: 0, totalTasks: 4 },
      ],
    },
  ],

  // Vanguard Tech Solutions — early, Q1 active, just started Discover
  "4": [
    {
      quarter: "Q1",
      year: 2026,
      label: "Discover",
      status: "active",
      reviewDate: "Mar 31, 2026",
      phases: [
        { id: "vanguard-q1-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
        { id: "vanguard-q1-diagnose", phase: "diagnose", label: "Diagnose", status: "in_progress", completedTasks: 1, totalTasks: 5 },
        { id: "vanguard-q1-design", phase: "design_tfo", label: "Design TFO", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "vanguard-q1-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q2",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "upcoming",
      reviewDate: "Jun 30, 2026",
      phases: [
        { id: "vanguard-q2-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "vanguard-q2-protect", phase: "protect", label: "Protect", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "vanguard-q2-grow", phase: "grow", label: "Grow", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "vanguard-q2-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q3",
      year: 2026,
      label: "Protect, Grow, Prove, Align",
      status: "upcoming",
      reviewDate: "Sep 30, 2026",
      phases: [
        { id: "vanguard-q3-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "vanguard-q3-protect", phase: "protect", label: "Protect", status: "not_started", completedTasks: 0, totalTasks: 4 },
        { id: "vanguard-q3-grow", phase: "grow", label: "Grow", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "vanguard-q3-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
      ],
    },
    {
      quarter: "Q4",
      year: 2026,
      label: "Realign & Optionality",
      status: "upcoming",
      reviewDate: "Dec 31, 2026",
      phases: [
        { id: "vanguard-q4-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
        { id: "vanguard-q4-optionality", phase: "optionality", label: "Optionality", status: "not_started", completedTasks: 0, totalTasks: 3 },
        { id: "vanguard-q4-align-annual", phase: "align_annual", label: "Annual Align", status: "not_started", completedTasks: 0, totalTasks: 4 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Instruments per client
// ---------------------------------------------------------------------------

export const clientInstruments: Record<string, InstrumentRef[]> = {
  "1": meridianInstruments,

  // Atlas — 3 instruments, FBI in progress
  "2": [
    {
      id: "atlas-inst-1",
      type: "founder_business_index",
      name: "Founder Business Index",
      status: "in_progress",
      linkedPhase: "diagnose",
    },
    {
      id: "atlas-inst-2",
      type: "founder_snapshot",
      name: "Founder Snapshot",
      status: "complete",
      completedDate: "Feb 28, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "atlas-inst-3",
      type: "founder_matrix",
      name: "Founder Matrix",
      status: "not_started",
      linkedPhase: "diagnose",
    },
    {
      id: "atlas-inst-4",
      type: "economic_certainty_framework",
      name: "Economic Certainty Framework",
      status: "not_started",
      linkedPhase: "diagnose",
    },
    {
      id: "atlas-inst-5",
      type: "capital_strategy_architecture",
      name: "Capital Strategy Architecture",
      status: "not_started",
      linkedPhase: "design_tfo",
    },
    {
      id: "atlas-inst-6",
      type: "protection_architecture",
      name: "Protection Architecture",
      status: "not_started",
      linkedPhase: "protect",
    },
    {
      id: "atlas-inst-7",
      type: "optionality_framework",
      name: "Founder's Optionality Framework",
      status: "not_started",
      linkedPhase: "align_quarterly",
    },
    {
      id: "atlas-inst-8",
      type: "wealth_gap_analysis",
      name: "Wealth Gap Analysis",
      status: "not_started",
      linkedPhase: "design_tfo",
    },
  ],

  // Pinnacle — 8 instruments, all complete
  "3": [
    {
      id: "pinnacle-inst-1",
      type: "founder_business_index",
      name: "Founder Business Index",
      status: "complete",
      completedDate: "Jan 5, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "pinnacle-inst-2",
      type: "founder_snapshot",
      name: "Founder Snapshot",
      status: "complete",
      completedDate: "Jan 7, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "pinnacle-inst-3",
      type: "founder_matrix",
      name: "Founder Matrix",
      status: "complete",
      completedDate: "Jan 9, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "pinnacle-inst-4",
      type: "economic_certainty_framework",
      name: "Economic Certainty Framework",
      status: "complete",
      completedDate: "Jan 11, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "pinnacle-inst-5",
      type: "capital_strategy_architecture",
      name: "Capital Strategy Architecture",
      status: "complete",
      completedDate: "Jan 14, 2026",
      linkedPhase: "design_tfo",
    },
    {
      id: "pinnacle-inst-6",
      type: "protection_architecture",
      name: "Protection Architecture",
      status: "complete",
      completedDate: "Feb 5, 2026",
      linkedPhase: "protect",
    },
    {
      id: "pinnacle-inst-7",
      type: "optionality_framework",
      name: "Founder's Optionality Framework",
      status: "complete",
      completedDate: "Feb 20, 2026",
      linkedPhase: "align_quarterly",
    },
    {
      id: "pinnacle-inst-8",
      type: "wealth_gap_analysis",
      name: "Wealth Gap Analysis",
      status: "complete",
      completedDate: "Jan 13, 2026",
      linkedPhase: "design_tfo",
    },
  ],

  // Vanguard — 2 instruments, just started
  "4": [
    {
      id: "vanguard-inst-1",
      type: "founder_business_index",
      name: "Founder Business Index",
      status: "in_progress",
      linkedPhase: "diagnose",
    },
    {
      id: "vanguard-inst-2",
      type: "founder_snapshot",
      name: "Founder Snapshot",
      status: "complete",
      completedDate: "Mar 10, 2026",
      linkedPhase: "diagnose",
    },
    {
      id: "vanguard-inst-3",
      type: "founder_matrix",
      name: "Founder Matrix",
      status: "not_started",
      linkedPhase: "diagnose",
    },
    {
      id: "vanguard-inst-4",
      type: "economic_certainty_framework",
      name: "Economic Certainty Framework",
      status: "not_started",
      linkedPhase: "diagnose",
    },
    {
      id: "vanguard-inst-5",
      type: "capital_strategy_architecture",
      name: "Capital Strategy Architecture",
      status: "not_started",
      linkedPhase: "design_tfo",
    },
    {
      id: "vanguard-inst-6",
      type: "protection_architecture",
      name: "Protection Architecture",
      status: "not_started",
      linkedPhase: "protect",
    },
    {
      id: "vanguard-inst-7",
      type: "optionality_framework",
      name: "Founder's Optionality Framework",
      status: "not_started",
      linkedPhase: "align_quarterly",
    },
    {
      id: "vanguard-inst-8",
      type: "wealth_gap_analysis",
      name: "Wealth Gap Analysis",
      status: "not_started",
      linkedPhase: "design_tfo",
    },
  ],
};

// ---------------------------------------------------------------------------
// Grow engagements per client
// ---------------------------------------------------------------------------

export const clientGrowEngagements: Record<string, GrowEngagement[]> = {
  "1": meridianGrowEngagements,

  // Atlas — nothing started yet
  "2": [
    { id: "atlas-ge-1", capitalType: "human_capital", label: "Human Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 3, completedTasks: 0 },
    { id: "atlas-ge-2", capitalType: "customer_capital", label: "Customer Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 2, completedTasks: 0 },
    { id: "atlas-ge-3", capitalType: "structural_capital", label: "Structural Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 4, completedTasks: 0 },
    { id: "atlas-ge-4", capitalType: "social_capital", label: "Social Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 1, completedTasks: 0 },
    { id: "atlas-ge-5", capitalType: "personal_path", label: "Personal Path", status: "not_started", adoptedFromTemplate: false, taskCount: 2, completedTasks: 0 },
  ],

  // Pinnacle — all complete or near-complete
  "3": [
    { id: "pinnacle-ge-1", capitalType: "human_capital", label: "Human Capital", partner: "Pinnacle HR Group", status: "complete", adoptedFromTemplate: true, taskCount: 5, completedTasks: 5 },
    { id: "pinnacle-ge-2", capitalType: "customer_capital", label: "Customer Capital", partner: "Growth Advisory LLC", status: "complete", adoptedFromTemplate: true, taskCount: 5, completedTasks: 5 },
    { id: "pinnacle-ge-3", capitalType: "structural_capital", label: "Structural Capital", partner: "TechSolve Partners", status: "in_progress", adoptedFromTemplate: true, taskCount: 5, completedTasks: 4 },
    { id: "pinnacle-ge-4", capitalType: "social_capital", label: "Social Capital", status: "in_progress", adoptedFromTemplate: true, taskCount: 4, completedTasks: 3 },
    { id: "pinnacle-ge-5", capitalType: "personal_path", label: "Personal Path", partner: "Wealth Transitions Inc", status: "in_progress", adoptedFromTemplate: true, taskCount: 5, completedTasks: 3 },
  ],

  // Vanguard — one started
  "4": [
    { id: "vanguard-ge-1", capitalType: "human_capital", label: "Human Capital", status: "in_progress", adoptedFromTemplate: true, taskCount: 3, completedTasks: 1 },
    { id: "vanguard-ge-2", capitalType: "customer_capital", label: "Customer Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 2, completedTasks: 0 },
    { id: "vanguard-ge-3", capitalType: "structural_capital", label: "Structural Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 4, completedTasks: 0 },
    { id: "vanguard-ge-4", capitalType: "social_capital", label: "Social Capital", status: "not_started", adoptedFromTemplate: false, taskCount: 1, completedTasks: 0 },
    { id: "vanguard-ge-5", capitalType: "personal_path", label: "Personal Path", status: "not_started", adoptedFromTemplate: false, taskCount: 2, completedTasks: 0 },
  ],
};

// ---------------------------------------------------------------------------
// Protection items per client
// ---------------------------------------------------------------------------

export const clientProtection: Record<string, ProtectionItem[]> = {
  "1": meridianProtection,

  // Atlas — little to no protection in place
  "2": [
    { id: "atlas-prot-1", category: "asset_matrix", label: "Asset Protection Matrix", status: "not_documented", risk: "high", recommendation: "No asset protection matrix on file. Immediate engagement with legal counsel required." },
    { id: "atlas-prot-2", category: "insurance", label: "Key Person Insurance", status: "not_documented", risk: "high", recommendation: "Founder is the sole driver of revenue. Key person policy required before capital conversations." },
    { id: "atlas-prot-3", category: "insurance", label: "Buy-Sell Funding", status: "not_documented", risk: "high", recommendation: "Multi-owner entity with no funded buy-sell agreement. Prioritize in Q1 protect phase." },
    { id: "atlas-prot-4", category: "insurance", label: "Business Continuity", status: "not_documented", risk: "medium", recommendation: "Revenue concentration creates continuity risk. Evaluate insurance coverage options." },
    { id: "atlas-prot-5", category: "ip_protection", label: "Intellectual Property", status: "not_documented", risk: "medium", recommendation: "No formal IP documentation. Begin audit and registration process." },
  ],

  // Pinnacle — most protection in place
  "3": [
    { id: "pinnacle-prot-1", category: "asset_matrix", label: "Asset Protection Matrix", status: "in_place", risk: "low", recommendation: "Asset matrix is current and complete. Schedule annual review for Q4." },
    { id: "pinnacle-prot-2", category: "insurance", label: "Key Person Insurance", status: "in_place", risk: "low", recommendation: "Key person coverage in place at 4x EBITDA. Review coverage annually." },
    { id: "pinnacle-prot-3", category: "insurance", label: "Buy-Sell Funding", status: "in_place", risk: "low", recommendation: "Insurance-funded buy-sell agreement is current and reviewed annually." },
    { id: "pinnacle-prot-4", category: "insurance", label: "Business Continuity", status: "in_place", risk: "low", recommendation: "Full business continuity coverage in place. No action required this quarter." },
    { id: "pinnacle-prot-5", category: "ip_protection", label: "Intellectual Property", status: "partial", risk: "medium", recommendation: "Core IP registered. Evaluate trade secret documentation for Q3 completion." },
  ],

  // Vanguard — partial protection, some items in progress
  "4": [
    { id: "vanguard-prot-1", category: "asset_matrix", label: "Asset Protection Matrix", status: "partial", risk: "medium", recommendation: "Partial asset protection matrix on file. Complete remaining sections with legal counsel." },
    { id: "vanguard-prot-2", category: "insurance", label: "Key Person Insurance", status: "under_review", risk: "high", recommendation: "Key person insurance is under review. Expedite completion — founder dependency risk is elevated." },
    { id: "vanguard-prot-3", category: "insurance", label: "Buy-Sell Funding", status: "not_documented", risk: "high", recommendation: "No funded buy-sell agreement. Engage insurance specialist to draft agreement." },
    { id: "vanguard-prot-4", category: "insurance", label: "Business Continuity", status: "partial", risk: "medium", recommendation: "Partial coverage. Review current policy against revenue concentration scenario." },
    { id: "vanguard-prot-5", category: "ip_protection", label: "Intellectual Property", status: "partial", risk: "medium", recommendation: "Some IP documented. Formal registration recommended before capital raise." },
  ],
};

// ---------------------------------------------------------------------------
// Quarterly engagement data per client (for CommandBar)
// ---------------------------------------------------------------------------

export interface ClientQuarterlyEngagement {
  currentQuarter: 1 | 2 | 3 | 4;
  year: number;
  quarterStart: string;
  quarterEnd: string;
  daysToReview: number;
  progress: number;
  phases: Array<{ id: string; label: string; status: "complete" | "active" | "in_progress" | "upcoming" }>;
}

export const clientQuarterlyEngagement: Record<string, ClientQuarterlyEngagement> = {
  "1": {
    currentQuarter: 2,
    year: 2026,
    quarterStart: "Apr 1, 2026",
    quarterEnd: "Jun 30, 2026",
    daysToReview: 47,
    progress: 42,
    phases: [
      { id: "prove", label: "Prove", status: "complete" },
      { id: "protect", label: "Protect", status: "active" },
      { id: "grow", label: "Grow", status: "in_progress" },
      { id: "align", label: "Align", status: "upcoming" },
    ],
  },
  "2": {
    currentQuarter: 1,
    year: 2026,
    quarterStart: "Jan 1, 2026",
    quarterEnd: "Mar 31, 2026",
    daysToReview: 5,
    progress: 22,
    phases: [
      { id: "prove", label: "Prove", status: "complete" },
      { id: "diagnose", label: "Diagnose", status: "active" },
      { id: "design", label: "Design TFO", status: "upcoming" },
      { id: "align", label: "Align", status: "upcoming" },
    ],
  },
  "3": {
    currentQuarter: 3,
    year: 2026,
    quarterStart: "Jul 1, 2026",
    quarterEnd: "Sep 30, 2026",
    daysToReview: 92,
    progress: 78,
    phases: [
      { id: "prove", label: "Prove", status: "complete" },
      { id: "protect", label: "Protect", status: "complete" },
      { id: "grow", label: "Grow", status: "active" },
      { id: "align", label: "Align", status: "upcoming" },
    ],
  },
  "4": {
    currentQuarter: 1,
    year: 2026,
    quarterStart: "Jan 1, 2026",
    quarterEnd: "Mar 31, 2026",
    daysToReview: 5,
    progress: 14,
    phases: [
      { id: "prove", label: "Prove", status: "complete" },
      { id: "diagnose", label: "Diagnose", status: "active" },
      { id: "design", label: "Design TFO", status: "upcoming" },
      { id: "align", label: "Align", status: "upcoming" },
    ],
  },
};
