import { useState, useCallback, useRef } from "react";
import { streamChat, type ChatMessage } from "@/lib/copilotApi";

let messageCounter = 0;

export function useCopilot(clientContext?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
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
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setError(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const historyMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Prepend client context to the first user message so the AI knows which client is in view
      const allMessages = clientContext
        ? [
            {
              role: "user" as const,
              content: `[Context: The advisor is currently viewing ${clientContext}]\n\n${historyMessages[0]?.content ?? ""}`,
            },
            ...historyMessages.slice(1),
          ]
        : historyMessages;

      for await (const chunk of streamChat(allMessages, abortController.signal)) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
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
  }, [messages, isStreaming]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearConversation = useCallback(() => {
    cancelStream();
    setMessages([]);
    setError(null);
  }, [cancelStream]);

  return { messages, isStreaming, error, sendMessage, cancelStream, clearConversation };
}
