import { Router, type Request, type Response } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { syncClientEvents } from "../lib/commChannels/index.js";
import {
  computeDigestEvents,
  synthesizeDigest,
  type DigestTopic,
} from "../lib/commDigest.js";

// ============================================================
// UC-04 — Cross-channel communication synthesis.
//
// On-demand (and weekly-ready) topic digest of a client's communications across
// channels. TFO-only: the client role is blocked at the route layer, and every
// request additionally verifies the caller may access THIS client (404 on miss,
// matching the codebase's privacy convention — never reveal a client exists).
// ============================================================

const router = Router();

// Block the client role — digests are an advisor/admin tool.
function requireStaff(req: Request, res: Response): boolean {
  if (req.user!.role === "client") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

async function ensureClientAccess(req: Request, res: Response, clientId: string): Promise<boolean> {
  if (!(await verifyClientAccess(clientId, req.user!.id, req.user!.role))) {
    res.status(404).json({ error: "Client not found" });
    return false;
  }
  return true;
}

const DAY_MS = 86400000;

/**
 * Resolve the [start, end] window from the request body.
 *   { range: 'week' }                 → last 7 days
 *   { periodStart, periodEnd }        → explicit (periodEnd inclusive)
 *   (nothing)                         → last 30 days (default)
 */
function resolveWindow(body: {
  range?: string;
  periodStart?: string;
  periodEnd?: string;
}): { start: Date; end: Date } | null {
  if (body.range === "week") {
    const end = new Date();
    return { start: new Date(end.getTime() - 7 * DAY_MS), end };
  }
  if (body.periodStart && body.periodEnd) {
    const start = new Date(body.periodStart);
    const end = new Date(body.periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
    end.setHours(23, 59, 59, 999); // make periodEnd inclusive
    return { start, end };
  }
  const end = new Date();
  return { start: new Date(end.getTime() - 30 * DAY_MS), end };
}

/** YYYY-MM-DD for DATE columns. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------
// POST /api/communications/:clientId/digest — sync channels, pull events in the
// window, synthesize by topic, store, and return the digest.
// ------------------------------------------------------------
router.post("/:clientId/digest", async (req, res) => {
  if (!requireStaff(req, res)) return;
  const { clientId } = req.params;
  if (!(await ensureClientAccess(req, res, clientId))) return;

  const window = resolveWindow(req.body ?? {});
  if (!window) {
    return res.status(400).json({ error: "Invalid date range" });
  }
  const { start, end } = window;

  try {
    // Pull the latest from every available channel into communication_events
    // (idempotent), then synthesize from the normalized store.
    const sync = await syncClientEvents(clientId, start);
    const events = await computeDigestEvents(clientId, start, end);
    const topics: DigestTopic[] = await synthesizeDigest(events);

    const sourceChannels = [...new Set(events.map((e) => e.channel))];

    const inserted = await query(
      `INSERT INTO communication_digests
         (client_id, period_start, period_end, topics, source_channels, event_count, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, client_id, period_start, period_end, topics, source_channels,
                 event_count, generated_by, generated_at`,
      [
        clientId,
        toDateStr(start),
        toDateStr(end),
        JSON.stringify(topics),
        sourceChannels,
        events.length,
        req.user!.id,
      ]
    );

    return res.json({
      digest: inserted.rows[0],
      channelsRun: sync.channelsRun,
      channelsPending: sync.channelsPending,
    });
  } catch (err) {
    console.error("POST /communications/:clientId/digest error:", err);
    return res.status(500).json({ error: "Digest generation failed" });
  }
});

// ------------------------------------------------------------
// GET /api/communications/:clientId/digests — stored digests, newest first.
// ------------------------------------------------------------
router.get("/:clientId/digests", async (req, res) => {
  if (!requireStaff(req, res)) return;
  const { clientId } = req.params;
  if (!(await ensureClientAccess(req, res, clientId))) return;

  try {
    const result = await query(
      `SELECT id, client_id, period_start, period_end, topics, source_channels,
              event_count, generated_by, generated_at
         FROM communication_digests
        WHERE client_id = $1
        ORDER BY generated_at DESC`,
      [clientId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /communications/:clientId/digests error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------------------------------------------
// GET /api/communications/:clientId/events — raw normalized events in a window
// (transparency / debugging). ?days=30 (default) bounds the lookback.
// ------------------------------------------------------------
router.get("/:clientId/events", async (req, res) => {
  if (!requireStaff(req, res)) return;
  const { clientId } = req.params;
  if (!(await ensureClientAccess(req, res, clientId))) return;

  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const start = new Date(Date.now() - days * DAY_MS);

  try {
    const result = await query(
      `SELECT id, channel, direction, occurred_at, sender, subject, source_ref
         FROM communication_events
        WHERE client_id = $1 AND occurred_at >= $2
        ORDER BY occurred_at DESC`,
      [clientId, start.toISOString()]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /communications/:clientId/events error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
