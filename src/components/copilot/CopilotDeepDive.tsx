import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, BookOpen, Sparkles, FileText } from "lucide-react";
import { useCopilotContext } from "./CopilotProvider";
import CopilotInput from "./CopilotInput";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/copilotApi";

// Accept H1 or H2 for the title — Claude sometimes drops a level depending
// on conversational context. Em-dash, en-dash, and hyphen all accepted as
// the title/name separator.
const BRIEFING_HEADER_RE = /^#{1,2}\s*Client Onboarding Brief/im;
const BRIEFING_TITLE_RE = /^#{1,2}\s*Client Onboarding Brief\s*[—–-]\s*(.+)$/im;

// ReactMarkdown's `h2` renderer receives `children` as React nodes — when the
// heading contains inline formatting (e.g. `## **Bold**`), naive `String(children)`
// returns "[object Object]". Walk the tree to extract plain text.
function nodeText(node: React.ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

function findBriefingMessage(messages: ChatMessage[]): ChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.content && BRIEFING_HEADER_RE.test(m.content)) {
      return m;
    }
  }
  return null;
}

function extractClientName(content: string | null | undefined): string | null {
  if (!content) return null;
  const match = content.match(BRIEFING_TITLE_RE);
  return match ? match[1].trim() : null;
}

export default function CopilotDeepDive() {
  const { isDeepDive, setDeepDive, setIsOpen, messages, isStreaming, sendMessage } =
    useCopilotContext();
  const followUpBottomRef = useRef<HTMLDivElement>(null);

  // Closing the deep dive also closes the underlying Copilot panel — otherwise
  // the user is left with a 440px sidebar floating after they dismiss the
  // fullscreen view, which they did not open.
  const closeDeepDive = useCallback(() => {
    setDeepDive(false);
    setIsOpen(false);
  }, [setDeepDive, setIsOpen]);

  // ESC closes deep dive (and panel)
  useEffect(() => {
    if (!isDeepDive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDeepDive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDeepDive, closeDeepDive]);

  const briefingMsg = useMemo(() => findBriefingMessage(messages), [messages]);
  const clientName = extractClientName(briefingMsg?.content) ?? "Client";

  // Follow-up messages = everything AFTER the briefing message
  const followUpMessages = useMemo(() => {
    if (!briefingMsg) return [];
    const idx = messages.indexOf(briefingMsg);
    return idx >= 0 ? messages.slice(idx + 1) : [];
  }, [messages, briefingMsg]);

  useEffect(() => {
    followUpBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [followUpMessages]);

  const handleExpand = useCallback(
    (sectionName: string) => {
      const prompt = `Expand the "${sectionName}" section of ${clientName}'s engagement briefing. Surface deeper detail, supporting evidence from meetings and docs, and anything we may have under-discussed.`;
      void sendMessage(prompt);
    },
    [clientName, sendMessage],
  );

  // Memoize the markdown component map: without this, a new object reference
  // is created on every streaming token, forcing ReactMarkdown to remount the
  // whole rendered briefing tree per token (visible as flicker).
  const briefingComponents = useMemo(
    () => ({
      h2: ({ children }: { children?: React.ReactNode }) => {
        const sectionName = nodeText(children).replace(/[:：]\s*$/, "").trim();
        return (
          <div className="group flex items-center justify-between gap-4 mt-7 mb-2 pb-1 border-b border-border/60">
            <h2 className="text-base font-semibold text-foreground m-0">
              {children}
            </h2>
            {!isStreaming && sectionName && (
              <button
                type="button"
                onClick={() => handleExpand(sectionName)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0"
                aria-label={`Expand ${sectionName} with QB AI`}
              >
                <Sparkles className="w-3 h-3" />
                Expand with QB AI
              </button>
            )}
          </div>
        );
      },
    }),
    [isStreaming, handleExpand],
  );

  if (!isDeepDive) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Deep dive briefing"
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight text-foreground truncate">
              Deep dive: Engagement Briefing — {clientName}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Click "Expand with QB AI" on any section, or type a follow-up below
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeDeepDive}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Close deep dive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body — two columns */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-border min-h-0">
        {/* LEFT — Briefing reader */}
        <div className="overflow-y-auto bg-card min-h-0">
          <div className="px-8 py-6 max-w-3xl mx-auto">
            {!briefingMsg && isStreaming ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="ml-2">Generating onboarding brief…</span>
              </div>
            ) : !briefingMsg ? (
              <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No briefing detected
                </p>
                <p className="text-xs">
                  Close this view and click "Generate Onboarding Brief".
                </p>
              </div>
            ) : (
              <div className="prose prose-sm prose-olive max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-hr:border-border/60">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={briefingComponents}>
                  {briefingMsg.content || ""}
                </ReactMarkdown>
                {isStreaming && messages[messages.length - 1] === briefingMsg && (
                  <span className="inline-block w-1.5 h-4 bg-primary/60 align-middle ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Chat thread */}
        <div className="flex flex-col overflow-hidden bg-background min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6 max-w-2xl mx-auto">
              {followUpMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <p className="font-display text-base font-semibold text-foreground mb-1">
                    Ready to dive deeper
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Click "Expand with QB AI" on any briefing section,
                    <br />
                    or type a question below.
                  </p>
                </div>
              ) : (
                <FollowUpThread
                  messages={followUpMessages}
                  isStreaming={isStreaming}
                />
              )}
              <div ref={followUpBottomRef} />
            </div>
          </div>
          <div className="border-t border-border flex-shrink-0 bg-card">
            <CopilotInput />
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowUpThread({
  messages,
  isStreaming,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const showSpinner =
          isStreaming && isLast && msg.role === "assistant" && !msg.content;
        const showInlineCursor =
          isStreaming && isLast && msg.role === "assistant" && !!msg.content;

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
            <div className="flex-shrink-0 w-6 h-6 rounded-md gradient-gold flex items-center justify-center mt-0.5">
              <span className="text-accent-foreground text-[10px] font-semibold font-display">
                F
              </span>
            </div>
            <div className="flex flex-col gap-2 max-w-[85%]">
              <div
                className={cn(
                  "bg-card border border-border rounded-xl rounded-bl-sm px-4 py-3 text-sm border-l-2 border-l-primary",
                  showSpinner && "min-h-[2.5rem]"
                )}
              >
                {showSpinner ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Quarterback is thinking…
                    </span>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-olive max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || ""}
                    </ReactMarkdown>
                    {showInlineCursor && (
                      <span
                        className="inline-block w-1.5 h-4 bg-primary/60 align-middle ml-0.5 animate-pulse"
                        aria-hidden
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
