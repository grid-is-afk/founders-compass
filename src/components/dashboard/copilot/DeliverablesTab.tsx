import { useState, useRef, useEffect } from "react";
import { FileText, Loader2, Pencil, Eye, X, Save, Download, Archive } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useClientContext } from "@/hooks/useClientContext";
import {
  useClientDeliverables,
  useUpdateDeliverable,
  useArchiveDeliverable,
  useUnarchiveDeliverable,
} from "@/hooks/useDeliverables";
import type { UpdateDeliverableResult } from "@/hooks/useDeliverables";
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
  generated_at?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  client_approved_at?: string | null;
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

/**
 * Options shown in the per-card review status dropdown — the three-stage
 * lifecycle: advisor drafts → advisor approves → founder (client) approves.
 * Reaching "Client Approved" is what confirms a review prep's objectives.
 */
const REVIEW_STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "client_approved", label: "Client Approved" },
] as const;

type ReviewStatusValue = (typeof REVIEW_STATUS_OPTIONS)[number]["value"];

/** Shape of a mapped deliverable used throughout the component. */
interface MappedDeliverable {
  id: string;
  title: string;
  client: string;
  status: string;
  engine: string;
  review_status: ReviewStatusValue | null;
  content: string | null;
  generated_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  client_approved_at: string | null;
}

/** Tailwind classes for the pill-shaped dropdown trigger by review_status. */
function reviewStatusTriggerClass(status: ReviewStatusValue | null): string {
  if (status === "client_approved") {
    // final / founder-agreed
    return "bg-green-50 text-green-700 border border-green-500/30 hover:bg-green-100";
  }
  if (status === "approved") {
    // interim — advisor signed off, awaiting client
    return "bg-blue-50 text-blue-700 border border-blue-500/30 hover:bg-blue-100";
  }
  // pending_review or null (treated as pending_review)
  return "bg-amber-50 text-amber-700 border border-amber-500/30 hover:bg-amber-100";
}

