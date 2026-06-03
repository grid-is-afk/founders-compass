// ============================================================
// UC-04 — Channel adapter seam (shared contract)
//
// Every communication channel (meetings now; gmail → zoom → whatsapp once Aakash
// provisions credentials) is reduced to ONE shape: NormalizedCommEvent. An
// adapter's only job is "read my source → return NormalizedCommEvent[]". The
// synthesis engine and the digests UI read the normalized `communication_events`
// table exclusively and never learn that Gmail or Zoom exist. Adding a channel
// later = writing one adapter; nothing downstream changes.
// ============================================================

export type CommChannel = "meeting" | "gmail" | "zoom" | "whatsapp";
export type CommDirection = "inbound" | "outbound" | "internal";

/**
 * One normalized communication, channel-agnostic. Adapters produce these; the
 * registry upserts them into `communication_events` (deduped by
 * client_id + channel + sourceRef, so re-syncing is idempotent).
 */
export interface NormalizedCommEvent {
  clientId: string;
  channel: CommChannel;
  /** inbound/outbound only make sense for true 2-party channels; meetings are 'internal'. */
  direction: CommDirection | null;
  occurredAt: Date;
  sender: string | null;
  participants: string[];
  subject: string | null;
  /** The synthesizable text. Never empty — adapters skip rows with no content. */
  bodyText: string;
  /** Stable id within the channel (e.g. `meeting:<uuid>`, gmail message id). Drives dedupe. */
  sourceRef: string;
  /** Anything channel-specific worth keeping (e.g. meeting type, gmail thread id). */
  metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
  channel: CommChannel;
  /**
   * Whether this adapter can run right now. Live channels return false until
   * their credentials are provisioned (gmail/zoom/whatsapp); meetings is always
   * available because it reads data we already store.
   */
  isAvailable(): boolean;
  /**
   * Pull this channel's communications for one client since `since` and return
   * them normalized. Must be safe to call repeatedly (dedupe is handled on
   * upsert via sourceRef). Should never throw for "no data" — return [].
   */
  backfill(clientId: string, since: Date): Promise<NormalizedCommEvent[]>;
}
