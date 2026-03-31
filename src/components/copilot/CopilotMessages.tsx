import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopilotContext } from "./CopilotProvider";
import { cn } from "@/lib/utils";

export default function CopilotMessages() {
  const { messages, isStreaming } = useCopilotContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const showCursor = isStreaming && isLast && msg.role === "assistant" && !msg.content;

        if (msg.role === "user") {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="bg-primary/10 rounded-xl rounded-br-sm px-4 py-3 text-sm max-w-[85%]">
                <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex gap-2.5 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0 w-6 h-6 rounded-md gradient-gold flex items-center justify-center mt-0.5">
              <span className="text-accent-foreground text-[10px] font-semibold font-display">F</span>
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "bg-card border border-border rounded-xl rounded-bl-sm px-4 py-3 text-sm border-l-2 border-l-primary max-w-[85%]",
                showCursor && "min-h-[2.5rem]"
              )}
            >
              {showCursor ? (
                <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse rounded-sm" />
              ) : (
                <div className="prose prose-sm prose-olive max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || ""}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
