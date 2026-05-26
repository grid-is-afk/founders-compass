import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { query } from "../db.js";
import { supabase, STORAGE_BUCKET } from "../lib/supabase.js";
import { ingestDocument } from "../lib/ingestion.js";
import { generateAgenda, captureMeeting } from "../lib/meetingIntelligence.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { buildAgendaDocx, buildAgendaFilename } from "../lib/agendaDocx.js";
import { parseAgendaSections } from "../lib/agendaParser.js";
import { snapshotAgendaToDataRoom } from "../lib/agendaSnapshot.js";
import { safeTimezone } from "../lib/timezone.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["type", "date", "notes", "status", "agenda", "agenda_status"]);

const ALLOWED_TRANSCRIPT_EXTENSIONS = new Set([".pdf", ".txt", ".docx", ".doc"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TRANSCRIPT_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only PDF, TXT, DOCX files are allowed for transcripts.`));
    }
  },
});

const verifyClient = verifyClientAccess;

async function getMeetingAndVerify(meetingId: string, userId: string, userRole: string) {
  const mResult = await query("SELECT * FROM meetings WHERE id = $1", [meetingId]);
  if (mResult.rows.length === 0) return null;
  const meeting = mResult.rows[0];
  const ok = await verifyClient(meeting.client_id, userId, userRole);
  if (!ok) return null;
  return meeting;
}

// ── GET /api/meetings?client_id=xxx ──────────────────────────────────────────
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `SELECT m.*, d.name AS transcript_name
       FROM meetings m
       LEFT JOIN documents d ON d.id = m.transcript_document_id
       WHERE m.client_id = $1
       ORDER BY m.date DESC`,
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /meetings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/meetings ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { client_id, type, date, notes, status } = req.body;
  if (!client_id) {
    return res.status(400).json({ error: "client_id required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO meetings (client_id, type, date, notes, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [client_id, type ?? null, date ?? null, notes ?? null, status ?? "scheduled"]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /meetings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/meetings/:id ───────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const raw = req.body;
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (ALLOWED_COLUMNS.has(k)) fields[k] = raw[k];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const oldAgendaStatus = meeting.agenda_status as string | null;

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE meetings SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );

    const updated = result.rows[0];

    // Auto-snapshot the locked agenda into the Data Room on draft→final transition.
    // Best-effort: errors are logged but never block the PATCH response, because
    // the lock itself has already been persisted to the meetings row.
    if (
      oldAgendaStatus !== "final" &&
      updated.agenda_status === "final" &&
      updated.agenda
    ) {
      try {
        await snapshotAgendaToDataRoom(updated, req.user!.id);
      } catch (snapErr) {
        console.error(
          `Agenda snapshot failed for meeting ${updated.id}:`,
          snapErr
        );
      }
    }

    return res.json(updated);
  } catch (err) {
    console.error("PATCH /meetings/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/meetings/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    await query("DELETE FROM meetings WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /meetings/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/meetings/:id/agenda.docx (UC-01) ────────────────────────────────
// Download the meeting's agenda as a Word/Google-Docs-compatible .docx.
router.get("/:id/agenda.docx", async (req, res) => {
  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    if (!meeting.agenda) {
      return res.status(404).json({ error: "No agenda has been generated for this meeting" });
    }

    const sections = parseAgendaSections(meeting.agenda);
    if (sections.length === 0) {
      return res.status(500).json({ error: "Agenda data is empty or corrupted" });
    }

    const clientRes = await query("SELECT name FROM clients WHERE id = $1", [meeting.client_id]);
    const clientName = (clientRes.rows[0]?.name as string | undefined) ?? "Client";

    const tzHeader = safeTimezone(req.headers["x-user-timezone"]);
    const meetingDateLabel = meeting.date
      ? new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: tzHeader,
        }).format(new Date(meeting.date))
      : "Date TBD";

    const filenameDate = meeting.date
      ? new Date(meeting.date).toISOString().slice(0, 10)
      : "undated";

    const buffer = await buildAgendaDocx({
      clientName,
      meetingType: meeting.type ?? "Meeting",
      meetingDate: meetingDateLabel,
      sections,
    });

    const filename = buildAgendaFilename(clientName, filenameDate);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    return res.end(buffer);
  } catch (err) {
    console.error("GET /meetings/:id/agenda.docx error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/meetings/:id/generate-agenda (UC-01) ───────────────────────────
router.post("/:id/generate-agenda", async (req, res) => {
  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const sections = await generateAgenda(req.params.id, meeting.client_id, req.user!.id);
    const agendaText = JSON.stringify(sections);

    await query(
      `UPDATE meetings SET agenda = $1, agenda_status = 'draft', updated_at = NOW()
       WHERE id = $2`,
      [agendaText, req.params.id]
    );

    return res.json({ sections, agenda_status: "draft" });
  } catch (err) {
    console.error("POST /meetings/:id/generate-agenda error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/meetings/:id/capture (UC-03) ────────────────────────────────────
// Body: { notes: string } OR { document_id: string } (reference existing Data Room doc)
router.post("/:id/capture", async (req, res) => {
  const { notes, document_id } = req.body;

  if (!notes && !document_id) {
    return res.status(400).json({ error: "notes or document_id required" });
  }

  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    let captureText = notes as string;

    if (document_id) {
      // Pull text from an existing document's chunks
      const chunksRes = await query(
        `SELECT chunk_text FROM document_chunks
         WHERE document_id = $1
         ORDER BY chunk_index ASC
         LIMIT 50`,
        [document_id]
      );
      captureText = chunksRes.rows.map((r: { chunk_text: string }) => r.chunk_text).join("\n\n");
      if (!captureText) {
        return res.status(400).json({ error: "Document has no indexed content. Try uploading it as a transcript first." });
      }
    }

    const result = await captureMeeting(meeting.client_id, captureText, req.user!.id);

    // Save the capture notes to the meeting record
    await query(
      `UPDATE meetings SET capture_notes = $1, updated_at = NOW() WHERE id = $2`,
      [captureText.slice(0, 5000), req.params.id]
    );

    return res.json(result);
  } catch (err) {
    console.error("POST /meetings/:id/capture error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/meetings/:id/capture/apply (UC-03) ──────────────────────────────
// Body: { approved_changes: ProposedChange[], deferred_changes?: ProposedChange[] }
router.post("/:id/capture/apply", async (req, res) => {
  const { approved_changes, deferred_changes } = req.body;

  if (!Array.isArray(approved_changes)) {
    return res.status(400).json({ error: "approved_changes array required" });
  }

  const deferredArr = Array.isArray(deferred_changes) ? deferred_changes : [];
  if (approved_changes.length === 0 && deferredArr.length === 0) {
    return res.status(400).json({ error: "No changes to apply or defer" });
  }

  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const clientId = meeting.client_id;
    const createdTasks: unknown[] = [];
    const decisionsAndQuestions: Array<{ text: string; type: string; recorded_at: string }> = [];

    // Fetch approving advisor's name for attribution
    const advisorRes = await query(`SELECT name FROM users WHERE id = $1`, [req.user!.id]);
    const advisorName: string = advisorRes.rows[0]?.name ?? "Advisor";
    const captureDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const attribution = `\n[QB capture — ${captureDate}. Approved by ${advisorName}.]`;

    for (const change of approved_changes) {
      if (change.type === "new_task") {
        let assigneeId: string | null = null;
        if (change.suggested_assignee) {
          const userRes = await query(
            `SELECT id FROM users WHERE name = $1 LIMIT 1`,
            [change.suggested_assignee]
          );
          assigneeId = userRes.rows[0]?.id ?? null;
        }

        // Build notes: detail + optional dependencies + attribution
        const noteParts = [change.detail ?? null];
        if (change.suggested_dependencies) noteParts.push(`Dependencies: ${change.suggested_dependencies}`);
        noteParts.push(attribution);
        const taskNotes = noteParts.filter(Boolean).join("\n");

        const taskRes = await query(
          `INSERT INTO tasks (client_id, title, status, priority, due_date, phase, notes, assignee_id)
           VALUES ($1, $2, 'todo', 'medium', $3, $4, $5, $6)
           RETURNING *`,
          [clientId, change.title, change.suggested_due_date ?? null, change.suggested_phase ?? null, taskNotes, assigneeId]
        );
        createdTasks.push(taskRes.rows[0]);

        await query(
          `INSERT INTO activity_log (client_id, advisor_id, text) VALUES ($1, $2, $3)`,
          [clientId, req.user!.id, `QB capture: created task "${change.title}" from meeting notes`]
        );
      } else if (change.type === "task_update" && change.existing_task_id) {
        await query(
          `UPDATE tasks SET notes = CONCAT(COALESCE(notes, ''), $1), updated_at = NOW()
           WHERE id = $2 AND client_id = $3`,
          [`\n[From meeting — ${change.detail}]${attribution}`, change.existing_task_id, clientId]
        );
      } else if (change.type === "decision") {
        decisionsAndQuestions.push({
          text: change.detail ?? change.title,
          type: "decision",
          recorded_at: new Date().toISOString(),
        });
      } else if (change.type === "open_question") {
        // Gap 8: Store open questions alongside decisions in the meeting record
        decisionsAndQuestions.push({
          text: `[Open Question] ${change.title}: ${change.detail ?? ""}`,
          type: "open_question",
          recorded_at: new Date().toISOString(),
        });
      }
    }

    if (decisionsAndQuestions.length > 0) {
      await query(
        `UPDATE meetings
         SET decisions = decisions || $1::jsonb, processed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(decisionsAndQuestions), req.params.id]
      );
    } else {
      await query(
        `UPDATE meetings SET processed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    }

    // Persist deferred changes to meeting_deferred_changes table
    // Note: deferredArr is derived from deferred_changes before the try block (see early validation guard above)
    for (const change of deferredArr) {
      await query(
        `INSERT INTO meeting_deferred_changes
           (client_id, source_meeting_id, change_payload)
         VALUES ($1, $2, $3)`,
        [clientId, req.params.id, JSON.stringify(change)]
      );
    }

    return res.json({
      created_tasks: createdTasks,
      decisions_recorded: decisionsAndQuestions.filter((d) => d.type === "decision").length,
      open_questions_recorded: decisionsAndQuestions.filter((d) => d.type === "open_question").length,
      deferred_count: deferredArr.length,
    });
  } catch (err) {
    console.error("POST /meetings/:id/capture/apply error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/meetings/:id/transcript/check ────────────────────────────────────
// Check if a filename already exists in the client's Data Room
router.get("/:id/transcript/check", async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: "filename query param required" });

  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const result = await query(
      `SELECT id, name FROM documents WHERE client_id = $1 AND name = $2 LIMIT 1`,
      [meeting.client_id, filename]
    );

    return res.json({ exists: result.rows.length > 0, document: result.rows[0] ?? null });
  } catch (err) {
    console.error("GET /meetings/:id/transcript/check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/meetings/:id/transcript ─────────────────────────────────────────
// Upload a transcript file → ingest to Data Room + link to meeting
router.post(
  "/:id/transcript",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File exceeds the 25 MB limit." });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "A file is required" });

    try {
      const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const clientId = meeting.client_id as string;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = req.body.rename ?? req.file.originalname;

      const bucketPath = `clients/${clientId}/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(bucketPath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) throw uploadError;

      const sizeBytes = req.file.size;
      const sizeLabel =
        sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(0)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

      const docResult = await query(
        `INSERT INTO documents (client_id, name, category, subfolder, file_url, size, size_bytes, type, uploaded_by_role)
         VALUES ($1, $2, 'Meeting Notes', 'Meeting Transcripts', $3, $4, $5, 'document', 'advisor')
         RETURNING *`,
        [clientId, fileName, bucketPath, sizeLabel, sizeBytes]
      );
      const doc = docResult.rows[0];

      // Ingest for RAG
      await ingestDocument(doc.id, clientId, req.file.buffer, req.file.originalname);

      // Link to meeting
      await query(
        `UPDATE meetings SET transcript_document_id = $1, updated_at = NOW() WHERE id = $2`,
        [doc.id, req.params.id]
      );

      return res.status(201).json({ document: doc });
    } catch (err) {
      console.error("POST /meetings/:id/transcript error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /api/meetings/:id/deferred-carryforward (UC-03) ──────────────────────
// Returns pending deferred items for this meeting's client, excluding items
// that were themselves deferred from THIS meeting (no circular carry-forward).
router.get("/:id/deferred-carryforward", async (req, res) => {
  try {
    const meeting = await getMeetingAndVerify(req.params.id, req.user!.id, req.user!.role);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const result = await query(
      `SELECT
         mdc.id,
         mdc.source_meeting_id,
         mdc.change_payload,
         mdc.created_at,
         m.date AS source_meeting_date,
         m.type AS source_meeting_type
       FROM meeting_deferred_changes mdc
       JOIN meetings m ON m.id = mdc.source_meeting_id
       WHERE mdc.client_id = $1
         AND mdc.status = 'pending'
         AND mdc.source_meeting_id != $2
       ORDER BY mdc.created_at DESC`,
      [meeting.client_id, req.params.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /meetings/:id/deferred-carryforward error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
