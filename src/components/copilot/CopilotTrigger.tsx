import { Sparkles } from "lucide-react";
import { useCopilotContext } from "./CopilotProvider";

export default function CopilotTrigger() {
  const { togglePanel, isOpen } = useCopilotContext();

  if (isOpen) return null;

  return (
    <button
      onClick={togglePanel}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 h-11 rounded-full gradient-gold shadow-lg hover:shadow-xl transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none"
      aria-label="Open Quarterback Copilot"
    >
      <Sparkles className="w-4 h-4 text-accent-foreground flex-shrink-0" />
      <span className="text-sm font-medium text-accent-foreground font-display">Quarterback</span>
    </button>
  );
}
