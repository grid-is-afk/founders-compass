import { NotebookPen, Mic, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SENTIMENT_CONFIG } from "@/hooks/useStakeholders";
import type { StakeholderSignal, Sentiment } from "@/hooks/useStakeholders";

function SentimentPillReadOnly({ sentiment }: { sentiment: Sentiment }) {
  const cfg = SENTIMENT_CONFIG[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full text-[10px] px-1.5 py-0 border font-medium",
        cfg.container
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full inline-block mr-1 flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Signal type icon
// ---------------------------------------------------------------------------

function SignalIcon({
  signal_type,
  sentiment,
}: {
  signal_type: StakeholderSignal["signal_type"];
  sentiment?: Sentiment | null;
}) {
  const base = "w-3.5 h-3.5 mt-0.5 flex-shrink-0";

  if (signal_type === "manual_note") {
    return <NotebookPen className={cn(base, "text-primary")} />;
  }
  if (signal_type === "meeting_mention") {
    return <Mic className={cn(base, "text-muted-foreground")} />;
  }
  if (signal_type === "sentiment") {
    const isNegative = sentiment === "negative" || sentiment === "at_risk";
    const colorClass =
      sentiment === "at_risk"
        ? "text-destructive"
        : sentiment === "negative"
        ? "text-accent"
        : "text-primary";
    return isNegative ? (
      <TrendingDown className={cn(base, colorClass)} />
    ) : (
      <TrendingUp className={cn(base, colorClass)} />
    );
  }
  // Fallback for future signal types (email_*, calendar_event, meeting_attended)
  return <NotebookPen className={cn(base, "text-muted-foreground")} />;
}

// ---------------------------------------------------------------------------
// Left border + bg by signal type
// ---------------------------------------------------------------------------

const TYPE_STYLE: Record<string, string> = {
  manual_note: "border-l-2 border-primary/40",
  meeting_mention: "border-l-2 border-muted-foreground/30",
  sentiment: "border-l-2 border-accent/40 bg-accent/5",
};

function typeStyle(signal_type: string): string {
  return TYPE_STYLE[signal_type] ?? "border-l-2 border-border/30";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  signal: StakeholderSignal;
  onSourceClick?: () => void;
}

export default function SignalTimelineItem({ signal, onSourceClick }: Props) {
  const relativeTime = formatDistanceToNow(new Date(signal.ts), { addSuffix: true });
  const valueText = signal.value ?? "";
  const isLong = valueText.length > 80;

  return (
    <div className="flex items-start gap-2 py-1">
      <SignalIcon signal_type={signal.signal_type} sentiment={signal.sentiment} />

      {/* Content block with left border accent */}
      <div className={cn("flex-1 min-w-0 rounded-sm pl-2", typeStyle(signal.signal_type))}>
        <div className="flex items-start gap-1 min-w-0">
          {/* Value text — truncated at 2 lines, tooltip for long text */}
          {isLong ? (
            <TooltipProvider>
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <p className="text-xs text-foreground leading-snug flex-1 min-w-0 line-clamp-2 cursor-default">
                    {valueText}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{valueText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-xs text-foreground leading-snug flex-1 min-w-0 line-clamp-2">
              {valueText}
            </p>
          )}

          {/* Relative time — right-aligned */}
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5 ml-1">
            {relativeTime}
          </span>
        </div>

        {/* Sentiment pill — only for sentiment-type signals */}
        {signal.signal_type === "sentiment" && signal.sentiment && (
          <div className="mt-0.5">
            <SentimentPillReadOnly sentiment={signal.sentiment} />
          </div>
        )}

        {/* Source link — only when linked to a meeting AND a navigation handler is provided */}
        {signal.source_table === "meetings" && onSourceClick && (
          <button
            onClick={onSourceClick}
            className="mt-0.5 text-[10px] text-primary underline-offset-2 hover:underline flex items-center gap-0.5"
            aria-label="View meeting recap"
          >
            <ExternalLink className="w-3 h-3" />
            Meeting recap
          </button>
        )}
      </div>
    </div>
  );
}