const DeliverablesTab = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawDeliverables = [] } = useClientDeliverables(selectedClientId);
  const { togglePanel } = useCopilotContext();
  const updateDeliverable = useUpdateDeliverable();
  const archiveDeliverable = useArchiveDeliverable();
  const unarchiveDeliverable = useUnarchiveDeliverable();

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  // Single-instance preview modal state — null = closed
  const [previewingDeliverable, setPreviewingDeliverable] = useState<
    MappedDeliverable | null
  >(null);

  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());

  const handleArchive = (del: MappedDeliverable) => {
    if (archivingIds.has(del.id)) return;
    setArchivingIds((prev) => new Set(prev).add(del.id));
    archiveDeliverable.mutate(
      { id: del.id, clientId: selectedClientId },
      {
        onSuccess: (data) => {
          toast.success(`${del.title} archived`, {
            description: data.dataRoomArchived
              ? "Hidden from Deliverables and Data Room."
              : "Hidden from Deliverables.",
            action: {
              label: "Undo",
              onClick: () =>
                unarchiveDeliverable.mutate(
                  { id: del.id, clientId: selectedClientId },
                  {
                    onSuccess: () =>
                      toast.success(`${del.title} restored`),
                    onError: () =>
                      toast.error("Could not undo archive — please refresh."),
                  }
                ),
            },
          });
        },
        onError: () => toast.error("Could not archive — please try again."),
        onSettled: () =>
          setArchivingIds((prev) => {
            const next = new Set(prev);
            next.delete(del.id);
            return next;
          }),
      }
    );
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingId]);

  function mapDeliverable(d: DbDeliverable): MappedDeliverable {
    return {
      id: d.id,
      title: resolveDeliverableTitle(d.title),
      client: selectedClient.name,
      status: d.status ?? "needs_data",
      engine: d.engine ?? "",
      review_status: (d.review_status ?? null) as ReviewStatusValue | null,
      content: d.content ?? null,
      // generated_at is the stable content-write timestamp; falls back to
      // created_at for any unmigrated row.
      generated_at: d.generated_at ?? d.created_at ?? null,
      approved_at: d.approved_at ?? null,
      approved_by_name: d.approved_by_name ?? null,
      client_approved_at: d.client_approved_at ?? null,
    };
  }

  const deliverables = (rawDeliverables as DbDeliverable[]).map(mapDeliverable);

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

  const handleReviewStatusChange = (
    del: MappedDeliverable,
    value: string
  ) => {
    updateDeliverable.mutate(
      { id: del.id, clientId: selectedClientId, review_status: value },
      {
        onSuccess: (data: UpdateDeliverableResult) => {
          const dataRoomRenamed = data?.dataRoomRenamed === true;
          if (value === "client_approved") {
            toast.success(
              "Client approved — any review objectives are now confirmed"
            );
          } else if (value === "approved") {
            toast.success(
              dataRoomRenamed ? "Advisor approved — Data Room file renamed" : "Advisor approved"
            );
          } else {
            toast(
              dataRoomRenamed
                ? "Reverted to Pending Review — Data Room file suffix restored"
                : "Reverted to Pending Review"
            );
          }
        },
        onError: () => {
          toast.error("Failed to update review status");
        },
      }
    );
  };

  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleDownload = async (id: string, title: string) => {
    if (downloadingIds.has(id)) return;
    toast.success(`Downloading ${title}`);
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

  if (deliverables.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground pb-1">
          AI-generated documents ready to review, approve, or send to your client.
        </p>
        {deliverables.map((del) => {
          const st = (
            deliverableStatusLabel as Record<string, { label: string; style: string }>
          )[del.status] ?? { label: del.status, style: "bg-muted text-muted-foreground" };

          const isEditing = editingId === del.id;
          const hasContent = !!del.content;
          const isDownloading = downloadingIds.has(del.id);

          const effectiveReviewStatus: ReviewStatusValue =
            del.review_status === "approved" || del.review_status === "client_approved"
              ? del.review_status
              : "pending_review";

          const timestampLabel = del.generated_at
            ? `Generated ${formatDistanceToNow(new Date(del.generated_at), { addSuffix: true })}`
            : "Not yet generated";
          const approvalLabel =
            del.review_status === "client_approved" && del.client_approved_at
              ? `Client approved ${formatDistanceToNow(new Date(del.client_approved_at), { addSuffix: true })}`
              : del.review_status === "approved" && del.approved_at
              ? `Advisor approved ${formatDistanceToNow(new Date(del.approved_at), { addSuffix: true })} by ${del.approved_by_name ?? "an advisor"}`
              : null;

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
                  {approvalLabel && (
                    <p className="text-[10px] text-emerald-700">
                      {approvalLabel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Status area: static badge when not ready, dropdown when ready */}
                  {del.status !== "ready" ? (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        st.style
                      )}
                    >
                      Not Generated
                    </span>
                  ) : (
                    <Select
                      value={effectiveReviewStatus}
                      onValueChange={(value) => handleReviewStatusChange(del, value)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 min-w-[130px] text-[10px] font-medium rounded-full px-3 py-0.5",
                          "[&>svg]:w-3 [&>svg]:h-3",
                          reviewStatusTriggerClass(effectiveReviewStatus)
                        )}
                      >
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
                  )}

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

                  {/* Preview — always visible; opens modal */}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => setPreviewingDeliverable(del)}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </Button>
                  )}

                  {/* Download — always visible; disabled when no content */}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => handleDownload(del.id, del.title)}
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

                  {/* Archive — soft delete with undo */}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleArchive(del)}
                      title="Archive (hide from this list and Data Room)"
                      disabled={archivingIds.has(del.id)}
                    >
                      {archivingIds.has(del.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Archive className="w-3 h-3" />
                      )}
                      Archive
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
            </div>
          );
        })}
      </div>

      {/* Single preview modal — shared across all cards */}
      <Dialog
        open={!!previewingDeliverable}
        onOpenChange={(open) => {
          if (!open) setPreviewingDeliverable(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl w-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-semibold">
              {previewingDeliverable?.title ?? ""}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground">
              {previewingDeliverable?.generated_at
                ? `Generated ${formatDistanceToNow(
                    new Date(previewingDeliverable.generated_at),
                    { addSuffix: true }
                  )}`
                : "Not yet generated"}
            </p>
            {previewingDeliverable?.review_status === "approved" &&
              previewingDeliverable.approved_at && (
                <p className="text-[10px] text-emerald-700">
                  Approved {formatDistanceToNow(
                    new Date(previewingDeliverable.approved_at),
                    { addSuffix: true }
                  )}{" "}
                  by {previewingDeliverable.approved_by_name ?? "an advisor"}
                </p>
              )}
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-1 py-2">
            {previewingDeliverable?.content ? (
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
                  {previewingDeliverable.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                <FileText className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-xs font-medium text-muted-foreground text-center">
                  This document hasn&apos;t been generated yet.
                </p>
                <p className="text-[10px] text-muted-foreground/60 text-center">
                  Open the client&apos;s dashboard and use the matching generator to create it.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setPreviewingDeliverable(null)}
            >
              <X className="w-3 h-3" />
              Close
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={!previewingDeliverable?.content || downloadingIds.has(previewingDeliverable?.id ?? "")}
              onClick={() => {
                if (previewingDeliverable) {
                  handleDownload(previewingDeliverable.id, previewingDeliverable.title);
                }
              }}
            >
              <Download className="w-3 h-3" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliverablesTab;
