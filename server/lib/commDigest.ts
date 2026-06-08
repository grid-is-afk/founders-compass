import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";
import type { CommChannel } from "./commChannels/types.js";

// ============================================================
// UC-04 — Synthesis engine ("the brain").
//
// Mirrors the firm-insights pattern (server/routes/firmInsights.ts): pull the
// relevant rows deterministically, hand them to Claude to ORGANIZE BY TOPIC
// (not by channel), then sanitize the model's output against the real data so
// every cited event id resolves. The channels per topic are derived from the
// cited ids in code — never trusted from the model — so badges are always true.
// ============================================================

const SENTIMENTS = ["positive", "neutral", "negative", "mixed"] as const;
type Sentiment = (typeof SENTIMENTS)[number];

// Bound the prompt: cap event count and per-event body length.
const MAX_EVENTS = 150;
const MAX_BODY_CHARS = 1500;

export interface DigestEvent {
  id: string;
  channel: CommChannel;
  occurredAt: string;
  subject: string | null;
  bodyText: string;
}

export interface DigestTopic {
  topic: string;
  summary: string;
  /** Channels this topic was evidenced in — derived from cited events, not the model. */
  channels: CommChannel[];
  eventIds: string[];
  sentiment: Sentiment;
}

/** Pull normalized communication events for a client within [start, end]. */
export async function computeDigestEvents(
  clientId: string,
  start: Date,
  end: Date
): Promise<DigestEvent[]> {
  const result = await query(
    `SELECT id, channel, occurred_at, subject, body_text
       FROM communication_events
      WHERE client_id = $1
        AND occurred_at >= $2
        AND occurred_at < $3
      ORDER BY occurred_at ASC
      LIMIT $4`,
    [clientId, start.toISOString(), end.toISOString(), MAX_EVENTS]
  );

  return (result.rows as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    channel: r.channel as CommChannel,
    occurredAt: new Date(r.occurred_at as string).toISOString(),
    subject: (r.subject as string | null) ?? null,
    bodyText: String(r.body_text ?? "").slice(0, MAX_BODY_CHARS),
  }));
}

/**
 * Ask Claude to regroup events by topic. Returns sanitized topics. With no
 * events, returns [] WITHOUT calling the model (no spend, no hallucinated
 * topics).
 */
export async function synthesizeDigest(events: DigestEvent[]): Promise<DigestTopic[]> {
  if (events.length === 0) return [];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const validIds = new Set(events.map((e) => e.id));
  const channelById = new Map<string, CommChannel>(events.map((e) => [e.id, e.channel]));

  const emitTopicsTool: Anthropic.Tool = {
    name: "emit_topics",
    description: "Return the client's communications reorganized by topic.",
    input_schema: {
      type: "object",
      properties: {
        topics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string", description: "Short topic headline (max ~8 words)." },
              summary: {
                type: "string",
                description:
                  "2-4 sentences synthesizing what was communicated on this topic ACROSS channels. Reference only what the events actually say; do not invent facts.",
              },
              sentiment: {
                type: "string",
                enum: [...SENTIMENTS],
                description: "Overall tone of this topic's communications.",
              },
              event_ids: {
                type: "array",
                items: { type: "string" },
                description: "The event ids (from the provided list) this topic draws on.",
              },
            },
            required: ["topic", "summary", "sentiment", "event_ids"],
          },
        },
      },
      required: ["topics"],
    },
  };

  const system =
    "You are the communications analyst for The Founders Office (TFO), a boutique exit-planning advisory. " +
    "You are given a client's communication events drawn from one or more channels (meeting notes, email, " +
    "Zoom, WhatsApp). Your job is to produce a digest ORGANIZED BY TOPIC, not by channel or by date — group " +
    "everything that concerns the same subject together, even when it came from different channels. " +
    "Rules: (1) Synthesize only what the events actually say — never invent facts, names, or figures. " +
    "(2) Cite the event ids each topic draws on. (3) Aim for 3-8 topics; merge trivial chatter rather than " +
    "creating a topic per message. (4) Lead with what matters to an advisor: decisions, risks, commitments, " +
    "and changes in direction. Call the emit_topics tool with your findings.";

  const userMessage =
    "Here are the communication events (JSON). Each has an id, channel, date, optional subject, and body.\n\n" +
    JSON.stringify(events, null, 2);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: [emitTopicsTool],
    tool_choice: { type: "tool", name: "emit_topics" },
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_topics"
  );
  if (!toolBlock) return [];

  const raw = (toolBlock.input as { topics?: unknown[] }).topics ?? [];

  // Sanitize: trim text, keep only real event ids, derive channels from those
  // ids (so badges are always accurate), and drop topics with no valid evidence.
  const topics: DigestTopic[] = [];
  for (const item of raw) {
    const t = item as Record<string, unknown>;
    const topic = typeof t.topic === "string" ? t.topic.trim() : "";
    const summary = typeof t.summary === "string" ? t.summary.trim() : "";
    const sentiment = (SENTIMENTS as readonly string[]).includes(t.sentiment as string)
      ? (t.sentiment as Sentiment)
      : "neutral";
    const eventIds = Array.isArray(t.event_ids)
      ? (t.event_ids as unknown[]).filter(
          (id): id is string => typeof id === "string" && validIds.has(id)
        )
      : [];

    if (!topic || !summary || eventIds.length === 0) continue;

    const channels = [...new Set(eventIds.map((id) => channelById.get(id)!))];
    topics.push({ topic, summary, channels, eventIds, sentiment });
  }
  return topics;
}
