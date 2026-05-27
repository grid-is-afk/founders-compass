import { useState, useRef, useEffect } from "react";
import { Send, FileText, Loader2, CheckCircle2, Pencil, Eye, EyeOff, X, Save, Download } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useClientContext } from "@/hooks/useClientContext";
import {
  useClientDeliverables,
  useUpdateDeliverable,
  useGenerateQuarterlyReview,
} from "@/hooks/useDeliverables";
import { deliverableStatusLabel } from "@/lib/copilotStyles";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";

interface DbDeliverable {
  id: string;
  title: string;
  status: string;
  engine?: string | null;
  review_status?: string | null;
  content?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

const TITLE_DISPLAY_MAP: Record<string, string> = {
  capital_readiness_memo: "Capital Readiness Memo",
  client_brief: "Client Brief",
  risk_summary: "Risk Summary",
  board_update: "Board-Style Update",
  assessment_summary: "Assessment Summary",
  quarterly_review: "Quarterly Review",
  meeting_recap: "Meeting Recap",
  monthly_status_update: "Monthly Status Update",
  onboarding_brief: "Onboarding Brief",
};

/**
 * Return a human-readable title for a deliverable.
 * If the raw title is in TITLE_DISPLAY_MAP (a generic slug), use the mapped display name.
 * Otherwise preserve the raw title as-is — specific titles like "Q1 2026 Review Prep"
 * are already human-readable and should not be overwritten.
 */
function resolveDeliverableTitle(rawTitle: string): string {
  return TITLE_DISPLAY_MAP[rawTitle] ?? rawTitle;
}

const REVIEW_STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "sent_to_client", label: "Sent to Client" },
] as const;

