import { query } from "../db.js";

/**
 * Checks whether the requesting user is allowed to access a given client.
 *
 * Rules (mirrors the clients list route):
 *   - admin        → always yes
 *   - advisor/team with see_all_clients = true  → always yes
 *   - advisor/team with see_all_clients = false → only their own clients (advisor_id match)
 *   - client role  → only their own account (user_id match)
 */
export async function verifyClientAccess(
  clientId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "admin") {
    const r = await query(`SELECT id FROM clients WHERE id = $1`, [clientId]);
    return r.rows.length > 0;
  }

  if (userRole !== "client") {
    // Licensees are ALWAYS scoped to their own clients — never honor see_all_clients for them.
    const seeAll =
      userRole === "licensee"
        ? false
        : (
            await query(`SELECT see_all_clients FROM users WHERE id = $1`, [userId])
          ).rows[0]?.see_all_clients ?? true;
    if (seeAll) {
      const r = await query(`SELECT id FROM clients WHERE id = $1`, [clientId]);
      return r.rows.length > 0;
    }
    // Own-only advisor
    const r = await query(
      `SELECT id FROM clients WHERE id = $1 AND advisor_id = $2`,
      [clientId, userId]
    );
    return r.rows.length > 0;
  }

  // Client role — can only access their own account
  const r = await query(
    `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
    [clientId, userId]
  );
  return r.rows.length > 0;
}
