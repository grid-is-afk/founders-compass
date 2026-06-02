/**
 * Kickoff-plan back-scheduling (UC-06).
 *
 * Pure, DB-free helpers that turn a set of methodology activities with
 * prerequisite edges into a due date per activity, spread across a discovery
 * window. The core invariant: every prerequisite's due date is strictly
 * earlier than the due date of any activity that depends on it.
 *
 * All date math is done in UTC against a `YYYY-MM-DDT00:00:00Z` anchor and
 * formatted back to a plain `YYYY-MM-DD` string, so it never drifts by a day
 * across timezones and maps cleanly onto Postgres `DATE`.
 */

export interface SchedulableActivity {
  id: string;
  prerequisites?: string[];
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
 * Compute a due date per activity, back-scheduled across [startDate, startDate + durationDays].
 *
 * Activities are bucketed by topological depth (longest path from a root); the
 * depth levels are distributed evenly across the window, with a monotonic clamp
 * guaranteeing each level lands at least one day after the previous one — so the
 * strict prerequisite-before-dependent ordering holds even for short windows.
 *
 * @throws if the prerequisite graph contains a cycle, or startDate is invalid.
 */
export function computeDueDates(
  activities: SchedulableActivity[],
  startDate: string,
  durationDays: number,
): Record<string, string> {
  // Validate the start date up front (throws on garbage).
  toUtcEpoch(startDate);

  // Guard duration defensively; the route validates too, but never divide by 0/NaN.
  const windowDays =
    Number.isFinite(durationDays) && durationDays > 0 ? Math.floor(durationDays) : 1;

  const ids = new Set(activities.map((a) => a.id));

  // Build a clean prereq map, dropping any unknown ids defensively.
  const prereqs = new Map<string, string[]>();
  for (const a of activities) {
    const valid = (a.prerequisites ?? []).filter((p) => {
      if (!ids.has(p)) {
        console.warn(`kickoffSchedule: activity "${a.id}" references unknown prerequisite "${p}" — ignoring`);
        return false;
      }
      return true;
    });
    prereqs.set(a.id, valid);
  }

  detectCycle(prereqs);

  // Memoized longest-path-from-root depth.
  const depthCache = new Map<string, number>();
  const depthOf = (id: string): number => {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const parents = prereqs.get(id) ?? [];
    const d = parents.length === 0 ? 0 : 1 + Math.max(...parents.map(depthOf));
    depthCache.set(id, d);
    return d;
  };

  let maxDepth = 0;
  for (const id of ids) maxDepth = Math.max(maxDepth, depthOf(id));
  const levels = maxDepth + 1;

  // Single level: everything is due at the window end.
  if (levels === 1) {
    const end = addDaysUTC(startDate, windowDays);
    const flat: Record<string, string> = {};
    for (const id of ids) flat[id] = end;
    return flat;
  }

  // Offset per depth level. Level 0 lands inside the window (not on day 0);
  // the final level lands on the window end. Then clamp to strictly increasing.
  const offsets: number[] = [];
  for (let l = 0; l < levels; l++) {
    let off = Math.round((windowDays * (l + 1)) / levels);
    if (l > 0) off = Math.max(off, offsets[l - 1] + 1);
    offsets.push(off);
  }

  const result: Record<string, string> = {};
  for (const id of ids) {
    result[id] = addDaysUTC(startDate, offsets[depthOf(id)]);
  }
  return result;
}

/** Kahn's algorithm — throws if the prerequisite graph is not a DAG. */
function detectCycle(prereqs: Map<string, string[]>): void {
  // Edge direction: prerequisite -> dependent. inDegree = number of prereqs.
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const id of prereqs.keys()) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }
  for (const [id, parents] of prereqs) {
    inDegree.set(id, parents.length);
    for (const p of parents) dependents.get(p)!.push(id);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);

  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited++;
    for (const child of dependents.get(id) ?? []) {
      const deg = inDegree.get(child)! - 1;
      inDegree.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  if (visited !== prereqs.size) {
    throw new Error("kickoffSchedule: prerequisite graph contains a cycle");
  }
}
