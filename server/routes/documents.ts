import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { query } from "../db.js";

const router = Router();

// ── Upload directory setup ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 25 * 1024 * 1024;        // 25 MB per file
const MAX_CLIENT_BYTES = 100 * 1024 * 1024;      // 100 MB per client data room
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".xlsx", ".xls", ".csv",
  ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png",
]);

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function verifyClient(clientId: string, userId: string, userRole: string) {
  if (userRole === "admin") {
    const result = await query(`SELECT id FROM clients WHERE id = $1`, [clientId]);
    return result.rows.length > 0;
  }
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

async function verifyProspect(prospectId: string, userId: string) {
  const result = await query(
    `SELECT id FROM prospects WHERE id = $1 AND advisor_id = $2`,
    [prospectId, userId]
  );
  return result.rows.length > 0;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if ([".xlsx", ".xls", ".csv"].includes(ext)) return "spreadsheet";
  // .doc, .docx, .ppt, .pptx, and all other allowed types map to "document"
  return "document";
}

async function compressImageIfNeeded(filePath: string, ext: string): Promise<number> {
  const imageExts = new Set([".jpg", ".jpeg", ".png"]);
  if (!imageExts.has(ext)) return fs.statSync(filePath).size;
  const tempPath = filePath + ".tmp";
  const s = sharp(filePath);
  if (ext === ".png") {
    await s.png({ compressionLevel: 9 }).toFile(tempPath);
  } else {
    await s.jpeg({ quality: 80 }).toFile(tempPath);
  }
  fs.unlinkSync(filePath);
  fs.renameSync(tempPath, filePath);
  return fs.statSync(filePath).size;
}

// ── GET /api/documents?client_id=xxx OR ?prospect_id=xxx ─────────────────────
router.get("/", async (req, res) => {
  const { client_id, prospect_id } = req.query;

  if (!client_id && !prospect_id) {
    return res.status(400).json({ error: "client_id or prospect_id query param required" });
  }

  try {
    if (prospect_id) {
      if (!(await verifyProspect(prospect_id as string, req.user!.id))) {
        return res.status(404).json({ error: "Prospect not found" });
      }
      const result = await query(
        `SELECT id, prospect_id, client_id, name, category, subfolder, file_url, size, size_bytes, type,
                uploaded_by_role, uploaded_at
         FROM documents
         WHERE prospect_id = $1
         ORDER BY uploaded_at DESC`,
        [prospect_id]
      );
      return res.json(result.rows);
    }

    // client_id path
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `SELECT id, client_id, name, category, subfolder, file_url, size, size_bytes, type,
              uploaded_by_role, uploaded_at
       FROM documents
       WHERE client_id = $1
       ORDER BY uploaded_at DESC`,
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /documents error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/documents/storage?client_id=xxx ─────────────────────────────────
// Returns current storage usage for a client's data room
router.get("/storage", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used_bytes,
              COUNT(*)::int AS file_count
       FROM documents WHERE client_id = $1`,
      [client_id]
    );
    const { used_bytes, file_count } = result.rows[0];
    return res.json({
      used_bytes: Number(used_bytes),
      file_count: Number(file_count),
      max_bytes: MAX_CLIENT_BYTES,
    });
  } catch (err) {
    console.error("GET /documents/storage error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/documents ───────────────────────────────────────────────────────
// Accepts multipart/form-data: file, client_id OR prospect_id, category, uploaded_by_role
router.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: `File exceeds the 25 MB per-file limit.` });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    const { client_id, prospect_id, category, uploaded_by_role, subfolder } = req.body;

    if (!client_id && !prospect_id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "client_id or prospect_id is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "A file is required" });
    }

    try {
      // ── Prospect upload path ───────────────────────────────────────────────
      if (prospect_id) {
        if (!(await verifyProspect(prospect_id, req.user!.id))) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: "Prospect not found" });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const actualSize = await compressImageIfNeeded(req.file.path, ext);

        const fileUrl = `/uploads/${req.file.filename}`;
        const sizeLabel = formatFileSize(actualSize);
        const fileType = getFileType(req.file.originalname);

        const docResult = await query(
          `INSERT INTO documents
             (prospect_id, client_id, name, category, subfolder, file_url, size, size_bytes, type, uploaded_by_role)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            prospect_id,
            req.file.originalname,
            category ?? null,
            subfolder ?? null,
            fileUrl,
            sizeLabel,
            actualSize,
            fileType,
            "advisor",
          ]
        );
        return res.status(201).json(docResult.rows[0]);
      }

      // ── Client upload path ────────────────────────────────────────────────
      if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Client not found" });
      }

      const clientExt = path.extname(req.file.originalname).toLowerCase();
      const actualSize = await compressImageIfNeeded(req.file.path, clientExt);

      // Enforce 100 MB per-client cap (use compressed size)
      const usageResult = await query(
        `SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used_bytes FROM documents WHERE client_id = $1`,
        [client_id]
      );
      const usedBytes = Number(usageResult.rows[0].used_bytes);
      if (usedBytes + actualSize > MAX_CLIENT_BYTES) {
        fs.unlinkSync(req.file.path);
        return res.status(413).json({
          error: `Data Room is full. Maximum 100 MB per client. Currently using ${formatFileSize(usedBytes)}.`,
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const sizeLabel = formatFileSize(actualSize);
      const fileType = getFileType(req.file.originalname);
      const role = uploaded_by_role === "client" ? "client" : "advisor";

      const docResult = await query(
        `INSERT INTO documents
           (client_id, name, category, subfolder, file_url, size, size_bytes, type, uploaded_by_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          client_id,
          req.file.originalname,
          category ?? null,
          subfolder ?? null,
          fileUrl,
          sizeLabel,
          actualSize,
          fileType,
          role,
        ]
      );

      // Log to activity feed + notify advisor when client uploads
      try {
        const clientResult = await query(
          `SELECT c.name, c.advisor_id FROM clients c WHERE c.id = $1`,
          [client_id]
        );
        if (clientResult.rows.length > 0) {
          const { name: clientName, advisor_id } = clientResult.rows[0];
          let uploadedBy: string;
          if (role === "client") {
            uploadedBy = clientName;
          } else {
            const uploaderResult = await query(
              "SELECT name FROM users WHERE id = $1",
              [req.user!.id]
            );
            uploadedBy = uploaderResult.rows[0]?.name ?? "Advisor";
          }
          await query(
            `INSERT INTO activity_log (client_id, advisor_id, text)
             VALUES ($1, $2, $3)`,
            [
              client_id,
              advisor_id,
              `${uploadedBy} uploaded "${req.file.originalname}" to the Data Room`,
            ]
          );
          // Notify advisor only when a client triggers the upload
          if (role === "client") {
            await query(
              `INSERT INTO notifications (advisor_id, client_id, type, message)
               VALUES ($1, $2, $3, $4)`,
              [
                advisor_id,
                client_id,
                "document_upload",
                `${clientName} uploaded "${req.file.originalname}" to their Data Room`,
              ]
            );
          }
        }
      } catch (logErr) {
        // Non-fatal: activity log / notification failure should not fail the upload
        console.warn("Activity log / notification write failed:", logErr);
      }

      return res.status(201).json(docResult.rows[0]);
    } catch (err) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      console.error("POST /documents error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── PATCH /api/documents/:id ──────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const { category, subfolder } = req.body;
  try {
    const dResult = await query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
    if (dResult.rows.length === 0) return res.status(404).json({ error: "Document not found" });
    const doc = dResult.rows[0];
    if (doc.client_id) {
      if (!(await verifyClient(doc.client_id, req.user!.id, req.user!.role)))
        return res.status(403).json({ error: "Access denied" });
    } else if (doc.prospect_id) {
      if (!(await verifyProspect(doc.prospect_id, req.user!.id)))
        return res.status(403).json({ error: "Access denied" });
    }
    const updated = await query(
      `UPDATE documents SET
         category = COALESCE($1, category),
         subfolder = $2
       WHERE id = $3 RETURNING *`,
      [category ?? null, subfolder !== undefined ? (subfolder || null) : doc.subfolder, req.params.id]
    );
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error("PATCH /documents/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const dResult = await query(
      "SELECT * FROM documents WHERE id = $1",
      [req.params.id]
    );
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = dResult.rows[0];

    // Verify ownership — prospect doc or client doc
    if (doc.client_id == null && doc.prospect_id != null) {
      if (!(await verifyProspect(doc.prospect_id, req.user!.id))) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else {
      if (!(await verifyClient(doc.client_id, req.user!.id, req.user!.role))) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Delete physical file
    if (doc.file_url) {
      const filePath = path.join(UPLOADS_DIR, path.basename(doc.file_url));
      try { fs.unlinkSync(filePath); } catch {}
    }

    await query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /documents/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
