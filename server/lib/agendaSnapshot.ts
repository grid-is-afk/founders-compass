import { query } from "../db.js";
import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { ingestDocument } from "./ingestion.js";
import { buildAgendaDocx, buildAgendaFilename } from "./agendaDocx.js";
import { parseAgendaSections } from "./agendaParser.js";
import { safeTimezone } from "./timezone.js";

export interface AgendaSnapshotMeeting {
  id: string;
  client_id: string;
  type: string | null;
  date: string | null;
  agenda: string | null;
  agenda_status: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Save the meeting's locked agenda as a .docx in the client's Data Room
 * under the "Meeting Agendas" folder. Idempotent: re-locking the same
 * meeting upserts the existing document row and replaces its embedding
 * chunks via ingestDocument.
 *
 * Throws on hard failures (Supabase upload error, DB write error). Callers
 * should wrap this in best-effort try/catch — the agenda lock itself has
 * already been committed by the time this runs.
 */
export async function snapshotAgendaToDataRoom(
  meeting: AgendaSnapshotMeeting,
  advisorId: string
): Promise<void> {
  if (!meeting.agenda) {
    console.warn(`Agenda snapshot skipped: meeting ${meeting.id} has no agenda content`);
    return;
  }

  const sections = parseAgendaSections(meeting.agenda);
  if (sections.length === 0) {
    console.warn(`Agenda snapshot skipped: meeting ${meeting.id} agenda parsed to zero sections`);
    return;
  }

  const [clientRes, advisorRes] = await Promise.all([
    query("SELECT name FROM clients WHERE id = $1", [meeting.client_id]),
    query("SELECT timezone FROM users WHERE id = $1", [advisorId]),
  ]);
  const clientName = (clientRes.rows[0]?.name as string | undefined) ?? "Client";
  const advisorTimezone = safeTimezone(advisorRes.rows[0]?.timezone);

  const meetingDateLabel = meeting.date
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: advisorTimezone,
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

  // Deterministic bucket path keyed by meeting ID — upsert overwrites the
  // same object on re-lock, so we never accumulate orphaned files.
  const bucketPath = `clients/${meeting.client_id}/agendas/${meeting.id}.docx`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(bucketPath, buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  await query(
    `INSERT INTO data_room_folders (client_id, category, name)
     VALUES ($1, 'Meeting Agendas', 'Meeting Agendas')
     ON CONFLICT (client_id, category, name) DO NOTHING`,
    [meeting.client_id]
  );

  const sizeBytes = buffer.length;
  const sizeLabel = formatBytes(sizeBytes);

  const existing = await query(
    `SELECT id FROM documents
       WHERE source_meeting_id = $1 AND category = 'Meeting Agendas'
       LIMIT 1`,
    [meeting.id]
  );

  let docId: string;
  if (existing.rows.length > 0) {
    docId = existing.rows[0].id as string;
    await query(
      `UPDATE documents
         SET name = $1, file_url = $2, size = $3, size_bytes = $4, uploaded_at = NOW()
       WHERE id = $5`,
      [filename, bucketPath, sizeLabel, sizeBytes, docId]
    );
  } else {
    const inserted = await query(
      `INSERT INTO documents
         (client_id, name, category, file_url, size, size_bytes, type, uploaded_by_role, source_meeting_id)
       VALUES ($1, $2, 'Meeting Agendas', $3, $4, $5, 'document', 'advisor', $6)
       RETURNING id`,
      [meeting.client_id, filename, bucketPath, sizeLabel, sizeBytes, meeting.id]
    );
    docId = inserted.rows[0].id as string;
  }

  // Re-ingest. ingestDocument deletes the existing chunks for this doc before
  // inserting new ones, so re-locks replace rather than duplicate.
  await ingestDocument(docId, meeting.client_id);
}
