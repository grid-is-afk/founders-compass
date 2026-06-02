import { query } from "../db.js";

/**
 * Parse the "Recommended Objectives for Q…" section out of a generated
 * review-prep markdown doc. Returns one trimmed objective string per list item.
 *
 * Defensive by design: AI markdown structure can drift, so this returns an
 * empty array (rather than throwing) when the section is absent or empty —
 * callers fall back to advisor manual entry.
 */
export function extractObjectivesFromMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n");
  const objectives: string[] = [];
  let inSection = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Any markdown heading toggles section membership: enter on the
    // "Recommended Objectives" heading, exit on the next heading.
    if (/^#{1,6}\s+/.test(line)) {
      inSection = /^#{1,6}\s+recommended objectives/i.test(line);
      continue;
    }

    if (!inSection || line === "") continue;

    // Strip list markers ("- ", "* ", "1. ", "1) ") and unwrap **bold**.
    const cleaned = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .trim();

    // Skip any leftover placeholder/instruction lines.
    if (cleaned && !cleaned.startsWith("[")) objectives.push(cleaned);
  }

  return objectives;
}

/**
 * Sync AI-extracted objectives for a client+quarter slot. Replaces the prior
 * auto-extracted proposals (so regenerating the review-prep refreshes them)
 * but never touches advisor-entered or already-confirmed rows.
 *
 * Returns the number of proposals inserted.
 */
export async function syncExtractedObjectives(params: {
  clientId: string;
  quarter: number;
  year: number;
  titles: string[];
}): Promise<number> {
  const { clientId, quarter, year, titles } = params;

  // Clear only previously auto-extracted, still-proposed rows for this slot.
  await query(
    `DELETE FROM quarterly_objectives
       WHERE client_id = $1 AND quarter = $2 AND year = $3
         AND source = 'extracted' AND status = 'proposed'`,
    [clientId, quarter, year]
  );

  let inserted = 0;
  for (let i = 0; i < titles.length; i++) {
    await query(
      `INSERT INTO quarterly_objectives
         (client_id, quarter, year, title, status, source, sort_order)
       VALUES ($1, $2, $3, $4, 'proposed', 'extracted', $5)`,
      [clientId, quarter, year, titles[i], i]
    );
    inserted++;
  }

  return inserted;
}

/**
 * Promote a client-approved review prep's objectives to the confirmed set.
 * Called when a review-prep deliverable transitions to 'client_approved' — the
 * founder has agreed, so the FINAL (possibly advisor-edited) doc is authoritative.
 *
 * Re-extracts from the final content and replaces the slot's auto-extracted rows
 * with 'confirmed' ones. Advisor-entered rows (source='advisor') are preserved.
 * Returns the number of confirmed objectives written.
 */
export async function confirmExtractedObjectives(params: {
  clientId: string;
  quarter: number;
  year: number;
  titles: string[];
}): Promise<number> {
  const { clientId, quarter, year, titles } = params;

  // Refresh the extracted set from the final doc — drop prior extracted rows
  // (proposed or confirmed) for this slot; keep advisor-entered ones.
  await query(
    `DELETE FROM quarterly_objectives
       WHERE client_id = $1 AND quarter = $2 AND year = $3 AND source = 'extracted'`,
    [clientId, quarter, year]
  );

  let inserted = 0;
  for (let i = 0; i < titles.length; i++) {
    await query(
      `INSERT INTO quarterly_objectives
         (client_id, quarter, year, title, status, source, sort_order)
       VALUES ($1, $2, $3, $4, 'confirmed', 'extracted', $5)`,
      [clientId, quarter, year, titles[i], i]
    );
    inserted++;
  }

  return inserted;
}
