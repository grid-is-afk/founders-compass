import type { ChannelAdapter, NormalizedCommEvent } from "./types.js";

// ============================================================
// Zoom adapter — STUB (channel #2 in Katie's order: Gmail → Zoom → WhatsApp).
//
// BLOCKED ON AAKASH.
//
// What Aakash must provision (a Zoom Server-to-Server OAuth app):
//   • Scopes for cloud recordings + in-meeting chat transcripts
//     (recording:read, meeting:read, chat:read as applicable).
//   • Env: ZOOM_S2S_ACCOUNT_ID, ZOOM_S2S_CLIENT_ID, ZOOM_S2S_CLIENT_SECRET.
//     isAvailable() flips to true once these are present.
//
// When live: pull meeting chat + recording transcripts in [since, now], map
// each to a NormalizedCommEvent (channel:'zoom', sourceRef = zoom meeting/uuid).
// ============================================================

function hasZoomCredentials(): boolean {
  return Boolean(
    process.env.ZOOM_S2S_ACCOUNT_ID &&
      process.env.ZOOM_S2S_CLIENT_ID &&
      process.env.ZOOM_S2S_CLIENT_SECRET
  );
}

export const zoomAdapter: ChannelAdapter = {
  channel: "zoom",

  isAvailable() {
    return hasZoomCredentials();
  },

  async backfill(_clientId: string, _since: Date): Promise<NormalizedCommEvent[]> {
    return [];
  },
};
