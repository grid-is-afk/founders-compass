export const clients = [
  {
    id: "1",
    name: "Meridian Industries",
    contact: "Sarah Chen",
    stage: "Q2 — Protect",
    capitalReadiness: 72,
    customerCapital: 68,
    performanceScore: 80,
    revenue: "$12.4M",
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "Atlas Manufacturing",
    contact: "Robert Hayes",
    stage: "Q1 — Discover",
    capitalReadiness: 45,
    customerCapital: 52,
    performanceScore: 58,
    revenue: "$8.2M",
    lastActivity: "1 day ago",
  },
  {
    id: "3",
    name: "Pinnacle Services Group",
    contact: "Lisa Park",
    stage: "Q3 — Grow",
    capitalReadiness: 88,
    customerCapital: 91,
    performanceScore: 85,
    revenue: "$22.1M",
    lastActivity: "4 hours ago",
  },
  {
    id: "4",
    name: "Vanguard Tech Solutions",
    contact: "Michael Torres",
    stage: "Q1 — Diagnose",
    capitalReadiness: 63,
    customerCapital: 70,
    performanceScore: 74,
    revenue: "$5.7M",
    lastActivity: "3 days ago",
  },
];

export const sixKeysScores = [
  { label: "Clarity", score: 78, description: "Strategic vision and capital narrative definition" },
  { label: "Alignment", score: 65, description: "Mutual verification of intent, data, and outcomes" },
  { label: "Structure", score: 82, description: "Capital stack simplicity and enforceability" },
  { label: "Stewardship", score: 71, description: "Governance integrity and daily discipline" },
  { label: "Velocity", score: 59, description: "Pace matched to data and governance capacity" },
  { label: "Legacy", score: 74, description: "Organization endurance beyond the founder" },
];

export const workflowStages = [
  { id: "trigger", label: "Triggering Event", status: "complete" as const, clients: 2 },
  { id: "clarity", label: "Clarity", status: "complete" as const, clients: 3 },
  { id: "structure", label: "Structure", status: "active" as const, clients: 4 },
  { id: "align", label: "Align", status: "upcoming" as const, clients: 1 },
  { id: "deploy", label: "Deploy", status: "upcoming" as const, clients: 2 },
];

export const sprintTasks = [
  {
    id: "1", title: "Complete financial statement analysis", status: "done" as const,
    assignee: "Advisor", dueDate: "Mar 5", priority: "high" as const,
    subtasks: [
      { id: "1a", title: "Normalize 3-year P&L", done: true },
      { id: "1b", title: "Calculate adjusted EBITDA", done: true },
    ],
    linkedDocs: [{ name: "3-Year P&L.xlsx", type: "spreadsheet" as const }],
  },
  {
    id: "2", title: "Customer concentration assessment", status: "in_progress" as const,
    assignee: "Client", dueDate: "Mar 12", priority: "high" as const,
    subtasks: [
      { id: "2a", title: "Export top-20 customer list", done: true },
      { id: "2b", title: "Map revenue by customer segment", done: false },
    ],
    linkedDocs: [
      { name: "Customer Revenue Breakdown.pdf", type: "pdf" as const },
      { name: "Concentration Risk Template.xlsx", type: "spreadsheet" as const },
    ],
  },
  {
    id: "3", title: "Entity structure review", status: "in_progress" as const,
    assignee: "Advisor", dueDate: "Mar 15", priority: "medium" as const,
    subtasks: [
      { id: "3a", title: "Map current entity org chart", done: true },
      { id: "3b", title: "Identify restructuring opportunities", done: false },
      { id: "3c", title: "Draft restructuring memo", done: false },
    ],
    linkedDocs: [{ name: "Entity Org Chart.pdf", type: "pdf" as const }],
  },
  {
    id: "4", title: "Upload 3 years of tax returns", status: "todo" as const,
    assignee: "Client", dueDate: "Mar 18", priority: "medium" as const,
    subtasks: [],
    linkedDocs: [],
  },
  {
    id: "5", title: "Board-style monthly update draft", status: "todo" as const,
    assignee: "Advisor", dueDate: "Mar 20", priority: "low" as const,
    subtasks: [
      { id: "5a", title: "Outline KPI dashboard section", done: false },
      { id: "5b", title: "Draft narrative summary", done: false },
    ],
    linkedDocs: [{ name: "Board Update Template.docx", type: "document" as const }],
  },
];

