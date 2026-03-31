import { Zap, TrendingUp, AlertTriangle, FileText, FileWarning, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Suggestion {
  text: string;
  icon: LucideIcon;
}

const suggestions: Suggestion[] = [
  { text: "What should I focus on today?", icon: Zap },
  { text: "Summarize Meridian Industries", icon: TrendingUp },
  { text: "What are the top risks across my portfolio?", icon: AlertTriangle },
  { text: "Draft a Capital Readiness Memo for Meridian", icon: FileText },
  { text: "What data is missing for my clients?", icon: FileWarning },
  { text: "Compare my client assessment scores", icon: BarChart3 },
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
