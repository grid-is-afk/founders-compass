/**
 * TFO Methodology — machine-readable config of The Founders Office engagement model.
 *
 * Derived from:
 *   - TFO Client Journey from MIRO (three engagement phases)
 *   - TFO Tool Matrix from SmartSheet (framework-to-phase mapping)
 *   - TFO Tools Outline from SmartSheet (activity descriptions)
 *   - Existing Q1-Q4 portal quarter structure in the Founders Compass codebase
 */

export interface MethodologyActivity {
  id: string;
  name: string;
  description: string;
  framework?: string;           // e.g. "Founder Exposure Index™"
  portalInstrument?: string;    // matches instrument names in DB
  expectedDeliverable?: string; // matches deliverable types in DB
  isRequired: boolean;
  successIndicator: string;
  prerequisites?: string[];     // activity ids that must be due before this one (Miro ordering)
}

export interface MethodologyPhase {
  id: string;
  name: string;                 // "Discover" | "Protect/Grow/Prove" | "Align"
  quarterMapping: number[];     // [1] | [2, 3] | [4]
  description: string;
  objective: string;
  activities: MethodologyActivity[];
  typicalDuration: string;      // e.g. "90 days"
  keyQuestions: string[];       // questions to assess phase completion
  successCriteria: string[];
}