const DeliverablesTab = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawDeliverables = [] } = useClientDeliverables(selectedClientId);
  const { togglePanel } = useCopilotContext();
  const updateDeliverable = useUpdateDeliverable();
  const { mutate: generateQR, isPending: isGenerating } = useGenerateQuarterlyReview();

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  // Preview state — per deliverable id, true = preview mode
  const [previewIds, setPreviewIds] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingId]);

  const deliverables = (rawDeliverables as DbDeliverable[]).map((d) => ({
    id: d.id,
    title: resolveDeliverableTitle(d.title),
    client: selectedClient.name,
    status: d.status ?? "needs_data",
    engine: d.engine ?? "",
    review_status: d.review_status ?? null,
    content: d.content ?? null,
    updated_at: d.updated_at ?? d.created_at ?? null,
  }));

  const quarterlyReview = deliverables.find(
    (d) => d.title === "Quarterly Review"
  ) ?? null;

  const handleGenerateQR = () => {
    if (!selectedClientId) return;
    generateQR({ clientId: selectedClientId });
  };

  const handleReviewStatusChange = (value: string) => {
    if (!quarterlyReview) return;
    updateDeliverable.mutate({
      id: quarterlyReview.id,
      clientId: selectedClientId,
      review_status: value,
    });
  };

  const handleSend = (id: string) => {
    updateDeliverable.mutate(
      { id, clientId: selectedClientId, review_status: "sent_to_client" },
      { onSuccess: () => toast("Marked as sent to client") }
    );
  };

  const handleEditOpen = (id: string, currentContent: string | null) => {
    setEditingId(id);
    setEditContent(currentContent ?? "");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleEditSave = (id: string) => {
    updateDeliverable.mutate(
      { id, clientId: selectedClientId, content: editContent },
      {
        onSuccess: () => {
          toast("Draft saved");
          setEditingId(null);
          setEditContent("");
        },
        onError: () => {
          toast.error("Failed to save draft");
        },
      }
    );
  };

  const handleTogglePreview = (id: string) => {
    setPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleDownload = async (id: string) => {
    if (downloadingIds.has(id)) return;
    setDownloadingIds((prev) => new Set(prev).add(id));
    try {
      const res = await apiFetch(`/deliverables/${id}/document.docx`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error((body as { error?: string }).error || `Server returned ${res.status}`);
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      // Prefer RFC 5987 filename*=UTF-8'' (preserves em-dashes etc.); fall back to ASCII filename=
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = disposition.match(/filename="([^"]+)"/);
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : asciiMatch?.[1] ?? `deliverable-${id}.docx`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Could not download document", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (deliverables.length === 0 && !isGenerating) {
    return (
      <div className="space-y-4">
        <DraftQuarterlyReviewAction
          hasQR={false}
          isGenerating={false}
          quarterlyReview={null}
          onGenerate={handleGenerateQR}
          onReviewStatusChange={handleReviewStatusChange}
        />
        <div className="text-center py-4 space-y-3">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No deliverables yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Deliverables are client-ready outputs generated by Quarterback AI — quarterly reviews, status updates, meeting recaps, and strategic memos.
            </p>
          </div>
          <button
            onClick={togglePanel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Open Quarterback to generate one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DraftQuarterlyReviewAction
        hasQR={!!quarterlyReview}
        isGenerating={isGenerating}
        quarterlyReview={quarterlyReview}
        onGenerate={handleGenerateQR}
        onReviewStatusChange={handleReviewStatusChange}
      />
      <p className="text-xs text-muted-foreground pb-1">
        AI-generated documents ready to review, approve, or send to your client.
      </p>
      {deliverables.map((del) => {
        const st = (
          deliverableStatusLabel as Record<string, { label: string; style: string }>
        )[del.status] ?? { label: del.status, style: "bg-muted text-muted-foreground" };

        const isEditing = editingId === del.id;
        const isPreviewing = previewIds.has(del.id);
        const hasContent = !!del.content;
        const isDownloading = downloadingIds.has(del.id);

        const timestampLabel = del.updated_at
          ? `Generated ${formatDistanceToNow(new Date(del.updated_at), { addSuffix: true })}`
          : "Not yet generated";

        return (
          <div
            key={del.id}
            className="rounded-md border border-border hover:bg-muted/30 transition-colors"
          >
            {/* Header row */}
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{del.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {del.client} · {timestampLabel}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    st.style
                  )}
                >
                  {st.label}
                </span>
                {/* Edit button — only when not currently editing */}
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleEditOpen(del.id, del.content)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                )}
                {/* Preview toggle — always visible when not in edit mode */}
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleTogglePreview(del.id)}
                  >
                    {isPreviewing ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Source
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        Preview
                      </>
                    )}
                  </Button>
                )}
                {/* Download button — always visible; disabled when no content */}
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleDownload(del.id)}
                    title={!hasContent ? "Not yet generated" : "Download as .docx"}
                    disabled={!hasContent || isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    Download
                  </Button>
                )}
                {del.status === "ready" && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleSend(del.id)}
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </Button>
                )}
              </div>
            </div>

            {/* Inline editor */}
            {isEditing && (
              <div className="px-3 pb-3 space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={cn(
                    "w-full min-h-[200px] max-h-[480px] resize-y rounded-md border border-border",
                    "bg-background text-sm text-foreground font-mono leading-relaxed",
                    "p-3 focus:outline-none focus:ring-1 focus:ring-primary/50",
                    "placeholder:text-muted-foreground"
                  )}
                  placeholder="Write or paste markdown content here…"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleEditSave(del.id)}
                    disabled={updateDeliverable.isPending}
                  >
                    {updateDeliverable.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleEditCancel}
                    disabled={updateDeliverable.isPending}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Preview panel — always rendered when toggled open */}
            {isPreviewing && !isEditing && (
              <div className="px-3 pb-3">
                {hasContent ? (
                  <div
                    className={cn(
                      "rounded-md border border-border bg-muted/20 p-3",
                      "prose prose-sm max-w-none text-foreground",
                      "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2",
                      "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-3",
                      "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2",
                      "[&_p]:text-xs [&_p]:leading-relaxed [&_p]:mb-2",
                      "[&_ul]:text-xs [&_ul]:space-y-0.5 [&_ul]:pl-4 [&_ul]:list-disc",
                      "[&_ol]:text-xs [&_ol]:space-y-0.5 [&_ol]:pl-4 [&_ol]:list-decimal",
                      "[&_li]:leading-relaxed",
                      "[&_strong]:font-semibold",
                      "[&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded",
                      "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {del.content!}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/20 p-4 flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-muted-foreground text-center">
                      This document hasn&apos;t been generated yet.
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 text-center">
                      Open the client&apos;s dashboard and use Prepare Review (or the matching generator) to create it.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface DraftQRActionProps {
  hasQR: boolean;
  isGenerating: boolean;
  quarterlyReview: { id: string; review_status: string | null } | null;
  onGenerate: () => void;
  onReviewStatusChange: (value: string) => void;
}

const DraftQuarterlyReviewAction = ({
  hasQR,
  isGenerating,
  quarterlyReview,
  onGenerate,
  onReviewStatusChange,
}: DraftQRActionProps) => {
  if (isGenerating) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-border bg-muted/20">
        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
        <span className="text-sm text-muted-foreground">Drafting Quarterly Review…</span>
      </div>
    );
  }

  if (hasQR && quarterlyReview) {
    return (
      <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-foreground">Review generated</span>
        </div>
        <Select
          value={quarterlyReview.review_status ?? "pending_review"}
          onValueChange={onReviewStatusChange}
        >
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full text-xs h-8"
      onClick={onGenerate}
    >
      <FileText className="w-3.5 h-3.5" />
      Draft Quarterly Review
    </Button>
  );
};

export default DeliverablesTab;
