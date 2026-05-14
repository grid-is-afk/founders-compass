import { useState, useRef } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCaptureMeeting,
  useApplyCapture,
  useCheckTranscriptDuplicate,
  useUploadTranscript,
  type Meeting,
  type ProposedChange,
  type CaptureResult,
} from "@/hooks/useMeetingsApi";
import { useClientDocuments } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";

interface Props {
  meeting: Meeting;
  clientId: string;
}

const CHANGE_TYPE_LABELS: Record<ProposedChange["type"], string> = {
  new_task: "New Task",
  task_update: "Task Update",
  decision: "Decision",
  open_question: "Open Question",
};

const CHANGE_TYPE_COLORS: Record<ProposedChange["type"], string> = {
  new_task: "border-blue-500/30 bg-blue-50 text-blue-700",
  task_update: "border-amber-500/30 bg-amber-50 text-amber-700",
  decision: "border-green-500/30 bg-green-50 text-green-700",
  open_question: "border-purple-500/30 bg-purple-50 text-purple-700",
};

const CONFIDENCE_COLORS: Record<ProposedChange["confidence"], string> = {
  high: "text-green-600",
  medium: "text-amber-600",
  low: "text-muted-foreground",
};

export default function CapturePanel({ meeting, clientId }: Props) {
  const capture = useCaptureMeeting();
  const applyCapture = useApplyCapture();
  const checkDuplicate = useCheckTranscriptDuplicate();
  const uploadTranscript = useUploadTranscript();

  const { data: documents = [] } = useClientDocuments(clientId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [approvalState, setApprovalState] = useState<Record<number, "approved" | "rejected" | null>>({});

  // Duplicate detection dialog
  const [dupDialog, setDupDialog] = useState<{
    open: boolean;
    filename: string;
    file: File | null;
    existingDocId: string | null;
  }>({ open: false, filename: "", file: null, existingDocId: null });
  const [renameValue, setRenameValue] = useState("");

  const alreadyProcessed = !!meeting.processed_at;

  // ── Handle file selection ──────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change event
    e.target.value = "";

    const dupCheck = await checkDuplicate.mutateAsync({
      meetingId: meeting.id,
      filename: file.name,
    });

    if (dupCheck.exists) {
      setDupDialog({
        open: true,
        filename: file.name,
        file,
        existingDocId: dupCheck.document?.id ?? null,
      });
      setRenameValue(file.name.replace(/(\.\w+)$/, "-copy$1"));
    } else {
      await doUploadTranscript(file, file.name);
    }
  }

  async function doUploadTranscript(file: File, name: string) {
    await uploadTranscript.mutateAsync({
      meetingId: meeting.id,
      clientId,
      file,
      rename: name !== file.name ? name : undefined,
    });
    setDupDialog({ open: false, filename: "", file: null, existingDocId: null });
  }

  function handleUseExisting() {
    if (dupDialog.existingDocId) {
      setSelectedDocId(dupDialog.existingDocId);
    }
    setDupDialog({ open: false, filename: "", file: null, existingDocId: null });
  }

  // ── Run capture ────────────────────────────────────────────────────────────
  async function handleCapture() {
    const result = await capture.mutateAsync({
      meetingId: meeting.id,
      notes: notes.trim() || undefined,
      documentId: selectedDocId || undefined,
    });
    setCaptureResult(result);
    const initialState: Record<number, null> = {};
    result.proposed_changes.forEach((_, i) => (initialState[i] = null));
    setApprovalState(initialState);
  }

  // ── Apply approved changes ─────────────────────────────────────────────────
  async function handleApplyAll() {
    if (!captureResult) return;
    const approved = captureResult.proposed_changes.filter(
      (_, i) => approvalState[i] === "approved"
    );
    await applyCapture.mutateAsync({
      meetingId: meeting.id,
      clientId,
      approvedChanges: approved,
    });
    setCaptureResult(null);
    setApprovalState({});
    setNotes("");
    setSelectedDocId("");
  }

  function toggleApproval(idx: number, action: "approved" | "rejected") {
    setApprovalState((prev) => ({
      ...prev,
      [idx]: prev[idx] === action ? null : action,
    }));
  }

  function approveAll() {
    if (!captureResult) return;
    const next: Record<number, "approved"> = {};
    captureResult.proposed_changes.forEach((c, i) => {
      if (c.confidence !== "low") next[i] = "approved";
    });
    setApprovalState(next);
  }

  const approvedCount = Object.values(approvalState).filter((v) => v === "approved").length;

  // ── Already processed view ─────────────────────────────────────────────────
  if (alreadyProcessed && !captureResult) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-medium">Meeting captured</span>
          <span className="text-muted-foreground text-xs">
            · {new Date(meeting.processed_at!).toLocaleDateString()}
          </span>
        </div>
        {meeting.decisions && meeting.decisions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Decisions Recorded
            </p>
            {meeting.decisions.map((d, i) => (
              <div key={i} className="text-sm text-foreground flex items-start gap-2">
                <CheckCheck className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {d.text}
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setCaptureResult(null)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Re-capture
        </Button>
      </div>
    );
  }

  // ── Proposed changes review ────────────────────────────────────────────────
  if (captureResult) {
    return (
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Meeting Summary
          </p>
          {captureResult.summary}
        </div>

        {/* Proposed changes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Proposed Changes ({captureResult.proposed_changes.length})
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={approveAll}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Approve All High-Confidence
            </Button>
          </div>

          {captureResult.proposed_changes.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No proposed changes extracted. The notes may not contain actionable items.
            </p>
          )}

          {captureResult.proposed_changes.map((change, idx) => (
            <ProposedChangeRow
              key={idx}
              change={change}
              state={approvalState[idx] ?? null}
              onApprove={() => toggleApproval(idx, "approved")}
              onReject={() => toggleApproval(idx, "rejected")}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setCaptureResult(null);
              setApprovalState({});
            }}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {approvedCount} change{approvedCount !== 1 ? "s" : ""} approved
            </span>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleApplyAll}
              disabled={approvedCount === 0 || applyCapture.isPending}
            >
              {applyCapture.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Apply Approved
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Input form ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Post-Meeting Capture</p>
        <p className="text-xs text-muted-foreground">
          Paste your notes or upload a transcript. QB will extract action items and propose workplan changes.
        </p>
      </div>

      {/* Option A: Paste notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          Option A — Paste Notes
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste your meeting notes or transcript here..."
          className="min-h-[120px] text-sm"
          disabled={!!selectedDocId}
        />
      </div>

      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground px-2">OR</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Option B: Upload / select from Data Room */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          Option B — Upload or Select Transcript
        </Label>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx,.doc"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadTranscript.isPending || !!notes.trim()}
          >
            {uploadTranscript.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload Transcript
              </>
            )}
          </Button>

          {documents.length > 0 && (
            <Select
              value={selectedDocId}
              onValueChange={setSelectedDocId}
              disabled={!!notes.trim()}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Select from Data Room..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {(documents as Array<{ id: string; name: string }>).map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {meeting.transcript_name && (
          <p className="text-xs text-primary/80 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Linked transcript: {meeting.transcript_name}
            <button
              className="ml-1 underline text-muted-foreground hover:text-primary text-xs"
              onClick={() => setSelectedDocId(meeting.transcript_document_id ?? "")}
            >
              Use this
            </button>
          </p>
        )}

        <p className="text-xs text-muted-foreground italic">
          Uploaded transcripts are saved to your Data Room under "Meeting Transcripts" and become searchable by QB.
        </p>
      </div>

      <Button
        className="w-full gap-2"
        onClick={handleCapture}
        disabled={capture.isPending || (!notes.trim() && !selectedDocId)}
      >
        {capture.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing with QB...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Process with QB
          </>
        )}
      </Button>

      {/* Duplicate detection dialog */}
      <Dialog open={dupDialog.open} onOpenChange={(open) => !open && setDupDialog((d) => ({ ...d, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              File Already Exists
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              A file named <span className="font-semibold text-foreground">"{dupDialog.filename}"</span> already exists in the Data Room.
            </p>
            <div className="space-y-1.5">
              <Label>Rename and upload as:</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="New filename..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDupDialog((d) => ({ ...d, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseExisting}
            >
              Use Existing File
            </Button>
            <Button
              size="sm"
              onClick={() => dupDialog.file && doUploadTranscript(dupDialog.file, renameValue)}
              disabled={!renameValue.trim() || uploadTranscript.isPending}
            >
              Rename &amp; Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposedChangeRow
// ---------------------------------------------------------------------------

interface ChangeRowProps {
  change: ProposedChange;
  state: "approved" | "rejected" | null;
  onApprove: () => void;
  onReject: () => void;
}

function ProposedChangeRow({ change, state, onApprove, onReject }: ChangeRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        state === "approved" && "border-green-500/40 bg-green-50/50",
        state === "rejected" && "border-border opacity-50",
        state === null && "border-border bg-card"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5", CHANGE_TYPE_COLORS[change.type])}
          >
            {CHANGE_TYPE_LABELS[change.type]}
          </Badge>
          <span className="text-sm font-medium text-foreground leading-snug">{change.title}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn("text-[10px] font-semibold uppercase", CONFIDENCE_COLORS[change.confidence])}>
            {change.confidence}
          </span>
          <button
            onClick={onApprove}
            className={cn(
              "p-1 rounded transition-colors",
              state === "approved"
                ? "text-green-600"
                : "text-muted-foreground hover:text-green-600"
            )}
            aria-label="Approve"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={onReject}
            className={cn(
              "p-1 rounded transition-colors",
              state === "rejected"
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
            aria-label="Reject"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail */}
      {change.detail && (
        <p className="text-xs text-muted-foreground pl-2">{change.detail}</p>
      )}

      {/* Meta for new tasks */}
      {change.type === "new_task" && (change.suggested_assignee || change.suggested_due_date || change.suggested_phase) && (
        <div className="flex flex-wrap gap-2 pl-2">
          {change.suggested_assignee && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
              Assignee: {change.suggested_assignee}
            </span>
          )}
          {change.suggested_due_date && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
              Due: {change.suggested_due_date}
            </span>
          )}
          {change.suggested_phase && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground capitalize">
              Phase: {change.suggested_phase}
            </span>
          )}
        </div>
      )}

      {/* Source excerpt toggle */}
      {change.source_excerpt && (
        <div>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide source" : "Show source"}
          </button>
          {expanded && (
            <blockquote className="mt-1 pl-2 border-l-2 border-muted text-xs text-muted-foreground italic">
              "{change.source_excerpt}"
            </blockquote>
          )}
        </div>
      )}
    </div>
  );
}
