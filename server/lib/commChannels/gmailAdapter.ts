import type { ChannelAdapter, NormalizedCommEvent } from "./types.js";

// ============================================================
// Gmail adapter — STUB (channel #1 in Katie's order: Gmail → Zoom → WhatsApp).
//
// BLOCKED ON AAKASH. Activating this only requires filling in the live read;
// the seam means nothing downstream changes when it goes live.
//
// What Aakash must provision (a Google Cloud project + OAuth consent):
//   • Scopes:  https://www.googleapis.com/auth/gmail.readonly
//              (+ calendar.readonly / calendar.events.readonly — SAME consent,
//               so one "Sign in with Google" covers Gmail AND the Calendar work)
//   • Domain-wide delegation OR per-advisor OAuth refresh tokens, so the server
//     can read the relevant mailbox on the firm's behalf.
//   • Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and the stored
//     refresh token(s). isAvailable() flips to true once these are present.
//
// When live: list messages in [since, now] for the client's known stakeholder
// emails, map each to a NormalizedCommEvent (channel:'gmail', direction by
// from/to, sourceRef = gmail message id, subject/body from the payload).
// ============================================================

function hasGmailCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

export const gmailAdapter: ChannelAdapter = {
  channel: "gmail",

  isAvailable() {
    return hasGmailCredentials();
  },

  async backfill(_clientId: string, _since: Date): Promise<NormalizedCommEvent[]> {
    // Pending credentials — never runs while isAvailable() is false.
    return [];
  },
};
