import { query } from "../db.js";

/**
 * Otter transcript routing: resolve a meeting's participant emails to a single
 * client or prospect by their dedicated `primary_email` (the founder's OWN email,
 * NOT contact_email/contact which may be a shared licensee address).
 *
 * Clients are matched first, then prospects. If more than one DISTINCT record
 * matches, the result is ambiguous and we return null so the transcript lands in
 * the Unassigned tray rather than being mis-filed.
 */
export type OtterTarget =
  | { kind: "client"; id: string; advisorId: string }
  | { kind: "prospect"; id: string; advisorId: string };

interface Row {
  id: string;
  advisor_id: string;
}

function distinct(rows: Row[]): Row[] {
  const seen = new Map<string, Row>();
  for (const r of rows) seen.set(r.id, r);
  return [...seen.values()];
}

export async function resolveTargetByEmail(
  participantEmails: string[]
): Promise<OtterTarget | null> {
  const emails = [
    ...new Set(
      participantEmails
        .map((e) => (e ?? "").trim().toLowerCase())
        .filter((e) => e.includes("@"))
    ),
  ];
  if (emails.length === 0) return null;

  // Clients first — exclude archived.
  const clientRows = distinct(
    (
      await query(
        `SELECT id, advisor_id FROM clients
          WHERE LOWER(primary_email) = ANY($1)
            AND (archived IS NULL OR archived = false)`,
        [emails]
      )
    ).rows as Row[]
  );
  if (clientRows.length === 1) {
    return { kind: "client", id: clientRows[0].id, advisorId: clientRows[0].advisor_id };
  }
  if (clientRows.length > 1) return null; // ambiguous → Unassigned

  // Then prospects.
  const prospectRows = distinct(
    (
      await query(
        `SELECT id, advisor_id FROM prospects WHERE LOWER(primary_email) = ANY($1)`,
        [emails]
      )
    ).rows as Row[]
  );
  if (prospectRows.length === 1) {
    return { kind: "prospect", id: prospectRows[0].id, advisorId: prospectRows[0].advisor_id };
  }
  return null;
}
