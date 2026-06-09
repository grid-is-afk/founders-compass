import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { streamChat, buildOutgoingWindow, type ChatMessage, type ChatAction, type ChatSource } from "@/lib/copilotApi";

let messageCounter = 0;

// Chat history is scoped per advisor AND per client so one client's
// conversation (and its onboarding briefs) can never bleed into another
// client's workspace, and one advisor's chats are never visible to another
// advisor on a shared browser. The "global" segment holds the advisor-home
// chat (no client selected).
function historyKey(userId?: string, clientId?: string): string {
  return `qb-chat-history:${userId ?? "anon"}:${clientId ?? "global"}`;
}

const actionToastLabels: Record<string, string> = {
  task_created: "Task created",
  prospect_moved: "Prospect updated",
  report_generated: "Drafting report…",
  report_saved: "Report saved to Data Room",
  agenda_generated: "Agenda created",
  instrument_updated: "Instrument updated",
  risk_flagged: "Risk flagged",
  meeting_scheduled: "Meeting scheduled",
};

// Actions that add or change a Data Room document / deliverable, so the
// Deliverables and Documents tabs should refresh once the stream completes.
const DATA_ROOM_ACTIONS = new Set([
  "report_generated",
  "report_saved",
  "agenda_generated",
]);

function loadMessages(key: string): ChatMessage[] {
  try {
    const saved = localStorage.getItem(key);
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

export function useCopilot(
  clientContext?: string,
  clientId?: string,
  userId?: string,
) {
  // The storage key the currently-loaded `messages` belong to. Kept in a ref
  // so the persist effect always writes back to the right key even mid-switch,
  // never leaking the previous client's messages into the new client's bucket.
  const keyRef = useRef(historyKey(userId, clientId));
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(keyRef.current),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Fires the storage-full warning at most once per mounted session.
  const quotaWarnedRef = useRef(false);
  const qc = useQueryClient();

  // When the advisor switches clients (or the logged-in advisor changes),
  // abort any in-flight stream and swap in that scope's saved history. This is
  // the reset that stops Client A's briefing from rendering under Client B.
  useEffect(() => {
    const nextKey = historyKey(userId, clientId);
    if (nextKey === keyRef.current) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    keyRef.current = nextKey;
    setMessages(loadMessages(nextKey));
  }, [clientId, userId]);

  // Persist messages to localStorage whenever they change, always to the key
  // the loaded messages belong to (keyRef), never a stale closure value.
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(messages));
    } catch (err) {
      // localStorage is ~5MB per origin — a long session full of large reports
      // can exceed it. Keep the in-memory conversation working regardless, and
      // warn the advisor once so they know to start a fresh chat to re-enable
      // saved history. (Sending is unaffected — outgoing payloads are windowed.)
      const isQuota =
        err instanceof DOMException &&
        (err.name === "QuotaExceededError" ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED");
      if (isQuota && !quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        toast("Chat history is full", {
          description:
            "This conversation is too large to keep saving. Start a new chat to restore saved history — your generated reports are safe in the Data Room.",
        });
      } else if (!isQuota) {
        console.error("Failed to persist chat history:", err);
      }
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

      // Track whether a report/agenda document was created or saved this turn, so
      // we can refresh the Deliverables + Data Room tabs once the stream finishes.
      let reportGeneratedClientId: string | null = null;

      try {
        // Build history from current state, not the stale closure
        const historyMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Window the OUTGOING copy to a byte budget so a long conversation full
        // of large generated reports can never exceed the server's request-body
        // limit. The full history stays in state/localStorage and on screen —
        // only what we send over the wire is trimmed. The window is guaranteed
        // to start with a user message (required by the chat API).
        const windowed = buildOutgoingWindow(historyMessages);

        // Prepend client context to the first (user) message of the window
        const allMessages = clientContext
          ? [
              {
                role: "user" as const,
                content: `[Context: The advisor is currently viewing ${clientContext}]\n\n${windowed[0]?.content ?? ""}`,
              },
              ...windowed.slice(1),
            ]
          : windowed;

        for await (const event of streamChat(allMessages, abortController.signal, clientId)) {
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

            if (DATA_ROOM_ACTIONS.has(action.type)) {
              reportGeneratedClientId =
                (action.clientId as string | undefined) ?? clientId ?? null;
            }

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
          } else if (event.kind === "sources") {
            const sources = event.sources as ChatSource[];

            // Attach RAG source citations to the current assistant message
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = { ...last, sources };
              }
              return updated;
            });
          }
        }

        // Stream completed cleanly — if a report was generated, refresh both
        // Deliverables and Documents caches so the new artifact appears in the
        // tab and the Data Room without a manual refresh.
        if (reportGeneratedClientId) {
          qc.invalidateQueries({ queryKey: ["deliverables", reportGeneratedClientId] });
          qc.invalidateQueries({ queryKey: ["documents", reportGeneratedClientId] });
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
              content: `Something went wrong: ${errorMsg}. Please try again.`,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, clientContext, clientId, qc]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearConversation = useCallback(() => {
    cancelStream();
    setMessages([]);
    setError(null);
    localStorage.removeItem(keyRef.current);
  }, [cancelStream]);

  return { messages, isStreaming, error, sendMessage, cancelStream, clearConversation };
}