export const TFO_METHODOLOGY: MethodologyPhase[] = [
  {
    id: "discover",
    name: "Discover",
    quarterMapping: [1],
    description:
      "The Discover phase is the foundational engagement quarter. The advisor conducts all diagnostic instruments, establishes the economic baseline, and builds the Capital Strategy Architecture. This quarter proves the founder's current position before designing the roadmap forward.",
    objective:
      "Establish a complete, data-verified picture of the founder's business position, personal readiness, and capital gap — then design the TFO engagement architecture that will close that gap.",
    typicalDuration: "90 days",
    activities: [
      {
        id: "discover-fei",
        name: "Founder Exposure Index™",
        description:
          "A pre-engagement risk diagnostic that quantifies the founder's personal and business exposure across key risk categories. Used to determine fit and set the protection baseline before the engagement begins.",
        framework: "Founder Exposure Index™",
        portalInstrument: "Founder Exposure Index",
        isRequired: true,
        successIndicator:
          "FEI report completed and shared; exposure score reviewed with founder; top 3 risks documented.",
        // Pre-engagement risk diagnostic — runs before the engagement begins, so no prerequisite.
        prerequisites: [],
      },
      {
        id: "discover-six-cs",
        name: "Six Cs Framework™ Assessment",
        description:
          "Evaluates the founder against the Six Cs — Character, Capacity, Capital, Collateral, Conditions, Coverage — to establish capital readiness and alignment profile.",
        framework: "Six Cs Framework™",
        isRequired: true,
        successIndicator:
          "Six Cs profile scored and documented; gaps identified relative to capital alignment objectives.",
        // Consumes intake data to score capital readiness.
        prerequisites: ["discover-master-intake"],
      },
      {
        id: "discover-master-intake",
        name: "Master Intake",
        description:
          "A structured data collection session covering the founder's business financials, personal goals, ownership structure, and existing advisory relationships. The single source of truth for all diagnostic instruments.",
        portalInstrument: "Master Intake",
        expectedDeliverable: "master_intake",
        isRequired: true,
        successIndicator:
          "All three intake categories completed (business, personal, financial); data verified with founder.",
        // Single source of truth for all diagnostic instruments — the root activity.
        prerequisites: [],
      },
      {
        id: "discover-founder-matrix",
        name: "Founder Matrix™",
        description:
          "Maps the founder's values, motivations, and risk tolerance against capital alignment objectives. Identifies personal drivers that will shape the engagement design.",
        framework: "Founder Matrix™",
        portalInstrument: "Founder Matrix",
        isRequired: true,
        successIndicator:
          "Matrix completed and scored; founder's primary motivators and risk profile documented.",
        // Maps values/motivations captured during intake.
        prerequisites: ["discover-master-intake"],
      },
      {
        id: "discover-founder-snapshot",
        name: "Founder Snapshot™",
        description:
          "A point-in-time baseline capturing the founder's personal and business position relative to their stated goals. Establishes the starting coordinates for measuring quarterly progress.",
        framework: "Founder Snapshot™",
        portalInstrument: "Founder Snapshot",
        isRequired: true,
        successIndicator:
          "Snapshot completed; baseline scores recorded for all five measurement dimensions.",
        // Baseline coordinates drawn from the verified intake data.
        prerequisites: ["discover-master-intake"],
      },
      {
        id: "discover-six-keys-baseline",
        name: "Six Keys of Capital™ Baseline",
        description:
          "Initial scoring of the founder across all six keys: Clarity, Alignment, Structure, Stewardship, Velocity, and Legacy. Establishes the Q1 benchmark for the recurring scorecard.",
        framework: "Six Keys of Capital™",
        portalInstrument: "Six Keys Scorecard",
        isRequired: true,
        successIndicator:
          "All six keys scored; baseline scorecard reviewed with founder; delta targets set for Q2.",
        // Initial scoring depends on the intake data set.
        prerequisites: ["discover-master-intake"],
      },
      {
        id: "discover-csa",
        name: "Capital Strategy Architecture™",
        description:
          "The blueprint for the founder's capital structure, entity alignment, and strategic pathway to their target outcome. Designed after all diagnostic instruments are complete.",
        framework: "Capital Strategy Architecture™",
        portalInstrument: "Capital Strategy Architecture",
        expectedDeliverable: "capital_strategy_architecture",
        isRequired: true,
        successIndicator:
          "CSA document drafted, reviewed with founder, and approved as the engagement roadmap.",
        // "Designed after all diagnostic instruments are complete" — the sink activity.
        prerequisites: [
          "discover-fei",
          "discover-six-cs",
          "discover-founder-matrix",
          "discover-founder-snapshot",
          "discover-six-keys-baseline",
          "discover-wealth-gap",
        ],
      },
      {
        id: "discover-wealth-gap",
        name: "Wealth Gap Analysis",
        description:
          "Quantifies the gap between the founder's current business value and the capital required to fund their future. Anchors the economic certainty target for the engagement.",
        portalInstrument: "Wealth Gap Analysis",
        expectedDeliverable: "wealth_gap_analysis",
        isRequired: true,
        successIndicator:
          "Gap dollar amount calculated; economic certainty target agreed upon with founder.",
        // Anchors the economic certainty target; needs intake financials + Six Cs capital readiness.
        prerequisites: ["discover-master-intake", "discover-six-cs"],
      },
    ],
    keyQuestions: [
      "Has the Master Intake been completed and all three categories verified?",
      "Have all four diagnostic instruments (FBI, Founder Matrix, Founder Snapshot, ECF) been scored?",
      "Has the Capital Strategy Architecture been built and reviewed with the founder?",
      "Is the Wealth Gap quantified and the economic certainty target agreed upon?",
      "Has the Q1 Six Keys baseline been established?",
      "Has a Q2 commitment been documented in the quarterly review?",
    ],
    successCriteria: [
      "All diagnostic instruments scored and on file",
      "Capital Strategy Architecture delivered and approved",
      "Wealth Gap quantified and economic certainty target set",
      "Six Keys baseline scorecard established",
      "Q2 Protect/Grow/Prove plan committed in writing",
    ],
  },

  {
    id: "protect-grow-prove",
    name: "Protect/Grow/Prove",
    quarterMapping: [2, 3],
    description:
      "The compounding execution phase. Every quarter (Q2 onward, or Q3 in an extended engagement) runs the Prove → Protect → Grow → Align cycle. Progress compounds across all dimensions: protection gaps close, grow lane partnerships activate, and the Six Keys scorecard improves.",
    objective:
      "Systematically close the wealth gap by protecting value already built, growing it across five capital types via TFO's partner network, and proving measurable progress against the economic certainty target each quarter.",
    typicalDuration: "90 days per quarter",
    activities: [
      {
        id: "pgp-prove",
        name: "Prove — Quarterly Progress Measurement",
        description:
          "Measure progress against the economic certainty target and Six Keys scorecard established in Q1. Update the Founder Snapshot and compare delta against baseline.",
        framework: "Six Keys of Capital™",
        portalInstrument: "Six Keys Scorecard",
        isRequired: true,
        successIndicator:
          "Updated Six Keys scorecard completed; delta vs. prior quarter documented; progress toward wealth gap closure quantified.",
      },
      {
        id: "pgp-protection-architecture",
        name: "Protection Architecture",
        description:
          "Identify and close coverage gaps across key person insurance, buy-sell funding, business continuity, estate planning, and asset protection. TFO identifies gaps and refers to specialist partners — never sells coverage directly.",
        portalInstrument: "Protection Architecture",
        expectedDeliverable: "protection_architecture",
        isRequired: true,
        successIndicator:
          "Protection gap report updated; at least one gap closed or referral made this quarter; asset protection matrix current.",
      },
      {
        id: "pgp-grow-lane",
        name: "Grow Lane Activation",
        description:
          "Orchestrate the founder's growth across five capital types via TFO's partner network: Human Capital, Customer Capital, Structural Capital, Social Capital, and Personal Path. TFO does not deliver these services directly — it activates and coordinates trusted partners.",
        isRequired: true,
        successIndicator:
          "At least one Grow Lane engagement active per quarter; partner referral documented; Grow Lane outcome tracked against Six Keys velocity score.",
      },
      {
        id: "pgp-recasted-financials",
        name: "Recasted Financials",
        description:
          "Reconstruct the founder's financials to reflect true economic earnings, removing personal expenses and one-time items, to present the business in its strongest light for capital events.",
        framework: "Recasted Financials",
        expectedDeliverable: "recasted_financials",
        isRequired: false,
        successIndicator:
          "Recasted P&L delivered; adjusted EBITDA or SDE calculated; variance from reported earnings documented.",
      },
      {
        id: "pgp-value-multiplier",
        name: "Value Multiplier Framework™",
        description:
          "Identify and systematically improve the drivers of the business's valuation multiple — beyond earnings. Focus on the 54 value factors that buyers weight in due diligence.",
        framework: "Value Multiplier Framework™",
        expectedDeliverable: "value_multiplier_assessment",
        isRequired: false,
        successIndicator:
          "Top 5 value multiplier opportunities identified; at least one improvement initiated; expected multiple impact estimated.",
      },
      {
        id: "pgp-six-keys-update",
        name: "Six Keys of Capital™ Update",
        description:
          "Update the Six Keys scorecard to reflect progress this quarter. The scorecard covers Clarity, Alignment, Structure, Stewardship, Velocity, and Legacy.",
        framework: "Six Keys of Capital™",
        portalInstrument: "Six Keys Scorecard",
        isRequired: true,
        successIndicator:
          "All six keys re-scored; at least one key shows measurable improvement from prior quarter.",
      },
      {
        id: "pgp-quarterly-review",
        name: "Quarterly Review — Align",
        description:
          "The quarter-close alignment session. Assess what moved, what didn't, recalibrate priorities, and commit to next-quarter plan in writing.",
        expectedDeliverable: "quarterly_review",
        isRequired: true,
        successIndicator:
          "Quarterly review meeting held; written commitments for next quarter agreed; any at-risk items escalated.",
      },
    ],
    keyQuestions: [
      "Have quarterly progress measurements been run against the Six Keys baseline?",
      "Has the protection architecture been updated and at least one gap addressed?",
      "Is at least one Grow Lane partnership active and tracked?",
      "Has the Six Keys scorecard shown improvement from the prior quarter?",
      "Have Recasted Financials been prepared if a capital event is within 12 months?",
      "Has the quarterly review session been held and next-quarter commitments documented?",
    ],
    successCriteria: [
      "Six Keys scorecard improving quarter over quarter",
      "Protection architecture gaps closing systematically",
      "At least one Grow Lane engagement active per quarter",
      "Wealth gap visibly narrowing against economic certainty target",
      "Quarterly review held and next-quarter plan committed",
    ],
  },

  {
    id: "align",
    name: "Align",
    quarterMapping: [4],
    description:
      "The annual recalibration phase. Q4 adds Optionality review and an annual alignment session to the standard quarterly cycle. The advisor and founder assess the full year's progress, stress-test exit and transition pathways, and recalibrate the engagement design for the next annual cycle.",
    objective:
      "Recalibrate the founder's overall trajectory, confirm or update their optionality map, and commit to the next annual cycle of the Capital Alignment Method with full data visibility.",
    typicalDuration: "90 days",
    activities: [
      {
        id: "align-optionality-framework",
        name: "Founders Optionality Framework™",
        description:
          "Identify and stress-test the founder's exit and transition pathways. Evaluate each option against their personal goals, capital requirements, and current business readiness.",
        framework: "Founders Optionality Framework™",
        portalInstrument: "Founders Optionality Framework",
        expectedDeliverable: "optionality_framework",
        isRequired: true,
        successIndicator:
          "All viable exit pathways documented; each scored against founder's goals; preferred pathway identified and confirmed.",
      },
      {
        id: "align-annual-review",
        name: "Annual Alignment Session",
        description:
          "A structured annual review that covers the full year: Six Keys progress, wealth gap movement, protection completeness, grow lane outcomes, and optionality readiness. Recalibrates the engagement design for the next annual cycle.",
        expectedDeliverable: "annual_review",
        isRequired: true,
        successIndicator:
          "Annual alignment session held; year-in-review document prepared; next annual cycle committed in writing.",
      },
      {
        id: "align-capital-alignment-method",
        name: "Capital Alignment Method™ Recalibration",
        description:
          "Update the Capital Alignment Method design to reflect what changed over the year — new business conditions, updated goals, revised capital strategy, and any shifts in the founder's personal timeline.",
        framework: "Capital Alignment Method™",
        isRequired: true,
        successIndicator:
          "CAM updated; any changes to economic certainty target documented; revised engagement roadmap agreed.",
      },
      {
        id: "align-csa-update",
        name: "Capital Strategy Architecture™ Update",
        description:
          "Refresh the Capital Strategy Architecture to reflect the current state of the business, the capital stack, and the founder's updated objectives heading into the next annual cycle.",
        framework: "Capital Strategy Architecture™",
        portalInstrument: "Capital Strategy Architecture",
        expectedDeliverable: "capital_strategy_architecture",
        isRequired: true,
        successIndicator:
          "CSA refreshed and reviewed with founder; all material changes from Q1 version documented.",
      },
      {
        id: "align-six-keys-annual",
        name: "Six Keys Annual Scorecard",
        description:
          "Full annual Six Keys scorecard review. Measure year-over-year progress across all six dimensions and set targets for the next annual cycle.",
        framework: "Six Keys of Capital™",
        portalInstrument: "Six Keys Scorecard",
        isRequired: true,
        successIndicator:
          "Annual scorecard completed; year-over-year delta documented; next-cycle targets committed.",
      },
    ],
    keyQuestions: [
      "Has the Founders Optionality Framework been completed and preferred pathway confirmed?",
      "Has the annual alignment session been held with all key data reviewed?",
      "Has the Capital Alignment Method been recalibrated for the next annual cycle?",
      "Has the Capital Strategy Architecture been refreshed?",
      "Has the annual Six Keys scorecard been completed with year-over-year comparison?",
      "Is the founder's economic certainty target still accurate, or does it need revision?",
    ],
    successCriteria: [
      "Founders Optionality Framework completed and preferred pathway documented",
      "Annual alignment session held and next-cycle plan committed",
      "Capital Strategy Architecture refreshed",
      "Annual Six Keys scorecard showing year-over-year improvement",
      "Capital Alignment Method recalibrated for next cycle",
    ],
  },
];

/**
 * Returns the methodology phase for a given quarter number (1-4).
 * Quarter 4 maps to Align; quarters 2-3 map to Protect/Grow/Prove; quarter 1 maps to Discover.
 */
export function getPhaseForQuarter(quarter: number): MethodologyPhase | undefined {
  return TFO_METHODOLOGY.find((phase) => phase.quarterMapping.includes(quarter));
}

/**
 * Returns a brief one-sentence description of what the methodology expects in a given quarter.
 */
export function getPhaseExpectationSummary(quarter: number): string {
  const phase = getPhaseForQuarter(quarter);
  if (!phase) return "Unknown phase.";
  const requiredActivities = phase.activities
    .filter((a) => a.isRequired)
    .map((a) => a.name)
    .join(", ");
  return `${phase.name} phase (Q${quarter}): ${phase.objective} Required activities: ${requiredActivities}.`;
}
