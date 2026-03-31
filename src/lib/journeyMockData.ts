import type {
  QuarterPlan,
  InstrumentRef,
  Prospect,
  GrowEngagement,
  ProtectionItem,
  DisplayPhaseStatus,
} from "./types/journey";

// ---------------------------------------------------------------------------
// Quarterly Plans — Meridian Industries
// ---------------------------------------------------------------------------

export const meridianQuarterPlans: QuarterPlan[] = [
  {
    quarter: "Q1",
    year: 2026,
    label: "Discover",
    status: "complete",
    reviewDate: "Jan 15, 2026",
    phases: [
      { id: "q1-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
      { id: "q1-diagnose", phase: "diagnose", label: "Diagnose", status: "complete", completedTasks: 5, totalTasks: 5 },
      { id: "q1-design", phase: "design_tfo", label: "Design TFO", status: "complete", completedTasks: 4, totalTasks: 4 },
      { id: "q1-align", phase: "align_quarterly", label: "Align", status: "complete", completedTasks: 3, totalTasks: 3 },
    ],
  },
  {
    quarter: "Q2",
    year: 2026,
    label: "Protect, Grow, Prove, Align",
    status: "active",
    reviewDate: "Jun 28, 2026",
    phases: [
      { id: "q2-prove", phase: "prove", label: "Prove", status: "complete", completedTasks: 5, totalTasks: 5 },
      { id: "q2-protect", phase: "protect", label: "Protect", status: "in_progress", completedTasks: 2, totalTasks: 4 },
      { id: "q2-grow", phase: "grow", label: "Grow", status: "in_progress", completedTasks: 1, totalTasks: 5 },
      { id: "q2-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
    ],
  },
  {
    quarter: "Q3",
    year: 2026,
    label: "Protect, Grow, Prove, Align",
    status: "upcoming",
    reviewDate: "Sep 30, 2026",
    phases: [
      { id: "q3-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
      { id: "q3-protect", phase: "protect", label: "Protect", status: "not_started", completedTasks: 0, totalTasks: 4 },
      { id: "q3-grow", phase: "grow", label: "Grow", status: "not_started", completedTasks: 0, totalTasks: 5 },
      { id: "q3-align", phase: "align_quarterly", label: "Align", status: "not_started", completedTasks: 0, totalTasks: 3 },
    ],
  },
  {
    quarter: "Q4",
    year: 2026,
    label: "Realign & Optionality",
    status: "upcoming",
    reviewDate: "Dec 31, 2026",
    phases: [
      { id: "q4-prove", phase: "prove", label: "Prove", status: "not_started", completedTasks: 0, totalTasks: 5 },
      { id: "q4-optionality", phase: "optionality", label: "Optionality", status: "not_started", completedTasks: 0, totalTasks: 3 },
      { id: "q4-align-annual", phase: "align_annual", label: "Annual Align", status: "not_started", completedTasks: 0, totalTasks: 4 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Instruments — Meridian Industries
// ---------------------------------------------------------------------------

export const meridianInstruments: InstrumentRef[] = [
  {
    id: "inst-1",
    type: "founder_business_index",
    name: "Founder Business Index",
    status: "complete",
    completedDate: "Jan 5, 2026",
    linkedPhase: "diagnose",
  },
  {
    id: "inst-2",
    type: "founder_snapshot",
    name: "Founder Snapshot",
    status: "complete",
    completedDate: "Jan 8, 2026",
    linkedPhase: "diagnose",
  },
  {
    id: "inst-3",
    type: "founder_matrix",
    name: "Founder Matrix",
    status: "complete",
    completedDate: "Jan 10, 2026",
    linkedPhase: "diagnose",
  },
  {
    id: "inst-4",
    type: "economic_certainty_framework",
    name: "Economic Certainty Framework",
    status: "complete",
    completedDate: "Jan 12, 2026",
    linkedPhase: "diagnose",
  },
  {
    id: "inst-5",
    type: "capital_strategy_architecture",
    name: "Capital Strategy Architecture",
    status: "complete",
    completedDate: "Jan 14, 2026",
    linkedPhase: "design_tfo",
  },
  {
    id: "inst-6",
    type: "protection_architecture",
    name: "Protection Architecture",
    status: "in_progress",
    linkedPhase: "protect",
  },
  {
    id: "inst-7",
    type: "optionality_framework",
    name: "Founder's Optionality Framework",
    status: "not_started",
    linkedPhase: "align_quarterly",
  },
  {
    id: "inst-8",
    type: "wealth_gap_analysis",
    name: "Wealth Gap Analysis",
    status: "complete",
    completedDate: "Jan 13, 2026",
    linkedPhase: "design_tfo",
  },
];

// ---------------------------------------------------------------------------
// Prospects — Pre-Client Pipeline
// ---------------------------------------------------------------------------

export const prospects: Prospect[] = [
  {
    id: "p1",
    name: "Summit Logistics",
    contact: "David Kwan",
    company: "Summit Logistics LLC",
    revenue: "$4.2M",
    source: "Referral",
    status: "intake",
    date: "Mar 20, 2026",
    fitDecision: null,
  },
  {
    id: "p2",
    name: "Apex Digital",
    contact: "Maria Santos",
    company: "Apex Digital Inc",
    revenue: "$6.8M",
    source: "Website",
    status: "discovery_scheduled",
    date: "Mar 15, 2026",
    fitDecision: null,
  },
  {
    id: "p3",
    name: "Forge Manufacturing",
    contact: "Tom Bradley",
    company: "Forge Mfg Co",
    revenue: "$15.3M",
    source: "Conference",
    status: "fit_assessment",
    date: "Mar 1, 2026",
    fitScore: 78,
    fitDecision: "fit",
  },
  {
    id: "p4",
    name: "Stellar Partners",
    contact: "Anna Lee",
    company: "Stellar Partners Group",
    revenue: "$3.1M",
    source: "Referral",
    status: "not_fit",
    date: "Feb 25, 2026",
    fitScore: 42,
    fitDecision: "no_fit",
    notes: "Revenue too low, recommended nurture program",
  },
  {
    id: "p5",
    name: "Horizon Health",
    contact: "James Park",
    company: "Horizon Health Systems",
    revenue: "$11.5M",
    source: "Referral",
    status: "onboarding",
    date: "Feb 10, 2026",
    fitScore: 85,
    fitDecision: "fit",
  },
];

// ---------------------------------------------------------------------------
// Grow Engagements — Meridian Industries
// ---------------------------------------------------------------------------

export const meridianGrowEngagements: GrowEngagement[] = [
  {
    id: "ge-1",
    capitalType: "human_capital",
    label: "Human Capital",
    partner: "Meridian HR Partners",
    status: "in_progress",
    adoptedFromTemplate: true,
    taskCount: 3,
    completedTasks: 1,
  },
  {
    id: "ge-2",
    capitalType: "customer_capital",
    label: "Customer Capital",
    status: "not_started",
    adoptedFromTemplate: false,
    taskCount: 2,
    completedTasks: 0,
  },
  {
    id: "ge-3",
    capitalType: "structural_capital",
    label: "Structural Capital",
    partner: "SysTech Consulting",
    status: "in_progress",
    adoptedFromTemplate: true,
    taskCount: 4,
    completedTasks: 1,
  },
  {
    id: "ge-4",
    capitalType: "social_capital",
    label: "Social Capital",
    status: "not_started",
    adoptedFromTemplate: false,
    taskCount: 1,
    completedTasks: 0,
  },
  {
    id: "ge-5",
    capitalType: "personal_path",
    label: "Personal Path",
    status: "not_started",
    adoptedFromTemplate: false,
    taskCount: 2,
    completedTasks: 0,
  },
];

// ---------------------------------------------------------------------------
// Protection Items — Meridian Industries
// ---------------------------------------------------------------------------

export const meridianProtection: ProtectionItem[] = [
  {
    id: "prot-1",
    category: "asset_matrix",
    label: "Asset Protection Matrix",
    status: "in_place",
    risk: "low",
    recommendation: "Annual review scheduled for Q3.",
  },
  {
    id: "prot-2",
    category: "insurance",
    label: "Key Person Insurance",
    status: "under_review",
    risk: "high",
    recommendation: "Recommend key person policy with coverage equal to 3-5x EBITDA.",
  },
  {
    id: "prot-3",
    category: "insurance",
    label: "Buy-Sell Funding",
    status: "not_documented",
    risk: "high",
    recommendation: "Cross-purchase or entity-purchase agreement should be insurance-funded.",
  },
  {
    id: "prot-4",
    category: "insurance",
    label: "Business Continuity",
    status: "partial",
    risk: "medium",
    recommendation: "Current coverage does not address key customer concentration scenario.",
  },
  {
    id: "prot-5",
    category: "ip_protection",
    label: "Intellectual Property",
    status: "partial",
    risk: "medium",
    recommendation: "Proprietary processes documented but not formally registered.",
  },
];

// ---------------------------------------------------------------------------
// Quarterly Engagement — for CommandBar / Copilot
// ---------------------------------------------------------------------------

export const quarterlyEngagement: {
  currentQuarter: 1 | 2 | 3 | 4;
  year: number;
  quarterStart: string;
  quarterEnd: string;
  daysToReview: number;
  progress: number;
  phases: Array<{ id: string; label: string; status: DisplayPhaseStatus }>;
} = {
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
};
