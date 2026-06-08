/**
 * Role display labels — single source of truth for Katie's nomenclature.
 *
 * Internal role slugs (in the DB / JWT / auth guards) are NEVER renamed — only what
 * users see changes here:
 *   - licensee          → "Advisor"  (CEPA who manages their own business-owner clients)
 *   - advisor / admin   → "Admin"    (TFO internal staff)
 *   - client            → "Client"   (business owner / founder)
 *
 * Accepted dev-vs-user mismatch: the TFO portal lives at /advisor but is labeled "Admin";
 * the licensee portal lives at /licensee but is labeled "Advisor". This is intentional —
 * relabeling text is safe, renaming the role string across the auth layer is not.
 */

export type RoleSlug = "advisor" | "admin" | "client" | "licensee";

const ROLE_LABELS: Record<string, string> = {
  licensee: "Advisor",
  advisor: "Admin",
  admin: "Admin",
  client: "Client",
};

/** Human-facing label for a role slug. Falls back to a capitalized slug if unknown. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/** Post-login landing route for a role slug. */
export function roleHome(role: string | null | undefined): string {
  switch (role) {
    case "licensee":
      return "/licensee";
    case "client":
      return "/client";
    default:
      return "/advisor";
  }
}
