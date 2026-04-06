import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./systemPrompt.js";
import { tools, executeTool } from "./tools.js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = buildSystemPrompt();

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let currentMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Tool-use loop: Claude may call tools multiple times before producing final text
    while (true) {
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
        const result = executeTool(
          toolBlock.name,
          toolBlock.input as Record<string, unknown>
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

// Serve static frontend files in production
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes
app.get("{*path}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Founders Compass running on http://localhost:${PORT}`);
});
