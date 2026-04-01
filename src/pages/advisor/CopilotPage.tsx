import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import CopilotMessages from "@/components/copilot/CopilotMessages";
import CopilotInput from "@/components/copilot/CopilotInput";
import CopilotSuggestions from "@/components/copilot/CopilotSuggestions";
import { useClientContext } from "@/hooks/useClientContext";

const CopilotPage = () => {
  const { messages, clearConversation, sendMessage } = useCopilotContext();
  const { selectedClient } = useClientContext();

  return (
    <div className="h-[calc(100vh-3.5rem-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Quarterback</h1>
            <p className="text-sm text-muted-foreground">
              AI copilot for {selectedClient.name}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            className="gap-2 text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mb-5">
                <Sparkles className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                How can I help?
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
                I know everything about your clients, their assessments, risk alerts, and engagement progress. Ask me anything.
              </p>
              <div className="w-full max-w-lg">
                <CopilotSuggestions onSelect={sendMessage} />
              </div>
            </div>
          ) : (
            <CopilotMessages />
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border">
          <CopilotInput />
        </div>
      </div>
    </div>
  );
};

export default CopilotPage;
