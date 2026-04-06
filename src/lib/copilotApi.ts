export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: string;
  toolName: string;
  [key: string]: unknown;
}

export type StreamEvent =
  | { kind: "text"; text: string }
  | { kind: "action"; action: ChatAction };

export async function* streamChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
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
