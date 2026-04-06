import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { streamChat, type ChatMessage, type ChatAction } from "@/lib/copilotApi";

let messageCounter = 0;

const STORAGE_KEY = "qb-chat-history";

const actionToastLabels: Record<string, string> = {
  task_created: "Task created",
  prospect_moved: "Prospect updated",
  report_generated: "Report generated",
  instrument_updated: "Instrument updated",
  risk_flagged: "Risk flagged",
  meeting_scheduled: "Meeting scheduled",
};

function loadMessages(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ChatMessage[];
    // Advance counter past saved message ids so new ids don't collide
    for (const m of parsed) {
      const num = parseInt(m.id.replace("msg-", ""), 10);
      if (!isNaN(num) && num > messageCounter) {
        messageCounter = num;
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

export function useCopilot(clientContext?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: "user",
        content: text.trim(),
      };

      const assistantMsg: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: "assistant",
        content: "",
        actions: [],
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setError(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        // Build history from current state, not the stale closure
        const historyMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Prepend client context to the first user message
        const allMessages = clientContext
          ? [
              {
                role: "user" as const,
                content: `[Context: The advisor is currently viewing ${clientContext}]\n\n${historyMessages[0]?.content ?? ""}`,
              },
              ...historyMessages.slice(1),
            ]
          : historyMessages;

        for await (const event of streamChat(allMessages, abortController.signal)) {
          if (event.kind === "text") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.text,
                };
              }
              return updated;
            });
          } else if (event.kind === "action") {
            const action = event.action as ChatAction;

            // Attach action to the current assistant message
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  actions: [...(last.actions ?? []), action],
                };
              }
              return updated;
            });

            // Fire toast notification
            const label = actionToastLabels[action.type] ?? "Action completed";
            const description =
              (action.title as string | undefined) ??
              (action.clientName as string | undefined) ??
              "";
            toast(label, { description: description || undefined });
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errorMsg = err instanceof Error ? err.message : "Failed to get response";
        setError(errorMsg);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "I encountered an error. Please try again.",
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, clientContext]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearConversation = useCallback(() => {
    cancelStream();
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [cancelStream]);

  return { messages, isStreaming, error, sendMessage, cancelStream, clearConversation };
}
