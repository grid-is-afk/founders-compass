import { Router, type Request, type Response } from "express";
import { query } from "../db.js";
import "../middleware/auth.js"; // brings in the Express.Request.user augmentation
import { resolveTargetByEmail } from "../lib/otterMatch.js";
import { saveTranscriptToDataRoom } from "../lib/transcriptStore.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

// ─────────────────────────────────────────────────────────────────────────────
// Payload parsing — Zapier maps Otter fields into whatever keys are configured,
// so accept a tolerant set of aliases and normalize.
// ─────────────────────────────────────────────────────────────────────────────
function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function firstString(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const s = asString(body[k]);
    if (s) return s;
  }
  return null;
}

function extractEmails(body: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") {
      // split comma/semicolon/whitespace-separated lists
      for (const part of v.split(/[,;\s]+/)) {
        if (part.includes("@")) out.push(part.trim());
      }
    } else if (v && typeof v === "object") {
      const email = (v as Record<string, unknown>).email;
      if (typeof email === "string" && email.includes("@")) out.push(email.trim());
    }
  };
  for (const key of ["participant_emails", "participants", "emails", "attendees", "speakers"]) {
    const val = body[key];
    if (Array.isArray(val)) val.forEach(push);
    else if (val != null) push(val);
  }
  return [...new Set(out.map((e) => e.toLowerCase()))];
}

