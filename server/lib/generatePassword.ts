import { randomInt } from "crypto";

// Readable alphabet — excludes ambiguous chars (0/O, 1/l/I) so generated
// credentials are easy to read aloud / copy without confusion.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

/** Pick one random char from a set using a cryptographically secure RNG. */
function pick(set: string): string {
  return set.charAt(randomInt(set.length));
}

/**
 * Generate a strong, system-issued password.
 *
 * Default 14 chars from a no-ambiguous-character alphabet, drawn with Node's
 * crypto RNG (not Math.random). Guarantees at least one uppercase, one
 * lowercase, and one digit, then shuffles so the guaranteed chars aren't always
 * in the same positions. Used for every account the platform creates (admin /
 * advisor / licensee / client) — no user ever chooses their own password, so
 * weak passwords cannot enter the system.
 */
export function generatePassword(length = 14): string {
  // Start with one of each required class so complexity is always satisfied.
  const chars: string[] = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  for (let i = chars.length; i < length; i++) {
    chars.push(pick(ALL));
  }
  // Fisher–Yates shuffle with a secure RNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
