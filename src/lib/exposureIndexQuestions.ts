export const EXPOSURE_CATEGORIES = [
  {
    id: "clarity",
    label: "Clarity Exposure",
    description:
      "How precisely the founder understands the problem they solve and the outcome they're pursuing.",
    questions: [
      {
        id: "c1",
        text: "What is the primary outcome you are working toward in the next 12–24 months?",
        options: ["Unclear", "General", "Specific", "Defined strategy"],
      },
      {
        id: "c2",
        text: "Can you clearly articulate the core problem your business solves in one sentence?",
        options: ["No", "Vague", "Clear", "Repeatable"],
      },
      {
        id: "c3",
        text: "Is your solution validated with consistent, repeatable results?",
        options: ["None", "Some", "Consistent", "Proven"],
      },
    ],
  },
  {
    id: "capital",
    label: "Capital Exposure",
    description:
      "Whether capital has been intentionally designed to support the business or reactively accepted.",
    questions: [
      {
        id: "ca1",
        text: "Have you raised capital or taken on outside investors?",
        options: ["None", "Friends/Family", "Institutional", "Multiple rounds"],
      },
      {
        id: "ca2",
        text: "Does your current capital structure support your long-term goals?",
        options: ["No", "Unsure", "Mostly", "Yes"],
      },
      {
        id: "ca3",
        text: "Are there upcoming capital decisions in the next 6–12 months?",
        options: ["None", "Possible", "Yes", "In motion"],
      },
    ],
  },
  {
    id: "structural",
    label: "Structural Exposure",
    description:
      "How well the business is organized to operate, scale, and transfer value independent of the founder.",
    questions: [
      {
        id: "s1",
        text: "Can your business operate without you in day-to-day decision making?",
        options: ["No", "Partial", "Mostly", "Fully"],
      },
      {
        id: "s2",
        text: "Are roles, ownership, and decision rights clearly defined?",
        options: ["No", "Informal", "Mostly", "Structured"],
      },
      {
        id: "s3",
        text: "Do you have systems in place that allow the business to scale without adding complexity?",
        options: ["None", "Limited", "Some", "Strong systems"],
      },
    ],
  },
  {
    id: "risk",
    label: "Risk Exposure",
    description:
      "The visibility, concentration, and protection of personal, legal, financial, and operational risk.",
    questions: [
      {
        id: "r1",
        text: "Do you have a clear view of your personal, legal, and financial exposure?",
        options: ["None", "Partial", "Mostly", "Full"],
      },
      {
        id: "r2",
        text: "Are your personal assets and business risks structurally separated?",
        options: ["None", "Some", "Mostly", "Fully"],
      },
      {
        id: "r3",
        text: "Are there known risks today that have not yet been addressed?",
        options: ["Many", "Some", "Few", "None"],
      },
    ],
  },
  {
    id: "dependency",
    label: "Founder Dependency Exposure",
    description:
      "The extent to which the business relies on the founder for decisions, execution, and continuity.",
    questions: [
      {
        id: "d1",
        text: "Where are you most involved in the business today?",
        options: ["Everything", "Ops heavy", "Mixed", "Strategic"],
      },
      {
        id: "d2",
        text: "Is your involvement increasing or decreasing business value?",
        options: ["Decreasing", "Neutral", "Increasing", "Transitioning out"],
      },
      {
        id: "d3",
        text: "What decisions cannot be made without you?",
        options: ["Most decisions", "Many", "Few", "Minimal"],
      },
    ],
  },
  {
    id: "optionality",
    label: "Optionality Exposure",
    description:
      "The founder's ability to make strategic decisions from a position of control rather than pressure.",
    questions: [
      {
        id: "o1",
        text: "If an opportunity to exit or raise capital came tomorrow, how prepared are you?",
        options: ["Not ready", "Somewhat", "Mostly", "Fully"],
      },
      {
        id: "o2",
        text: "Are you making decisions from a position of choice or pressure?",
        options: ["Pressure", "Mostly pressure", "Some choice", "Full choice"],
      },
      {
        id: "o3",
        text: "How many viable strategic options do you have today?",
        options: ["None", "One", "A few", "Multiple strong options"],
      },
    ],
  },
] as const;

export type CategoryId = (typeof EXPOSURE_CATEGORIES)[number]["id"];

/** Short display labels for the score strip grid */
export const CATEGORY_SHORT_LABELS: Record<CategoryId, string> = {
  clarity: "Clarity",
  capital: "Capital",
  structural: "Struct.",
  risk: "Risk",
  dependency: "Found.",
  optionality: "Option.",
};

/**
 * Compute per-category scores from a responses map.
 * responses: { clarity: [2, 3, 1], capital: [1, 2, 0], ... }
 * Returns: { clarity: 6, capital: 3, ... }
 */
export function computeCategoryScores(
  responses: Record<string, number[]>
): Record<CategoryId, number> {
  const scores = {} as Record<CategoryId, number>;
  for (const cat of EXPOSURE_CATEGORIES) {
    const answers = responses[cat.id] ?? [];
    scores[cat.id] = answers.reduce((sum, v) => sum + v, 0);
  }
  return scores;
}

/**
 * Map a per-category score (0–9) to an exposure level label.
 * High exposure = lower score (fewer defenses built).
 */
export function exposureLevel(score: number): "Low" | "Medium" | "High" {
  if (score >= 7) return "Low";
  if (score >= 4) return "Medium";
  return "High";
}

/** Total answered questions from a flat responses map */
export function countAnswered(responses: Record<string, number[]>): number {
  return EXPOSURE_CATEGORIES.reduce((total, cat) => {
    const answers = responses[cat.id];
    return total + (answers?.filter((v) => v !== undefined).length ?? 0);
  }, 0);
}

/** Build the Quarterback pre-seeded prompt for an exposure index result */
export function buildAskQuarterbackPrompt(
  prospectName: string,
  scores: Record<string, number>
): string {
  const parts = EXPOSURE_CATEGORIES.map(
    (cat) =>
      `${cat.label}: ${scores[cat.id] ?? 0}/9 (${exposureLevel(scores[cat.id] ?? 0)} exposure)`
  ).join(", ");
  return (
    `Summarize the Founder Exposure Index results for ${prospectName}. ` +
    `Their scores: ${parts}. ` +
    `What are their top 2–3 risk areas and what should we prioritize first?`
  );
}

export const TOTAL_QUESTIONS = EXPOSURE_CATEGORIES.reduce(
  (sum, cat) => sum + cat.questions.length,
  0
); // 18