export const dataRoomDocuments = [
  { id: "dr1", name: "Capital Readiness Memo", category: "Reports", date: "Mar 5, 2026", size: "2.4 MB", type: "pdf" as const },
  { id: "dr2", name: "Institutional Performance Brief", category: "Reports", date: "Feb 28, 2026", size: "1.8 MB", type: "pdf" as const },
  { id: "dr3", name: "3-Year Adjusted P&L", category: "Financials", date: "Feb 20, 2026", size: "540 KB", type: "spreadsheet" as const },
  { id: "dr4", name: "Balance Sheet — Normalized", category: "Financials", date: "Feb 20, 2026", size: "480 KB", type: "spreadsheet" as const },
  { id: "dr5", name: "Customer Concentration Analysis", category: "Customer Capital", date: "Mar 1, 2026", size: "1.1 MB", type: "pdf" as const },
  { id: "dr6", name: "Revenue by Segment Breakdown", category: "Customer Capital", date: "Feb 25, 2026", size: "320 KB", type: "spreadsheet" as const },
  { id: "dr7", name: "Entity Structure Diagram", category: "Legal & Structure", date: "Feb 15, 2026", size: "890 KB", type: "pdf" as const },
  { id: "dr8", name: "Operating Agreement Summary", category: "Legal & Structure", date: "Jan 30, 2026", size: "1.5 MB", type: "document" as const },
  { id: "dr9", name: "Management Team Overview", category: "Governance", date: "Feb 10, 2026", size: "720 KB", type: "pdf" as const },
  { id: "dr10", name: "Six Keys Scorecard Export", category: "Reports", date: "Mar 3, 2026", size: "280 KB", type: "pdf" as const },
];

export const recentActivity = [
  { text: "Capital Readiness Memo published for Meridian Industries", time: "2h ago" },
  { text: "Sarah Chen uploaded Q4 financials", time: "4h ago" },
  { text: "Pain Point Analysis generated for Atlas", time: "1d ago" },
  { text: "90-Day Sprint started for Pinnacle Services", time: "2d ago" },
  { text: "Investor Share link created for Vanguard Tech", time: "3d ago" },
];

// Quarterback Copilot Data

export const copilotEngagementStage = {
  current: "Structure",
  progress: 55,
  stages: [
    { id: "trigger", label: "Triggering Event", status: "complete" as const },
    { id: "clarity", label: "Clarity", status: "complete" as const },
    { id: "structure", label: "Structure", status: "active" as const },
    { id: "align", label: "Align", status: "upcoming" as const },
    { id: "deploy", label: "Deploy", status: "upcoming" as const },
  ],
};

export const copilotPriorityActions = [
  { id: "pa1", urgency: "high" as const, action: "Upload customer revenue segmentation", client: "Atlas Manufacturing", engine: "Customer Capital" },
  { id: "pa2", urgency: "high" as const, action: "Complete founder dependency assessment", client: "Vanguard Tech Solutions", engine: "Performance" },
  { id: "pa3", urgency: "medium" as const, action: "Generate Customer Capital Index", client: "Meridian Industries", engine: "Customer Capital" },
  { id: "pa4", urgency: "medium" as const, action: "Draft 90-Day Execution Plan", client: "Pinnacle Services Group", engine: "Performance" },
  { id: "pa5", urgency: "low" as const, action: "Schedule entity structure review", client: "Atlas Manufacturing", engine: "Capital Architecture" },
];

export const copilotDataGaps = [
  { id: "dg1", category: "Financials", gap: "Revenue segmentation by customer — last 3 years", client: "Atlas Manufacturing", impact: "Blocks Customer Capital Index" },
  { id: "dg2", category: "Tax", gap: "2024 tax returns not uploaded", client: "Vanguard Tech Solutions", impact: "Blocks Capital Architecture review" },
  { id: "dg3", category: "Governance", gap: "Founder dependency survey incomplete", client: "Vanguard Tech Solutions", impact: "Blocks Legacy score calculation" },
  { id: "dg4", category: "Legal", gap: "Operating agreement not on file", client: "Atlas Manufacturing", impact: "Blocks entity restructuring analysis" },
];

export const copilotRiskAlerts = [
  { id: "ra1", severity: "critical" as const, title: "Customer concentration exceeds 30%", detail: "Top 3 customers represent 62% of revenue. Recommend activating Customer Capital Defense Sprint.", client: "Atlas Manufacturing" },
  { id: "ra2", severity: "warning" as const, title: "Margin compression detected", detail: "Gross margin declined 4.2pp over trailing 12 months. Flag for Performance Engine review.", client: "Meridian Industries" },
  { id: "ra3", severity: "warning" as const, title: "Entity misalignment identified", detail: "Capital Architecture Engine detected suboptimal holding structure. Schedule structure review.", client: "Vanguard Tech Solutions" },
  { id: "ra4", severity: "info" as const, title: "Founder transition timeline risk", detail: "No documented succession plan. Legacy score suppressed. Recommend governance assessment.", client: "Pinnacle Services Group" },
];

