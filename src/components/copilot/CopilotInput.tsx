import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { useCopilotContext } from "./CopilotProvider";
import { cn } from "@/lib/utils";

export default function CopilotInput() {
  const { sendMessage, cancelStream, isStreaming } = useCopilotContext();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // max 4 rows ≈ 96px
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustHeight();
  };

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    sendMessage(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card border-t border-border p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about clients, risks, deliverables..."
          disabled={isStreaming}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{ minHeight: "38px", maxHeight: "96px" }}
        />

        {isStreaming ? (
          <button
            onClick={cancelStream}
            className="flex-shrink-0 w-9 h-9 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center hover:bg-destructive/20 transition-colors"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={cn(
              "flex-shrink-0 w-9 h-9 gradient-gold rounded-lg flex items-center justify-center transition-all",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:shadow-md active:scale-95"
            )}
            title="Send message"
          >
            <Send className="w-4 h-4 text-accent-foreground" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
