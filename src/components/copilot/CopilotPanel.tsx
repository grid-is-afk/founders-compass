import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCopilotContext } from "./CopilotProvider";
import CopilotMessages from "./CopilotMessages";
import CopilotInput from "./CopilotInput";
import CopilotSuggestions from "./CopilotSuggestions";

export default function CopilotPanel() {
  const { isOpen, setIsOpen, messages, clearConversation, sendMessage } = useCopilotContext();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[480px] p-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-gold flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
            <SheetTitle className="font-display text-base font-semibold">Quarterback</SheetTitle>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-xs text-muted-foreground h-7"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-8">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                How can I help?
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Ask me about clients, assessments, risks, or deliverables.
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
      </SheetContent>
    </Sheet>
  );
}
