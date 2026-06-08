export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  sources?: ChatSource[];
}

export interface ChatAction {
  type: string;
  toolName: string;
  [key: string]: unknown;
}

export interface ChatSource {
  name: string;
  documentId: string;
}

export type StreamEvent =
  | { kind: "text"; text: string }
  | { kind: "action"; action: ChatAction }
  | { kind: "sources"; sources: ChatSource[] };

type WireMessage = { role: "user" | "assistant"; content: string };

const TRUNCATION_MARKER =
  "\n\n…[earlier content truncated — full report saved in the Data Room]";

// UTF-8 byte length — reports are full of em-dashes, bullets, and smart quotes
// where the byte count is meaningfully larger than the string length.
function byteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

// Truncate a string to fit within maxBytes of UTF-8, on a valid code-point
// boundary (never splits a multi-byte char), then append the marker.
function truncateToBytes(content: string, maxBytes: number): string {
  const budget = Math.max(0, maxBytes - byteLength(TRUNCATION_MARKER));
  // Walk back from an over-long char estimate until the slice fits the budget.
  let end = content.length;
  while (end > 0 && byteLength(content.slice(0, end)) > budget) {
    // Step proportionally to converge fast on large reports, min one char.
    const overshoot = byteLength(content.slice(0, end)) - budget;
    end -= Math.max(1, Math.floor(overshoot / 4));
  }
  return content.slice(0, Math.max(0, end)) + TRUNCATION_MARKER;
}

/**
 * Build a recency-prioritized, byte-budgeted copy of the conversation history
 * to send over the wire. The full history stays in state / localStorage (the UI
 * still renders every message and ReportCard) — only this outgoing copy is
 * trimmed so a long session full of large generated reports can never exceed the
 * server's request-body limit and brick the chat.
 *
 * - Walks newest → oldest, keeping each message's full content while the running
 *   total stays within `budgetBytes`; older messages past the budget are dropped.
 * - Guarantees the result starts with a `user` message (the Anthropic API
 *   requires it) by trimming any leading assistant messages.
 * - If a single retained message alone exceeds the budget (an enormous report —
 *   extremely rare), its content is truncated rather than dropped.
 */
export function buildOutgoingWindow(
  messages: WireMessage[],
  budgetBytes = 6 * 1024 * 1024, // 6MB — well under the server's 10mb body limit
): WireMessage[] {
  if (messages.length === 0) return [];

  const ENVELOPE_BYTES = 40; // per-message JSON overhead: role, quotes, escapes
  const picked: WireMessage[] = [];
  let used = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const size = byteLength(m.content) + ENVELOPE_BYTES;

    if (picked.length === 0) {
      // Always retain the newest message; truncate it only if it alone blows
      // the entire budget (a single >6MB report).
      if (size > budgetBytes) {
        picked.unshift({
          role: m.role,
          content: truncateToBytes(m.content, budgetBytes - ENVELOPE_BYTES),
        });
        used = budgetBytes;
      } else {
        picked.unshift({ role: m.role, content: m.content });
        used = size;
      }
      continue;
    }

    if (used + size > budgetBytes) break; // older messages past budget — drop
    picked.unshift({ role: m.role, content: m.content });
    used += size;
  }

  // Anthropic requires the conversation to start with a user message.
  while (picked.length > 0 && picked[0].role === "assistant") {
    picked.shift();
  }
  if (picked.length === 0) {
    const last = messages[messages.length - 1];
    return [{ role: last.role, content: last.content }];
  }

  return picked;
}

export async function* streamChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  signal?: AbortSignal,
  clientId?: string
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem("tfo-access-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, clientId }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Chat request failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "text") {
            yield { kind: "text", text: parsed.text };
          } else if (parsed.type === "action") {
            yield {
              kind: "action",
              action: {
                type: parsed.action?.type ?? parsed.toolName,
                toolName: parsed.toolName,
                ...parsed.action,
              },
            };
          } else if (parsed.type === "sources") {
            yield { kind: "sources", sources: parsed.sources as ChatSource[] };
          } else if (parsed.type === "error") {
            throw new Error(parsed.error);
          } else if (parsed.type === "done") {
            return;
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
}
