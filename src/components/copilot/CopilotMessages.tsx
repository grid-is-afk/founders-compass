import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  BarChart3,
  AlertTriangle,
  Calendar,
  Zap,
  Download,
} from "lucide-react";
import { useCopilotContext } from "./CopilotProvider";
import { cn } from "@/lib/utils";
import type { ChatAction } from "@/lib/copilotApi";

// ── Action badge ────────────────────────────────────────────────────────────

interface BadgeConfig {
  icon: React.ElementType;
  label: string;
  color: string;
}

const ACTION_BADGE_MAP: Record<string, BadgeConfig> = {
  task_created: {
    icon: CheckCircle2,
    label: "Task Created",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  },
  prospect_moved: {
    icon: ArrowRight,
    label: "Prospect Updated",
    color: "bg-primary/15 text-primary border-primary/20",
  },
  report_generated: {
    icon: FileText,
    label: "Report Generated",
    color: "bg-accent/15 text-accent-foreground border-accent/20",
  },
  instrument_updated: {
    icon: BarChart3,
    label: "Instrument Updated",
    color: "bg-primary/15 text-primary border-primary/20",
  },
  risk_flagged: {
    icon: AlertTriangle,
    label: "Risk Flagged",
    color: "bg-destructive/15 text-destructive border-destructive/20",
  },
  meeting_scheduled: {
    icon: Calendar,
    label: "Meeting Scheduled",
    color: "bg-accent/15 text-accent-foreground border-accent/20",
  },
};

function ActionBadge({ action }: { action: ChatAction }) {
  const config: BadgeConfig = ACTION_BADGE_MAP[action.type] ?? {
    icon: Zap,
    label: "Action Taken",
    color: "bg-muted text-muted-foreground border-border",
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ── Report download ─────────────────────────────────────────────────────────

function downloadReport(
  content: string,
  clientName: string,
  reportType: string
) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType}_${clientName.replace(/\s+/g, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ──────────────────────────────────────────────────────────

export default function CopilotMessages() {
  const { messages, isStreaming } = useCopilotContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const showCursor =
          isStreaming && isLast && msg.role === "assistant" && !msg.content;
        const actions: ChatAction[] = msg.actions ?? [];
        const reportAction = actions.find((a) => a.type === "report_generated");

        if (msg.role === "user") {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="bg-primary/10 rounded-xl rounded-br-sm px-4 py-3 text-sm max-w-[85%]">
                <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex gap-2.5 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0 w-6 h-6 rounded-md gradient-gold flex items-center justify-center mt-0.5">
              <span className="text-accent-foreground text-[10px] font-semibold font-display">
                F
              </span>
            </div>

            {/* Message bubble + action metadata */}
            <div className="flex flex-col gap-2 max-w-[85%]">
              <div
                className={cn(
                  "bg-card border border-border rounded-xl rounded-bl-sm px-4 py-3 text-sm border-l-2 border-l-primary",
                  showCursor && "min-h-[2.5rem]"
                )}
              >
                {showCursor ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Quarterback is thinking...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-olive max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || ""}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Action badges */}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((action, i) => (
                    <ActionBadge key={i} action={action} />
                  ))}
                </div>
              )}

              {/* Download button for generated reports */}
              {reportAction && msg.content && (
                <button
                  onClick={() =>
                    downloadReport(
                      msg.content,
                      (reportAction.clientName as string) ?? "Client",
                      (reportAction.reportType as string) ?? "report"
                    )
                  }
                  className="self-start flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 text-muted-foreground transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download Report (.md)
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
