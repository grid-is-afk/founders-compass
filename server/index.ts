import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./systemPrompt.js";
import { buildLicenseeSystemPrompt } from "./systemPrompt-licensee.js";
import { tools, executeTool } from "./tools.js";
import { query } from "./db.js";
import dotenv from "dotenv";

import { authMiddleware } from "./middleware/auth.js";
import { authLimiter } from "./middleware/rateLimit.js";
import { verifyClientAccess } from "./lib/verifyClient.js";
import { buildClientStructuredContext } from "./platformContext.js";
import { retrieveChunks } from "./lib/retrieval.js";
import { fetchClientVisualDocs } from "./lib/vision.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import assessmentRoutes from "./routes/assessments.js";
import taskRoutes from "./routes/tasks.js";
import prospectRoutes from "./routes/prospects.js";
import instrumentRoutes from "./routes/instruments.js";
import protectionRoutes from "./routes/protection.js";
import growRoutes from "./routes/grow.js";
import riskAlertRoutes from "./routes/risk-alerts.js";
import deliverableRoutes from "./routes/deliverables.js";
import meetingRoutes from "./routes/meetings.js";
import documentRoutes from "./routes/documents.js";
import quarterlyPlanRoutes from "./routes/quarterly-plans.js";
import quarterlyObjectiveRoutes from "./routes/quarterlyObjectives.js";
import dashboardRoutes from "./routes/dashboard.js";
import activityRoutes from "./routes/activity.js";
import exposureIndexRoutes from "./routes/exposureIndex.js";
import sixCsRoutes from "./routes/sixCs.js";
import clientExposureIndexRoutes from "./routes/clientExposureIndex.js";
import clientFounderMatrixRoutes from "./routes/clientFounderMatrix.js";
import clientFounderSnapshotRoutes from "./routes/clientFounderSnapshot.js";
import clientOptionalityFrameworkRoutes from "./routes/clientOptionalityFramework.js";
import clientSixCsBaselineRoutes from "./routes/clientSixCsBaseline.js";
import clientSixCsRoutes from "./routes/clientSixCs.js";
import clientSixKeysRoutes from "./routes/clientSixKeys.js";
import clientCapitalOptionalityRoutes from "./routes/clientCapitalOptionality.js";
import clientMultiplesRoutes from "./routes/clientMultiples.js";
import clientIpdMetricsRoutes from "./routes/clientIpdMetrics.js";
import analyzeDataRoomRouter from "./routes/analyzeDataRoom.js";
import clientDiagnoseActionsRoutes from "./routes/clientDiagnoseActions.js";
import clientSixCsReconcileRoutes from "./routes/clientSixCsReconcile.js";
import clientAssessmentSummaryRoutes from "./routes/clientAssessmentSummary.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import clientIpValueFrameworkRoutes from "./routes/clientIpValueFramework.js";
import stakeholderRoutes from "./routes/stakeholders.js";
import riskScanRoutes from "./routes/riskScan.js";
import firmInsightsRoutes from "./routes/firmInsights.js";
import communicationsRoutes from "./routes/communications.js";
import kickoffPlanRoutes from "./routes/kickoffPlan.js";
import methodologyRecommendationsRoutes from "./routes/methodologyRecommendations.js";
import userRoutes from "./routes/users.js";
import deferredChangesRoutes from "./routes/deferredChanges.js";
import licenseeIntakeRoutes from "./routes/licenseeIntakes.js";
import referralRoutes from "./routes/referrals.js";
import hubspotRoutes from "./routes/hubspot.js";
import { otterWebhookRouter, otterInboxRouter } from "./routes/otter.js";
import { syncProspectsFromHubSpot } from "./lib/hubspot/sync.js";
import { isHubSpotConfigured } from "./lib/hubspot/client.js";

dotenv.config();

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Trust Railway's reverse proxy so rate limiting sees the real client IP
// (X-Forwarded-For) rather than treating all traffic as a single proxy IP.
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// Public routes
// ============================================================
// Throttle the brute-forceable auth endpoints before the router handles them.
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/refresh", authLimiter);
app.use("/api/auth", authRoutes);

