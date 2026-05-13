import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopilotContext } from "./CopilotProvider";
import CopilotMessages from "./CopilotMessages";
import CopilotInput from "./CopilotInput";
import CopilotSuggestions from "./CopilotSuggestions";
import { cn } from "@/lib/utils";

export default function CopilotPanel() {
  const { isOpen, setIsOpen, messages, clearConversation, sendMessage } = useCopilotContext();

  return (
    <div
      role="dialog"
      aria-label="Quarterback Copilot"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col",
        "w-[440px] rounded-2xl border border-border bg-card shadow-2xl",
        "transition-all duration-200 ease-out origin-bottom-right",
        isOpen
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none"
      )}
      style={{ height: "min(620px, calc(100vh - 96px))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-none">Quarterback</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">AI Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-xs text-muted-foreground h-7 px-2"
            >
              Clear
            </Button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground mb-1">
              How can I help?
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-5">
              Ask me about clients, documents, risks, or deliverables.
            </p>
            <CopilotSuggestions onSelect={sendMessage} />
          </div>
        ) : (
          <CopilotMessages />
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0">
        <CopilotInput />
      </div>
    </div>
  );
}
