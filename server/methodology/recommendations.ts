import { getPhaseForQuarter } from "./tfo-methodology.js";
import { query } from "../db.js";

export interface MethodologyGap {
  activityId: string;
  activityName: string;
  framework?: string;
  description: string;
  reason: string;
  suggestedTaskTitle: string;
  suggestedTaskPriority: "high" | "medium" | "low";
  isRequired: boolean;
}

export async function getMethodologyGaps(
  clientId: string,
  currentQuarter: number
): Promise<MethodologyGap[]> {
  const phase = getPhaseForQuarter(currentQuarter);
  if (!phase) return [];

  // Instruments the client has completed
  const instrumentsResult = await query(
    `SELECT name, status FROM instruments WHERE client_id = $1`,
    [clientId]
  );
  const completedInstruments = new Set(
    instrumentsResult.rows
      .filter((r: { name: string; status: string }) => r.status === "complete")
      .map((r: { name: string }) => r.name.toLowerCase())
  );

  // Existing task titles (for fuzzy de-duplication)
  const tasksResult = await query(
    `SELECT title, status FROM tasks WHERE client_id = $1`,
    [clientId]
  );
  const taskTitles: string[] = tasksResult.rows.map(
    (r: { title: string }) => r.title.toLowerCase()
  );

  // Deliverables that are done / ready / sent
  const deliverablesResult = await query(
    `SELECT engine, status FROM deliverables WHERE client_id = $1`,
    [clientId]
  );
  const completedDeliverables = new Set(
    deliverablesResult.rows
      .filter((r: { status: string }) =>
        ["complete", "ready", "sent"].includes(r.status)
      )
      .map((r: { engine: string }) => r.engine)
  );

  const gaps: MethodologyGap[] = [];

  for (const activity of phase.activities) {
    // Only flag activities we can actually measure (instrument or deliverable)
    if (!activity.portalInstrument && !activity.expectedDeliverable) {
      continue;
    }

    let missing = false;

    if (activity.portalInstrument) {
      const done = completedInstruments.has(
        activity.portalInstrument.toLowerCase()
      );
      if (!done) missing = true;
    }

    if (activity.expectedDeliverable) {
      const done = completedDeliverables.has(activity.expectedDeliverable);
      if (!done) missing = true;
    }

    if (!missing) continue;

    // Fuzzy check: if any 4+ char word from the activity name appears in an
    // existing task title, consider it already tasked — no duplicate.
    const activityWords = activity.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const alreadyTasked =
      activityWords.length > 0 &&
      taskTitles.some((title) =>
        activityWords.some((word) => title.includes(word))
      );

    if (alreadyTasked) continue;

    gaps.push({
      activityId: activity.id,
      activityName: activity.name,
      framework: activity.framework,
      description: activity.description,
      reason: `${activity.successIndicator} — not yet completed for Q${currentQuarter}.`,
      suggestedTaskTitle: `Complete: ${activity.name}`,
      suggestedTaskPriority: activity.isRequired ? "high" : "medium",
      isRequired: activity.isRequired,
    });
  }

  // Required gaps surface first
  return gaps.sort((a, b) => (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0));
}
