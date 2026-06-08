/**
 * Kickoff-plan back-scheduling (UC-06).
 *
 * Pure, DB-free helpers that turn methodology activities into a due date each,
 * spread across a discovery window by their canonical Chapter-1 section.
 *
 * The section order is the TFO Client Journey (Miro) sequence, encoded in the
 * `q1_phase_config` table (kickoff → prove → diagnose → design_tfo →
 * design_outside → review, with day ranges over a 90-day Q1). An activity's due
 * date is its section's position in that timeline, scaled to the actual
 * discovery window. Because the section order matches the journey, prerequisites
 * are respected by construction (Prove instruments date before Diagnose, etc.).
 *
 * All date math is done in UTC against a `YYYY-MM-DDT00:00:00Z` anchor and
 * formatted back to a plain `YYYY-MM-DD` string, so it never drifts by a day
 * across timezones and maps cleanly onto Postgres `DATE`.
 */

export interface SchedulableActivity {
  id: string;
  /** A `q1_phase_config.phase` id (prove | diagnose | design_tfo | …). */
  section?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Validate a `YYYY-MM-DD` string and return its UTC midnight epoch ms. */
function toUtcEpoch(startDate: string): number {
  const epoch = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(epoch)) {
    throw new Error(`Invalid startDate (expected YYYY-MM-DD): "${startDate}"`);
  }
  return epoch;
}

/** Add `days` whole days to a `YYYY-MM-DD` start and return a `YYYY-MM-DD` string. */
export function addDaysUTC(startDate: string, days: number): string {
  const epoch = toUtcEpoch(startDate);
  return new Date(epoch + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Compute a due date per activity, back-scheduled across [startDate, startDate + durationDays]
 * by each activity's section position in the canonical Q1 timeline.
 *
 * @param activities          activities with an optional `section` id
 * @param sectionDayEnds      section id -> its day_end within the methodology timeline (from q1_phase_config)
 * @param methodologyTotalDays the methodology timeline length the day_ends are measured against (e.g. 90)
 * @param startDate           'YYYY-MM-DD' window start
 * @param durationDays        the advisor's discovery window length
 * @returns activityId -> 'YYYY-MM-DD'. Activities in the same section share that section's
 *          target date; an unknown/missing section falls back to the window end.
 * @throws if startDate is invalid.
 */
export function computeDueDates(
  activities: SchedulableActivity[],
  sectionDayEnds: Record<string, number>,
  methodologyTotalDays: number,
  startDate: string,
  durationDays: number,
): Record<string, string> {
  toUtcEpoch(startDate); // validate up front

  const windowDays =
    Number.isFinite(durationDays) && durationDays > 0 ? Math.floor(durationDays) : 1;
  const total =
    Number.isFinite(methodologyTotalDays) && methodologyTotalDays > 0
      ? methodologyTotalDays
      : 90;

  const result: Record<string, string> = {};
  for (const a of activities) {
    const dayEnd = a.section ? sectionDayEnds[a.section] : undefined;
    // Unknown/missing section → schedule at the window end so the task is never date-less.
    const offset =
      dayEnd === undefined
        ? windowDays
        : Math.round((Math.min(dayEnd, total) / total) * windowDays);
    result[a.id] = addDaysUTC(startDate, offset);
  }
  return result;
}
