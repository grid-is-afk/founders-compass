import type { ChannelAdapter, NormalizedCommEvent } from "./types.js";

// ============================================================
// WhatsApp adapter — STUB (channel #3 in Katie's order: Gmail → Zoom → WhatsApp).
//
// BLOCKED ON AAKASH.
//
// What Aakash must provision (WhatsApp Business / Cloud API):
//   • A WhatsApp Business account + Meta app with messaging permissions.
//   • Env: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID (or BSP equivalent).
//     isAvailable() flips to true once these are present.
//
// Interim source available NOW (not wired): a manual export already lives at
//   Reference/Meeting Transcripts/TFO - Katie Whatsapp Messages.txt
// A file-import variant of this adapter could parse that export into events
// before the live API exists — a fast follow if the team wants WhatsApp content
// in digests sooner.
//
// When live: pull messages in [since, now] for the client's known numbers, map
// each to a NormalizedCommEvent (channel:'whatsapp', sourceRef = message id).
// ============================================================

function hasWhatsappCredentials(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  isAvailable() {
    return hasWhatsappCredentials();
  },

  async backfill(_clientId: string, _since: Date): Promise<NormalizedCommEvent[]> {
    return [];
  },
};
