// Serialize all platform data for the system prompt
export function buildPlatformContext(): string {
  return `
## CLIENT PORTFOLIO

### Meridian Industries (ID: 1)
- Contact: Sarah Chen
- Stage: Q2 2026 — Active (Protect, Grow, Prove, Align)
- Capital Readiness: 72%
- Customer Capital Index: 68%
- Performance Score: 80%
- Revenue: $12.4M
- Last Activity: 2 hours ago

### Atlas Manufacturing (ID: 2)
- Contact: Robert Hayes
- Stage: Q1 2026 — Discover (Active), currently in Diagnose phase
- Capital Readiness: 45%
- Customer Capital Index: 52%
- Performance Score: 58%
- Revenue: $8.2M
- Last Activity: 1 day ago

### Pinnacle Services Group (ID: 3)
- Contact: Lisa Park
- Stage: Q3 2026 — Protect, Grow, Prove (Active)
- Capital Readiness: 88%
- Customer Capital Index: 91%
- Performance Score: 85%
- Revenue: $22.1M
- Last Activity: 4 hours ago

### Vanguard Tech Solutions (ID: 4)
- Contact: Michael Torres
- Stage: Q1 2026 — Discover (Active), currently in Diagnose phase
- Capital Readiness: 63%
- Customer Capital Index: 70%
- Performance Score: 74%
- Revenue: $5.7M
- Last Activity: 3 days ago

## SIX KEYS OF CAPITAL SCORES (Portfolio Average)
- Clarity: 78/100 — Strategic vision and capital narrative definition
- Alignment: 65/100 — Mutual verification of intent, data, and outcomes
- Structure: 82/100 — Capital stack simplicity and enforceability
- Stewardship: 71/100 — Governance integrity and daily discipline
- Velocity: 59/100 — Pace matched to data and governance capacity
- Legacy: 74/100 — Organization endurance beyond the founder

## ASSESSMENT SCORECARDS (Meridian Industries)

### Business Attractiveness: 72% (108/150)
- Business Factors (11): avg 4.3/6 — Strong in facilities, replicable model, systems. Weak in customer concentration (3) and owner reliance (3).
- Forecast Factors (5): avg 4.4/6 — Strong profitability and revenue growth. Solid recurring revenue at 55%.
- Market Factors (5): avg 4.4/6 — Market growth strong, good competitive advantage. Market position #2 regionally.
- Investor Considerations (4): avg 4.25/6 — Good synergy potential (5). Planned retirement in 3 years.

### Business Readiness: 68% (90/132)
- Key strengths: Brand (5), Credibility (5), Financials (5), Revenue Drivers (5), Personal Expectations (5)
- Needs improvement: Government Grants (2), Documentation (4), Customer Contracts (4), Immediate Value Readiness (3), Marketing (4)

### Personal Readiness: 80% (53/66)
- Key strengths: Family Awareness (6), Written Plan (5), Financial Plan (5), Net Proceeds Knowledge (5), Transition Knowledge (5), Advisory Team (5), Deal Structure Knowledge (5)
- Areas to develop: Estate & Tax Plan (4), Business Dependency (4), Contingency Plans (4)

### 54 Value Factors: 65% positive (35 of 54)
- Personal: 3 positive, 1 neutral, 1 improvement
- Business Operations: 11 positive, 5 neutral, 2 improvement
- Industry/Market: 5 positive, 1 neutral, 1 improvement
- Legal/Regulatory: 5 positive, 2 neutral, 1 improvement
- Financial: 9 positive, 1 neutral, 2 improvement
- Economic/M&A: 2 positive, 1 neutral, 1 improvement

## RISK ALERTS
1. CRITICAL: Customer concentration exceeds 30% — Atlas Manufacturing. Top 3 customers = 62% of revenue.
2. WARNING: Margin compression detected — Meridian Industries. Gross margin declined 4.2pp over trailing 12 months.
3. WARNING: Entity misalignment identified — Vanguard Tech Solutions. Suboptimal holding structure detected.
4. INFO: Founder transition timeline risk — Pinnacle Services Group. No documented succession plan.

## DATA GAPS
1. Revenue segmentation by customer (last 3 years) — Atlas Manufacturing. Blocks Customer Capital Index.
2. 2024 tax returns not uploaded — Vanguard Tech Solutions. Blocks Capital Architecture review.
3. Founder dependency survey incomplete — Vanguard Tech Solutions. Blocks Legacy score.
4. Operating agreement not on file — Atlas Manufacturing. Blocks entity restructuring analysis.

## DELIVERABLES STATUS
- Institutional Performance Brief — Meridian: READY
- Pain Point Analysis — Atlas: DRAFT
- Capital Architecture Summary — Vanguard: NEEDS DATA
- Customer Capital Defense Summary — Meridian: READY
- 90-Day Execution Plan — Pinnacle: DRAFT
- Risk Flags Table — Atlas: READY
- Board-Style Update — Meridian: NEEDS DATA

## ENGINE STATUS
- Capital Architecture: Health 72/100, 3 active clients, 2 pending actions
- Customer Capital Defense: Health 58/100, 4 active clients, 3 pending actions
- Performance & Execution: Health 81/100, 4 active clients, 1 pending action

## QUARTERLY JOURNEY STATUS

### Meridian Industries — Q2 2026 (Active)
Quarter Label: Protect, Grow, Prove, Align
Quarter Dates: Apr 1 – Jun 30, 2026
Days to Quarterly Review: 47 (review scheduled Jun 28, 2026)

- Q1 Discover: COMPLETE
  - All instruments completed: FBI, Founder Snapshot, Founder Matrix, ECF, CSA, Wealth Gap Analysis
  - Q1 Quarterly Review completed Jan 15, 2026
  - Capital Strategy Architecture finalized — entity restructuring recommended

- Q2 Protect/Grow/Prove/Align (Active):
  - Prove: COMPLETE (5/5 tasks) — all Q2 Prove tasks done
  - Protect: IN PROGRESS (2/4 tasks) — Asset Matrix in place, Key Person Insurance under review, Buy-Sell Funding not documented, Business Continuity partial
  - Grow: IN PROGRESS (1/5 engagements) — Human Capital (Meridian HR Partners) and Structural Capital (SysTech Consulting) active
  - Align: NOT STARTED — Quarterly Review scheduled Jun 28

- Q3 Protect/Grow/Prove/Align: UPCOMING (Sep 30 review)
- Q4 Realign & Optionality: UPCOMING (Dec 31 review)

## INSTRUMENTS STATUS (Meridian Industries)

### Completed Instruments
1. Founder Business Index (FBI) — completed Jan 5, 2026 — Phase: Diagnose
   - Measures overall business attractiveness and readiness across 25 key factors
2. Founder Snapshot — completed Jan 8, 2026 — Phase: Diagnose
   - Point-in-time baseline of founder's personal and business position
3. Founder Matrix — completed Jan 10, 2026 — Phase: Diagnose
   - Maps founder's values, motivations, and risk tolerance
4. Economic Certainty Framework (ECF) — completed Jan 12, 2026 — Phase: Diagnose
   - Defines economic floor and target outcome for financial certainty
5. Capital Strategy Architecture (CSA) — completed Jan 14, 2026 — Phase: Design TFO
   - Blueprints capital structure, entity alignment, and strategic pathway
6. Wealth Gap Analysis — completed Jan 13, 2026 — Phase: Design TFO
   - Quantifies gap between current value and capital needed for founder's future ($4.2M shortfall)

### In Progress Instruments
7. Protection Architecture — IN PROGRESS — Phase: Protect
   - Documents and structures insurance and asset protection layer

### Upcoming Instruments
8. Founder's Optionality Framework — NOT STARTED — Phase: Align
   - Identifies and stress-tests exit and transition pathways

## PROTECTION ARCHITECTURE (Meridian Industries)
- Asset Protection Matrix: IN PLACE (low risk) — Annual review scheduled Q3
- Key Person Insurance: UNDER REVIEW (high risk) — Recommend 3–5x EBITDA coverage
- Buy-Sell Funding: NOT DOCUMENTED (high risk) — Insurance-funded agreement needed
- Business Continuity: PARTIAL (medium risk) — Does not address key customer concentration
- Intellectual Property: PARTIAL (medium risk) — Processes documented but not formally registered

## GROW LANE (Meridian Industries)
TFO does not deliver Grow services directly. We architect a subcontractor network across 5 capital types.

Active Engagements:
- Human Capital: IN PROGRESS — Partner: Meridian HR Partners — 1/3 tasks (template adopted)
- Structural Capital: IN PROGRESS — Partner: SysTech Consulting — 1/4 tasks (template adopted)

Pending Engagements:
- Customer Capital: NOT STARTED — 0/2 tasks
- Social Capital: NOT STARTED — 0/1 tasks
- Personal Path: NOT STARTED — 0/2 tasks

Referral System: TFO → Partners (outbound) and Partners → TFO (inbound for new founder referrals)

## PRE-CLIENT PIPELINE (Prospects)
Total: 5 prospects across 4 pipeline stages

- Intake (1): Summit Logistics LLC — David Kwan — $4.2M revenue — Referral — Mar 20, 2026
- Discovery (1): Apex Digital Inc — Maria Santos — $6.8M revenue — Website — Mar 15, 2026
- Fit Assessment (2):
  - Forge Mfg Co — Tom Bradley — $15.3M revenue — Fit Score: 78 — APPROVED FIT
  - Stellar Partners Group — Anna Lee — $3.1M revenue — Fit Score: 42 — NO FIT (revenue too low, nurture program recommended)
- Onboarding (1): Horizon Health Systems — James Park — $11.5M revenue — Fit Score: 85 — APPROVED FIT

## INSURANCE OPPORTUNITIES
1. CRITICAL: Key Person Insurance — Vanguard Tech. Founder dependency risk, no continuity funding.
2. WARNING: Buy-Sell Funding Insurance — Atlas Manufacturing. Multi-owner entity, unfunded buy-sell.
3. WARNING: Estate Planning Life Insurance — Meridian. $3.2M estate tax exposure, no insurance strategy.
4. INFO: Executive Benefit Structure — Pinnacle. Key exec retention incentives missing.
5. WARNING: Business Continuity Insurance — Atlas. Revenue concentration >30%, no interruption strategy.

## SPRINT TASKS
1. DONE: Complete financial statement analysis (Advisor, Mar 5, high)
2. IN PROGRESS: Customer concentration assessment (Client, Mar 12, high)
3. IN PROGRESS: Entity structure review (Advisor, Mar 15, medium)
4. TODO: Upload 3 years of tax returns (Client, Mar 18, medium)
5. TODO: Board-style monthly update draft (Advisor, Mar 20, low)
`;
}
