import { query } from "../db.js";

/**
 * Verify that a client belongs to the requesting advisor.
 * Sends a 403 response and returns false if the check fails,
 * so callers can do: `if (!await requireClientOwnership(...)) return;`
 */
export async function requireClientOwnership(
  res: import("express").Response,
  clientId: string,
  advisorId: string
): Promise<boolean> {
  const check = await query(
    "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
    [clientId, advisorId]
  );
  if (check.rows.length === 0) {
    res.status(403).json({ error: "Client not found or access denied" });
    return false;
  }
  return true;
}
