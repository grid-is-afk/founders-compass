import { Sparkles } from "lucide-react";
import { useCopilotContext } from "./CopilotProvider";

export default function CopilotTrigger() {
  const { togglePanel, isOpen } = useCopilotContext();

  if (isOpen) return null;

  return (
    <button
      onClick={togglePanel}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full gradient-gold flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow focus-visible:ring-2 focus-visible:ring-ring outline-none"
      title="Open Quarterback Copilot"
      aria-label="Open Quarterback Copilot"
    >
      <Sparkles className="w-5 h-5 text-accent-foreground" />
    </button>
  );
}
