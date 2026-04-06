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
  { text: "Create a sprint task for Meridian's Q2 review", icon: CheckSquare },
  { text: "Generate a Capital Readiness Memo for Meridian", icon: FileText },
  { text: "Move Summit Logistics to discovery stage", icon: ArrowRight },
  { text: "Flag a risk for Atlas — customer concentration above 30%", icon: AlertTriangle },
  { text: "Schedule a quarterly review with Pinnacle for next month", icon: Calendar },
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
