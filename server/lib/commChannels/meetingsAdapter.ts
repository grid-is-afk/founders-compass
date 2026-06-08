import { query } from "../../db.js";
import type { ChannelAdapter, NormalizedCommEvent } from "./types.js";

// ============================================================
// Meetings adapter — LIVE NOW.
//
// The first real channel: it reads communication content we already capture
// (post-meeting capture notes, plain notes, and recorded decisions) and maps
// each meeting to one normalized event. This is why UC-04 produces real output
// today, before any Gmail/Zoom/WhatsApp credentials exist.
//
// Source of truth: the `meetings` table (capture_notes / notes / decisions,
// added by add_meetings_intelligence.ts). We deliberately do NOT crack open the
// linked transcript document here — capture_notes is the human-synthesized
// summary, which is the right grain for topic synthesis. Pulling raw transcript
// chunks can be a later enhancement without touching the seam.
// ============================================================

interface MeetingRow {
  id: string;
  type: string | null;
  date: string | null;
  created_at: string;
  notes: string | null;
  capture_notes: string | null;
  decisions: unknown;
}

/** Flatten the decisions JSONB (array of strings or {text}-ish objects) to lines. */
function decisionsToText(decisions: unknown): string {
  if (!Array.isArray(decisions)) return "";
  const lines = decisions
    .map((d) => {
      if (typeof d === "string") return d.trim();
      if (d && typeof d === "object") {
        const obj = d as Record<string, unknown>;
        const text = obj.text ?? obj.decision ?? obj.label;
        return typeof text === "string" ? text.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
  return lines.length ? `Decisions:\n- ${lines.join("\n- ")}` : "";
}

export const meetingsAdapter: ChannelAdapter = {
  channel: "meeting",

  // Always available — it reads data we already store, no external creds.
  isAvailable() {
    return true;
  },

  async backfill(clientId: string, since: Date): Promise<NormalizedCommEvent[]> {
    const result = await query(
      `SELECT id, type, date, created_at, notes, capture_notes, decisions
         FROM meetings
        WHERE client_id = $1
          AND status <> 'cancelled'
          AND COALESCE(date, created_at) >= $2
        ORDER BY COALESCE(date, created_at) ASC`,
      [clientId, since.toISOString()]
    );

    const events: NormalizedCommEvent[] = [];
    for (const row of result.rows as MeetingRow[]) {
      // Prefer the synthesized capture note; fall back to plain notes. Always
      // append decisions so commitments made in the room reach the digest.
      const parts = [
        (row.capture_notes ?? row.notes ?? "").trim(),
        decisionsToText(row.decisions),
      ].filter(Boolean);
      const bodyText = parts.join("\n\n").trim();

      // Nothing to synthesize from this meeting — skip it (no empty rows).
      if (!bodyText) continue;

      const occurredAt = new Date(row.date ?? row.created_at);
      const type = row.type?.trim() || "Meeting";

      events.push({
        clientId,
        channel: "meeting",
        direction: "internal",
        occurredAt,
        sender: null,
        participants: [],
        subject: type,
        bodyText,
        sourceRef: `meeting:${row.id}`,
        metadata: { type },
      });
    }
    return events;
  },
};
