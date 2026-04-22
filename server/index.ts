import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./systemPrompt.js";
import { tools, executeTool } from "./tools.js";
import { query } from "./db.js";
import dotenv from "dotenv";

import { authMiddleware } from "./middleware/auth.js";
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
import clientAssessmentSummaryRoutes from "./routes/clientAssessmentSummary.js";

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
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// Public routes
// ============================================================
app.use("/api/auth", authRoutes);

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
app.use("/api/clients", authMiddleware, clientAssessmentSummaryRoutes);
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
app.use("/api/deliverables", authMiddleware, deliverableRoutes);
app.use("/api/meetings", authMiddleware, meetingRoutes);
app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/quarterly-plans", authMiddleware, quarterlyPlanRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/activity", authMiddleware, activityRoutes);

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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Build a fresh system prompt with real DB data for this advisor
    const systemPrompt = await buildSystemPrompt(req.user!.id);

    let currentMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Detect client disconnect so we can break the tool-use loop early
    let clientDisconnected = false;
    req.on("close", () => { clientDisconnected = true; });

    // Tool-use loop: Claude may call tools multiple times before producing final text
    while (true) {
      if (clientDisconnected) break;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
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

      // No tool calls — conversation is done
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

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Founders Compass running on http://localhost:${PORT}`);
});