function parseDate(body: Record<string, unknown>): Date | null {
  const raw = firstString(body, ["start_time", "started_at", "occurred_at", "date", "created_at"]);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC webhook (called by Zapier) — no JWT; gated by a shared secret instead.
// ═════════════════════════════════════════════════════════════════════════════
export const otterWebhookRouter = Router();

otterWebhookRouter.post("/webhook", async (req, res) => {
  const secret = process.env.OTTER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Otter webhook hit but OTTER_WEBHOOK_SECRET is not configured.");
    return res.status(503).json({ error: "Integration not configured" });
  }
  const provided =
    req.get("x-otter-secret") ||
    (typeof req.query.secret === "string" ? req.query.secret : undefined);
  if (provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const conversationId = firstString(body, [
    "otter_conversation_id",
    "conversation_id",
    "speech_id",
    "id",
  ]);
  const transcript = firstString(body, ["transcript_text", "transcript", "text", "otl"]);
  const title = firstString(body, ["title", "meeting_title", "name"]) ?? "Untitled Otter transcript";

  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversation id" });
  }
  if (!transcript) {
    // No transcript text in the payload — likely the trigger only carries a link.
    // Record nothing and signal so the Zap can be reconfigured.
    return res.status(422).json({
      error: "No transcript text in payload",
      hint: "Map Otter's full transcript text into the Zap, or use the email-export source.",
    });
  }

  try {
    const emails = extractEmails(body);
    const occurredAt = parseDate(body);

    // Claim the conversation atomically FIRST. The unique index means a
    // re-delivery (Zapier retry / double-fire) gets zero rows back and we no-op,
    // so a transcript can never be filed — or a document created — twice.
    const claim = await query(
      `INSERT INTO otter_inbox
         (otter_conversation_id, title, participants, occurred_at, transcript_text,
          matched_target, status)
       VALUES ($1, $2, $3, $4, $5, 'none', 'pending')
       ON CONFLICT (otter_conversation_id) DO NOTHING
       RETURNING id`,
      [conversationId, title, JSON.stringify(emails), occurredAt, transcript]
    );
    if (claim.rows.length === 0) {
      return res.json({ status: "duplicate" });
    }
    const inboxId = claim.rows[0].id as string;

    const target = await resolveTargetByEmail(emails);

    if (target) {
      const documentId = await saveTranscriptToDataRoom({
        clientId: target.kind === "client" ? target.id : null,
        prospectId: target.kind === "prospect" ? target.id : null,
        title,
        text: transcript,
        occurredAt,
      });
      // Filed → release the held text (it now lives in the Data Room document).
      await query(
        `UPDATE otter_inbox
            SET advisor_id = $2, matched_target = $3, matched_id = $4,
                document_id = $5, status = 'filed', transcript_text = NULL, filed_at = NOW()
          WHERE id = $1`,
        [inboxId, target.advisorId, target.kind, target.id, documentId]
      );
      return res.json({ status: "filed", target: target.kind });
    }

    // Unmatched → the row stays 'pending' with the held text for manual assign.
    return res.json({ status: "unassigned" });
  } catch (err) {
    console.error("POST /integrations/otter/webhook error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// AUTH-gated inbox management (advisors/admins only — never clients/licensees).
// ═════════════════════════════════════════════════════════════════════════════
export const otterInboxRouter = Router();

function ensureStaff(req: Request, res: Response): boolean {
  const role = req.user!.role;
  if (role === "client" || role === "licensee") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// Admins see every pending transcript; advisors see their own + any unassigned.
function pendingScope(req: Request): { sql: string; params: unknown[] } {
  if (req.user!.role === "admin") {
    return { sql: `status = 'pending'`, params: [] };
  }
  return {
    sql: `status = 'pending' AND (advisor_id = $1 OR advisor_id IS NULL)`,
    params: [req.user!.id],
  };
}

otterInboxRouter.get("/inbox", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  try {
    const { sql, params } = pendingScope(req);
    const result = await query(
      `SELECT id, otter_conversation_id, title, participants, occurred_at, created_at
         FROM otter_inbox
        WHERE ${sql}
        ORDER BY created_at DESC`,
      params
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /integrations/otter/inbox error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

otterInboxRouter.get("/inbox/count", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  try {
    const { sql, params } = pendingScope(req);
    const result = await query(
      `SELECT COUNT(*)::int AS count FROM otter_inbox WHERE ${sql}`,
      params
    );
    return res.json({ count: result.rows[0].count as number });
  } catch (err) {
    console.error("GET /integrations/otter/inbox/count error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Assign a pending transcript to a client or prospect → files it into that Data
// Room and marks the inbox row filed.
otterInboxRouter.post("/inbox/:id/assign", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const { target, target_id } = req.body as { target?: string; target_id?: string };
  if ((target !== "client" && target !== "prospect") || !target_id) {
    return res.status(400).json({ error: "target ('client'|'prospect') and target_id are required" });
  }

  try {
    const rowResult = await query(
      `SELECT title, transcript_text, occurred_at, status
         FROM otter_inbox WHERE id = $1`,
      [req.params.id]
    );
    if (rowResult.rows.length === 0) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    const row = rowResult.rows[0] as {
      title: string | null;
      transcript_text: string | null;
      occurred_at: Date | null;
      status: string;
    };
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Transcript already filed" });
    }
    if (!row.transcript_text) {
      return res.status(409).json({ error: "Transcript text is no longer available" });
    }

    // Access control on the chosen target.
    if (target === "client") {
      if (!(await verifyClientAccess(target_id, req.user!.id, req.user!.role))) {
        return res.status(404).json({ error: "Client not found" });
      }
    } else {
      const ok = await query(
        req.user!.role === "admin"
          ? `SELECT id FROM prospects WHERE id = $1`
          : `SELECT id FROM prospects WHERE id = $1 AND advisor_id = $2`,
        req.user!.role === "admin" ? [target_id] : [target_id, req.user!.id]
      );
      if (ok.rows.length === 0) {
        return res.status(404).json({ error: "Prospect not found" });
      }
    }

    const documentId = await saveTranscriptToDataRoom({
      clientId: target === "client" ? target_id : null,
      prospectId: target === "prospect" ? target_id : null,
      title: row.title ?? "Otter transcript",
      text: row.transcript_text,
      occurredAt: row.occurred_at,
    });

    await query(
      `UPDATE otter_inbox
          SET status = 'filed', matched_target = $2, matched_id = $3,
              document_id = $4, transcript_text = NULL, filed_at = NOW()
        WHERE id = $1`,
      [req.params.id, target, target_id, documentId]
    );

    return res.json({ ok: true, documentId });
  } catch (err) {
    console.error("POST /integrations/otter/inbox/:id/assign error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