// Otter → Zapier inbound webhook: no JWT (Zapier can't carry one); gated by a
// shared secret inside the handler. Mounted here in the public section, before
// the JWT-protected routers below.
app.use("/api/integrations/otter", otterWebhookRouter);

// ============================================================
// Protected API routes — all require a valid JWT
// ============================================================
app.use("/api/clients", authMiddleware, clientExposureIndexRoutes);
app.use("/api/clients", authMiddleware, clientFounderMatrixRoutes);
app.use("/api/clients", authMiddleware, clientFounderSnapshotRoutes);
app.use("/api/clients", authMiddleware, clientOptionalityFrameworkRoutes);
app.use("/api/clients", authMiddleware, clientSixCsBaselineRoutes);
app.use("/api/clients", authMiddleware, clientSixCsRoutes);
app.use("/api/clients", authMiddleware, clientSixKeysRoutes);
app.use("/api/clients", authMiddleware, clientCapitalOptionalityRoutes);
app.use("/api/clients", authMiddleware, clientMultiplesRoutes);
app.use("/api/clients", authMiddleware, clientIpdMetricsRoutes);
app.use("/api/clients", authMiddleware, analyzeDataRoomRouter);
app.use("/api/clients", authMiddleware, clientDiagnoseActionsRoutes);
app.use("/api/clients", authMiddleware, clientSixCsReconcileRoutes);
app.use("/api/clients", authMiddleware, clientAssessmentSummaryRoutes);
app.use("/api/clients", authMiddleware, clientIpValueFrameworkRoutes);
app.use("/api/clients", authMiddleware, licenseeIntakeRoutes);
app.use("/api/clients", authMiddleware, clientRoutes);
app.use("/api/assessments", authMiddleware, assessmentRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);
// Exposure index and Six C's must be registered before the generic prospects
// router so bulk-map routes are not swallowed by GET /:id.
app.use("/api/prospects", authMiddleware, exposureIndexRoutes);
app.use("/api/prospects", authMiddleware, sixCsRoutes);
app.use("/api/prospects", authMiddleware, prospectRoutes);
app.use("/api/instruments", authMiddleware, instrumentRoutes);
app.use("/api/protection", authMiddleware, protectionRoutes);
app.use("/api/grow", authMiddleware, growRoutes);
app.use("/api/risk-alerts", authMiddleware, riskAlertRoutes);
app.use("/api/risk-scan", authMiddleware, riskScanRoutes);
app.use("/api/firm-insights", authMiddleware, firmInsightsRoutes);
app.use("/api/communications", authMiddleware, communicationsRoutes);
app.use("/api/deliverables", authMiddleware, deliverableRoutes);
app.use("/api/meetings", authMiddleware, meetingRoutes);
app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/quarterly-plans", authMiddleware, quarterlyPlanRoutes);
app.use("/api/quarterly-objectives", authMiddleware, quarterlyObjectiveRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/activity", authMiddleware, activityRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/admin/hubspot", authMiddleware, hubspotRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api/stakeholders", authMiddleware, stakeholderRoutes);
app.use("/api/clients", authMiddleware, kickoffPlanRoutes);
app.use("/api/clients", authMiddleware, methodologyRecommendationsRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/deferred-changes", authMiddleware, deferredChangesRoutes);
// Otter transcript inbox (advisors/admins only) — the JWT-protected counterpart
// to the public webhook mounted above.
app.use("/api/integrations/otter", authMiddleware, otterInboxRouter);
// Licensee portal: referral partner directory + per-client referral requests
app.use("/api", authMiddleware, referralRoutes);

// ---------------------------------------------------------------------------
// GET /api/q1-phase-config — public config for the Gantt chart
// ---------------------------------------------------------------------------
app.get("/api/q1-phase-config", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT phase, day_start, day_end, label FROM q1_phase_config ORDER BY day_start"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/q1-phase-config error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// Copilot chat — protected
// ============================================================
app.post("/api/chat", authMiddleware, async (req, res) => {
  const { messages, clientId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  // Authorize BEFORE writing SSE headers so 403 responses return clean JSON.
  if (clientId) {
    if (!(await verifyClientAccess(clientId as string, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  // Licensee (Advisor) QB AI is read-only and always scoped to a single client.
  const isLicensee = req.user!.role === "licensee";
  if (isLicensee && !clientId) {
    return res.status(400).json({ error: "Select a client to use the Quarterback AI." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Build a fresh system prompt with real DB data. Licensees get a scoped,
    // single-client prompt with NO firm/portfolio/methodology knowledge.
    let systemPrompt = isLicensee
      ? await buildLicenseeSystemPrompt(clientId as string)
      : await buildSystemPrompt(req.user!.id);

    // When scoped to a specific client, inject deep client context + RAG results
    if (clientId) {
      const lastUserContent =
        (messages as Array<{ role: string; content: string }>)
          .filter((m) => m.role === "user")
          .at(-1)?.content ?? "";

      // Licensee: client context is already baked into the licensee prompt, and
      // RAG must exclude TFO methodology chunks. Advisor: full structured context.
      const [structuredCtx, ragChunks] = await Promise.all([
        isLicensee
          ? Promise.resolve("")
          : buildClientStructuredContext(clientId as string, req.user!.id),
        retrieveChunks(lastUserContent, clientId as string, 15, !isLicensee),
      ]);

      if (structuredCtx) systemPrompt += "\n\n" + structuredCtx;

      if (ragChunks.length > 0) {
        const ragCtx =
          "## RELEVANT DOCUMENT EXCERPTS (from client's Data Room)\n" +
          ragChunks
            .map(
              (c, i) =>
                `[Source ${i + 1}: ${(c.metadata.document_name as string | undefined) ?? "Document"}]\n${c.chunk_text}`
            )
            .join("\n\n");
        systemPrompt += "\n\n" + ragCtx;

        // Deduplicate by document_id and emit a sources event so the
        // frontend can render clickable citation pills beneath the reply.
        const ragSources = [
          ...new Map(
            ragChunks.map((c) => [
              c.document_id,
              {
                name: (c.metadata.document_name as string | undefined) ?? "Document",
                documentId: c.document_id,
              },
            ])
          ).values(),
        ];
        res.write(
          `data: ${JSON.stringify({ type: "sources", sources: ragSources })}\n\n`
        );
      }
    }

    let currentMessages: Anthropic.MessageParam[] = (messages as Array<{ role: string; content: string }>).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Prepend image PDFs as a synthetic context turn so Claude can read
    // scanned documents using vision alongside the RAG text chunks
    if (clientId) {
      const visualDocs = await fetchClientVisualDocs(clientId as string, req.user!.id);
      if (visualDocs.length > 0) {
        const docBlocks = visualDocs.map((doc, i) => ({
          type: doc.blockType as "document" | "image",
          source: {
            type: "base64" as const,
            media_type: doc.mediaType,
            data: doc.buffer.toString("base64"),
          },
          // document blocks support title; image blocks do not
          ...(doc.blockType === "document" ? { title: doc.name } : {}),
          // Cache the last block for the 5-min Anthropic prompt cache window
          ...(i === visualDocs.length - 1
            ? { cache_control: { type: "ephemeral" as const } }
            : {}),
        }));

        currentMessages = [
          {
            role: "user",
            content: [
              ...docBlocks,
              {
                type: "text",
                text: "The above are visual files (scanned PDFs and images) from this client's Data Room. Use them alongside any other context to answer questions.",
              },
            ],
          },
          {
            role: "assistant",
            content: "Understood — I've reviewed the scanned documents and will use them to answer questions about this client.",
          },
          ...currentMessages,
        ];
      }
    }

    // Detect client disconnect so we can break the tool-use loop early
    let clientDisconnected = false;
    req.on("close", () => { clientDisconnected = true; });

    // Tool-use loop: Claude may call tools multiple times before producing final text
    while (true) {
      if (clientDisconnected) break;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt as string,
        // Licensees are READ-ONLY: hand them zero tools so no write path exists.
        tools: isLicensee ? [] : (tools as Anthropic.Tool[]),
        messages: currentMessages,
      });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      // Stream any text that arrived before or alongside tool calls
      for (const block of textBlocks) {
        if (block.text) {
          res.write(`data: ${JSON.stringify({ type: "text", text: block.text })}\n\n`);
        }
      }

      // No tool calls (or a non-tool stop) — the conversation turn is done.
      // Report persistence is handled explicitly by the save_report tool, so
      // there's nothing to finalize from the model's free text here.
      if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
        break;
      }

      // Execute each tool and send action events to the frontend
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolBlock of toolUseBlocks) {
        const result = await executeTool(
          toolBlock.name,
          toolBlock.input as Record<string, unknown>,
          req.user!.id,
          clientId as string | undefined
        );

        // Notify frontend so it can show an action badge / toast
        res.write(
          `data: ${JSON.stringify({
            type: "action",
            action: result.action,
            toolName: toolBlock.name,
          })}\n\n`
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: result.result,
        });
      }

      // Feed tool results back to Claude and loop for the follow-up reply
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "Failed to connect to AI";
    console.error("Chat error:", errMsg);
    res.write(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`);
    res.end();
  }
});

// ============================================================
// Static file serving — uploads and frontend
// ============================================================

// Ensure uploads directory exists on startup
const uploadsPath = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsPath, { recursive: true });
app.use("/uploads", express.static(uploadsPath));

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

app.get("{*path}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ============================================================
// Centralized error handler — must be registered last. Body-parser rejects an
// over-limit request body before it reaches the route, so the request itself
// can't be rescued here; this just turns that PayloadTooLargeError (and any
// other unhandled error) into a clean JSON response with a friendly message
// instead of a raw stack trace / HTML.
// ============================================================
const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (
    err &&
    (err.type === "entity.too.large" ||
      err.status === 413 ||
      err.statusCode === 413)
  ) {
    return res.status(413).json({
      error:
        "This conversation has grown too large to send. Start a new chat to continue.",
    });
  }
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || "3001", 10);

// Apply the schema (idempotent — CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS / guarded DO blocks) on boot so every deployed environment self-migrates
// on each release. Wrapped so a migration failure can never block the server from
// starting — it logs and continues.
async function applySchemaOnBoot() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await query(schemaSql);
    console.log("Schema applied (boot migration).");
  } catch (err) {
    console.error("Boot migration failed (starting server anyway):", err);
  }
}

await applySchemaOnBoot();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Founders Compass running on http://localhost:${PORT}`);
});

// ============================================================
// HubSpot pipeline sync scheduler (one-way: HubSpot → platform)
//
// Polls HubSpot on a fixed interval so deal-stage changes mirror into the
// prospect pipeline without TFO double-entering. A single Railway instance makes
// a plain setInterval safe; the sync itself holds an in-process lock so an
// overlapping manual trigger can't run concurrently. Disabled when no token is
// set, or by HUBSPOT_SYNC_INTERVAL_MIN=0.
// ============================================================
const hubspotIntervalMin = parseInt(process.env.HUBSPOT_SYNC_INTERVAL_MIN || "15", 10);
if (isHubSpotConfigured() && hubspotIntervalMin > 0) {
  const runSync = () => {
    syncProspectsFromHubSpot()
      .then((r) => {
        if (r.ok) {
          console.log(
            `HubSpot sync: ${r.dealsScanned} deals → ${r.prospectsCreated} created, ${r.prospectsUpdated} updated, ${r.pitchDecksImported} pitch decks, ${r.skipped} skipped`
          );
        } else {
          console.warn("HubSpot sync did not complete:", r.error);
        }
      })
      .catch((err) => console.error("HubSpot sync scheduler error:", err));
  };
  // Kick off shortly after boot, then on the interval.
  setTimeout(runSync, 30_000);
  setInterval(runSync, hubspotIntervalMin * 60_000);
  console.log(`HubSpot sync scheduled every ${hubspotIntervalMin} min.`);
} else {
  console.log("HubSpot sync scheduler disabled (no token or interval=0).");
}
