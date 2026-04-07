import {
  Zap,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckSquare,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Suggestion {
  text: string;
  icon: LucideIcon;
}

const suggestions: Suggestion[] = [
  { text: "What should I focus on today?", icon: Zap },
  { text: "Create a new sprint task for my client", icon: CheckSquare },
  { text: "Generate a Capital Readiness Memo", icon: FileText },
  { text: "Add a new prospect to my pipeline", icon: ArrowRight },
  { text: "Flag a risk alert for a client", icon: AlertTriangle },
  { text: "Schedule a quarterly review meeting", icon: Calendar },
];

interface CopilotSuggestionsProps {
  onSelect: (text: string) => void;
}

export default function CopilotSuggestions({ onSelect }: CopilotSuggestionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {suggestions.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-sm text-foreground cursor-pointer transition-colors text-left"
          >
            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="leading-snug">{s.text}</span>
          </button>
        );
      })}
    </div>
  );
}