export const copilotDeliverables = [
  { id: "del1", title: "Institutional Performance Brief", client: "Meridian Industries", status: "ready" as const, engine: "Performance" },
  { id: "del2", title: "Pain Point Analysis", client: "Atlas Manufacturing", status: "draft" as const, engine: "Customer Capital" },
  { id: "del3", title: "Capital Architecture Summary", client: "Vanguard Tech Solutions", status: "needs_data" as const, engine: "Capital Architecture" },
  { id: "del4", title: "Customer Capital Defense Summary", client: "Meridian Industries", status: "ready" as const, engine: "Customer Capital" },
  { id: "del5", title: "90-Day Execution Plan", client: "Pinnacle Services Group", status: "draft" as const, engine: "Performance" },
  { id: "del6", title: "Risk Flags Table", client: "Atlas Manufacturing", status: "ready" as const, engine: "Performance" },
  { id: "del7", title: "Board-Style Update", client: "Meridian Industries", status: "needs_data" as const, engine: "Performance" },
];

export const copilotEngineStatus = [
  { engine: "Capital Architecture", health: 72, activeClients: 3, pendingActions: 2, insight: "Entity misalignment detected for 1 client. Tax optimization opportunities identified for 2 clients." },
  { engine: "Customer Capital Defense", health: 58, activeClients: 4, pendingActions: 3, insight: "Revenue concentration risk elevated across 2 clients. Retention durability below benchmark for Atlas." },
  { engine: "Performance & Execution", health: 81, activeClients: 4, pendingActions: 1, insight: "Sprint velocity on track for 3 of 4 engagements. Pinnacle ahead of schedule." },
];

// Insurance Intelligence Layer

export const insuranceOpportunities = [
  {
    id: "ins1",
    type: "Key Person Insurance",
    severity: "critical" as const,
    reason: "Founder dependency risk identified and no continuity funding mechanism documented.",
    benefit: "Provides liquidity and stability in the event of founder loss and strengthens investor confidence.",
    action: "Refer to insurance specialist to evaluate appropriate coverage.",
    client: "Vanguard Tech Solutions",
    engine: "Capital Architecture",
    trigger: "founder_dependency",
  },
  {
    id: "ins2",
    type: "Buy-Sell Funding Insurance",
    severity: "warning" as const,
    reason: "Multi-owner entity with no funded buy-sell agreement. Ownership transfer risk in the event of partner departure or death.",
    benefit: "Ensures orderly ownership transition and protects remaining partners from capital strain.",
    action: "Schedule buy-sell funding analysis with insurance partner.",
    client: "Atlas Manufacturing",
    engine: "Capital Architecture",
    trigger: "buy_sell_gap",
  },
  {
    id: "ins3",
    type: "Estate Planning — Life Insurance",
    severity: "warning" as const,
    reason: "Founder estate tax exposure estimated at $3.2M with no documented insurance strategy.",
    benefit: "Offsets estate tax liability and preserves business continuity for heirs.",
    action: "Engage estate planning specialist to model ILIT structure.",
    client: "Meridian Industries",
    engine: "Capital Architecture",
    trigger: "estate_exposure",
  },
  {
    id: "ins4",
    type: "Executive Benefit Structure",
    severity: "info" as const,
    reason: "Key executives lack retention incentives beyond standard compensation. Turnover risk identified.",
    benefit: "Deferred compensation and split-dollar arrangements improve retention and reduce successor risk.",
    action: "Evaluate executive benefit design with compensation specialist.",
    client: "Pinnacle Services Group",
    engine: "Performance & Execution",
    trigger: "retention_risk",
  },
  {
    id: "ins5",
    type: "Business Continuity Insurance",
    severity: "warning" as const,
    reason: "Revenue concentration exceeds 30% in top 3 customers with no business interruption strategy documented.",
    benefit: "Protects cash flow in the event of key customer loss or market disruption.",
    action: "Review business continuity insurance options with carrier.",
    client: "Atlas Manufacturing",
    engine: "Customer Capital Defense",
    trigger: "concentration_risk",
  },
];

export const insuranceReferralLog = [
  { id: "ref1", client: "Vanguard Tech Solutions", type: "Key Person Insurance", partner: "Meridian Risk Advisors", date: "Feb 28, 2026", status: "pending" as const },
  { id: "ref2", client: "Meridian Industries", type: "Estate Planning — Life Insurance", partner: "Legacy Planning Group", date: "Mar 1, 2026", status: "in_progress" as const },
];

export const investorRiskProtection = [
  { category: "Key Person Coverage", status: "Not Documented" as const, risk: "high" as const, recommendation: "Recommend key person policy with coverage equal to 3–5x EBITDA." },
  { category: "Buy-Sell Funding", status: "Unfunded" as const, risk: "high" as const, recommendation: "Cross-purchase or entity-purchase agreement should be insurance-funded." },
  { category: "Business Continuity", status: "Partial" as const, risk: "medium" as const, recommendation: "Current coverage does not address key customer concentration scenario." },
  { category: "Estate & Succession", status: "Under Review" as const, risk: "medium" as const, recommendation: "ILIT structure recommended to offset projected estate tax exposure." },
  { category: "Executive Retention", status: "Not in Place" as const, risk: "low" as const, recommendation: "Consider deferred compensation or split-dollar arrangement for key managers." },
];
