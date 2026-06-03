import { query } from "../../db.js";
import type { ChannelAdapter, CommChannel } from "./types.js";
import { meetingsAdapter } from "./meetingsAdapter.js";
import { gmailAdapter } from "./gmailAdapter.js";
import { zoomAdapter } from "./zoomAdapter.js";
import { whatsappAdapter } from "./whatsappAdapter.js";

// ============================================================
// Adapter registry + sync.
//
// The ONLY place that knows the set of channels. syncClientEvents() runs every
// AVAILABLE adapter for a client and upserts the results into
// communication_events. The unique (client_id, channel, source_ref) index makes
// it idempotent: re-running refreshes content instead of duplicating it.
// ============================================================

// Order mirrors Katie's integration sequence: Gmail → Zoom → WhatsApp.
// (meetings leads because it is the one channel live today.)
const ADAPTERS: ChannelAdapter[] = [
  meetingsAdapter,
  gmailAdapter,
  zoomAdapter,
  whatsappAdapter,
];

export interface SyncResult {
  /** Channels that actually ran (had credentials / were available). */
  channelsRun: CommChannel[];
  /** Channels skipped because they're not yet provisioned. */
  channelsPending: CommChannel[];
  /** Total events upserted across all adapters this run. */
  eventsUpserted: number;
}

/**
 * Pull + upsert all available channels' communications for one client since
 * `since`. Each adapter is isolated: one failing channel logs and is skipped, it
 * never aborts the others or the digest.
 */
export async function syncClientEvents(
  clientId: string,
  since: Date
): Promise<SyncResult> {
  const channelsRun: CommChannel[] = [];
  const channelsPending: CommChannel[] = [];
  let eventsUpserted = 0;

  for (const adapter of ADAPTERS) {
    if (!adapter.isAvailable()) {
      channelsPending.push(adapter.channel);
      continue;
    }
    try {
      const events = await adapter.backfill(clientId, since);
      for (const e of events) {
        await query(
          `INSERT INTO communication_events
             (client_id, channel, direction, occurred_at, sender, participants,
              subject, body_text, source_ref, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (client_id, channel, source_ref) DO UPDATE SET
             direction    = EXCLUDED.direction,
             occurred_at  = EXCLUDED.occurred_at,
             sender       = EXCLUDED.sender,
             participants = EXCLUDED.participants,
             subject      = EXCLUDED.subject,
             body_text    = EXCLUDED.body_text,
             metadata     = EXCLUDED.metadata`,
          [
            e.clientId,
            e.channel,
            e.direction,
            e.occurredAt.toISOString(),
            e.sender,
            e.participants,
            e.subject,
            e.bodyText,
            e.sourceRef,
            JSON.stringify(e.metadata ?? {}),
          ]
        );
        eventsUpserted += 1;
      }
      channelsRun.push(adapter.channel);
    } catch (err) {
      console.error(`commChannels: ${adapter.channel} adapter failed:`, err);
      // Keep going — a broken channel must not sink the whole sync.
    }
  }

  return { channelsRun, channelsPending, eventsUpserted };
}
