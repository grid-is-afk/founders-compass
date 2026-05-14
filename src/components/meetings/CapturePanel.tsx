import { useState, useRef } from "react";
import {
  Sparkles, Upload, FileText, ChevronDown, CheckCircle2, XCircle,
  AlertCircle, Loader2, CheckCheck, Clock, Pencil, MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCaptureMeeting, useApplyCapture, useCheckTranscriptDuplicate,
  useUploadTranscript,
  type Meeting, type ProposedChange, type CaptureResult,
} from "@/hooks/useMeetingsApi";
import { useClientDocuments } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";

interface Props {
  meeting: Meeting;
  clientId: string;
}

type ItemState = "pending" | "approved" | "rejected" | "deferred" | "edited";

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
  open_question: "border-orange-500/30 bg-orange-50 text-orange-700",
};

const CONFIDENCE_COLORS: Record<ProposedChange["confidence"], string> = {
  high: "text-green-600",
  medium: "text-amber-600",
  low: "text-orange-600",
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

  // Per-item state: state + edited version of the change
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>({});
  const [editedChanges, setEditedChanges] = useState<Record<number, ProposedChange>>({});

  const [dupDialog, setDupDialog] = useState<{
    open: boolean; filename: string; file: File | null; existingDocId: string | null;
  }>({ open: false, filename: "", file: null, existingDocId: null });
  const [renameValue, setRenameValue] = useState("");

  const alreadyProcessed = !!meeting.processed_at;

  function getEffectiveChange(idx: number): ProposedChange {
    return editedChanges[idx] ?? captureResult!.proposed_changes[idx];
  }

  function setItemState(idx: number, state: ItemState) {
    setItemStates((prev) => ({ ...prev, [idx]: prev[idx] === state ? "pending" : state }));
  }

  function saveEdit(idx: number, updated: ProposedChange) {
    setEditedChanges((prev) => ({ ...prev, [idx]: updated }));
    setItemStates((prev) => ({ ...prev, [idx]: "edited" }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const dupCheck = await checkDuplicate.mutateAsync({ meetingId: meeting.id, filename: file.name });
    if (dupCheck.exists) {
      setDupDialog({ open: true, filename: file.name, file, existingDocId: dupCheck.document?.id ?? null });
      setRenameValue(file.name.replace(/(\.\w+)$/, "-copy$1"));
    } else {
      await doUploadTranscript(file, file.name);
    }
  }

  async function doUploadTranscript(file: File, name: string) {
    await uploadTranscript.mutateAsync({ meetingId: meeting.id, clientId, file, rename: name !== file.name ? name : undefined });
    setDupDialog({ open: false, filename: "", file: null, existingDocId: null });
  }

  function handleUseExisting() {
    if (dupDialog.existingDocId) setSelectedDocId(dupDialog.existingDocId);
    setDupDialog({ open: false, filename: "", file: null, existingDocId: null });
  }

  async function handleCapture() {
    const result = await capture.mutateAsync({
      meetingId: meeting.id,
      notes: notes.trim() || undefined,
      documentId: selectedDocId || undefined,
    });
    setCaptureResult(result);
    const initial: Record<number, ItemState> = {};
    result.proposed_changes.forEach((_, i) => (initial[i] = "pending"));
    setItemStates(initial);
    setEditedChanges({});
  }

  async function handleApplyAll() {
    if (!captureResult) return;
    const approved = captureResult.proposed_changes
      .map((c, i) => ({ change: getEffectiveChange(i), state: itemStates[i] }))
      .filter(({ state }) => state === "approved" || state === "edited")
      .map(({ change }) => change);

    await applyCapture.mutateAsync({ meetingId: meeting.id, clientId, approvedChanges: approved });
    setCaptureResult(null);
    setItemStates({});
    setEditedChanges({});
    setNotes("");
    setSelectedDocId("");
  }

  function approveAllHighConfidence() {
    if (!captureResult) return;
    const next: Record<number, ItemState> = { ...itemStates };
    captureResult.proposed_changes.forEach((c, i) => {
      if (c.confidence !== "low") next[i] = "approved";
    });
    setItemStates(next);
  }

  const approvedCount = Object.values(itemStates).filter((s) => s === "approved" || s === "edited").length;
  const deferredCount = Object.values(itemStates).filter((s) => s === "deferred").length;

  // ── Already processed view ────────────────────────────────────────────────
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
        {Array.isArray(meeting.decisions) && meeting.decisions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recorded</p>
            {(meeting.decisions as Array<{ text: string; type?: string }>).map((d, i) => (
              <div key={i} className="text-sm text-foreground flex items-start gap-2">
                {d.type === "open_question"
                  ? <AlertCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                  : <CheckCheck className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                }
                {d.text}
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setCaptureResult(null)}>
          <Sparkles className="w-3.5 h-3.5" />
          Re-capture
        </Button>
      </div>
    );
  }

  // ── Proposed changes review ───────────────────────────────────────────────
  if (captureResult) {
    return (
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">Meeting Summary</p>
          {captureResult.summary}
        </div>

        {/* Proposed changes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Proposed Changes ({captureResult.proposed_changes.length})
              {deferredCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  · {deferredCount} deferred
                </span>
              )}
            </p>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={approveAllHighConfidence}>
              <CheckCheck className="w-3.5 h-3.5" />
              Approve All High-Confidence
            </Button>
          </div>

          {captureResult.proposed_changes.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No proposed changes extracted.
            </p>
          )}

          {captureResult.proposed_changes.map((_, idx) => (
            <ProposedChangeRow
              key={idx}
              change={getEffectiveChange(idx)}
              state={itemStates[idx] ?? "pending"}
              onApprove={() => setItemState(idx, "approved")}
              onReject={() => setItemState(idx, "rejected")}
              onDefer={() => setItemState(idx, "deferred")}
              onSaveEdit={(updated) => saveEdit(idx, updated)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => { setCaptureResult(null); setItemStates({}); setEditedChanges({}); }}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {approvedCount} approved
            </span>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleApplyAll}
              disabled={approvedCount === 0 || applyCapture.isPending}
            >
              {applyCapture.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Applying...</>
                : <><CheckCircle2 className="w-3.5 h-3.5" />Apply Approved</>
              }
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Input form ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Post-Meeting Capture</p>
        <p className="text-xs text-muted-foreground">
          Paste your notes or upload a transcript. QB will extract action items and propose workplan changes.
        </p>
      </div>

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

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          Option B — Upload or Select Transcript
        </Label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx,.doc" onChange={handleFileChange} className="hidden" />
          <Button
            variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadTranscript.isPending || !!notes.trim()}
          >
            {uploadTranscript.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading...</>
              : <><Upload className="w-3.5 h-3.5" />Upload Transcript</>
            }
          </Button>
          {(documents as Array<{ id: string; name: string }>).length > 0 && (
            <Select value={selectedDocId} onValueChange={setSelectedDocId} disabled={!!notes.trim()}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Select from Data Room..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {(documents as Array<{ id: string; name: string }>).map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {meeting.transcript_name && (
          <p className="text-xs text-primary/80 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Linked transcript: {meeting.transcript_name}
            <button className="ml-1 underline text-muted-foreground hover:text-primary text-xs" onClick={() => setSelectedDocId(meeting.transcript_document_id ?? "")}>
              Use this
            </button>
          </p>
        )}
        <p className="text-xs text-muted-foreground italic">
          Uploaded transcripts are saved to your Data Room and become searchable by QB.
        </p>
      </div>

      <Button className="w-full gap-2" onClick={handleCapture} disabled={capture.isPending || (!notes.trim() && !selectedDocId)}>
        {capture.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" />Processing with QB...</>
          : <><Sparkles className="w-4 h-4" />Process with QB</>
        }
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
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="New filename..." />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setDupDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
            <Button variant="outline" size="sm" onClick={handleUseExisting}>Use Existing File</Button>
            <Button size="sm" onClick={() => dupDialog.file && doUploadTranscript(dupDialog.file, renameValue)} disabled={!renameValue.trim() || uploadTranscript.isPending}>
              Rename &amp; Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposedChangeRow — single change with approve / edit / reject / defer
// ---------------------------------------------------------------------------

interface ChangeRowProps {
  change: ProposedChange;
  state: ItemState;
  onApprove: () => void;
  onReject: () => void;
  onDefer: () => void;
  onSaveEdit: (updated: ProposedChange) => void;
}

function ProposedChangeRow({ change, state, onApprove, onReject, onDefer, onSaveEdit }: ChangeRowProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: change.title, detail: change.detail, suggested_assignee: change.suggested_assignee ?? "", suggested_due_date: change.suggested_due_date ?? "", suggested_phase: change.suggested_phase ?? "" });

  function handleSaveEdit() {
    onSaveEdit({ ...change, ...editForm, suggested_assignee: editForm.suggested_assignee || null, suggested_due_date: editForm.suggested_due_date || null, suggested_phase: editForm.suggested_phase || null });
    setEditing(false);
  }

  const isDeferred = state === "deferred";
  const isRejected = state === "rejected";
  const isApproved = state === "approved" || state === "edited";

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-colors",
      isApproved && "border-green-500/40 bg-green-50/50",
      isRejected && "border-border opacity-40",
      isDeferred && "border-border bg-muted/20 opacity-60",
      !isApproved && !isRejected && !isDeferred && "border-border bg-card"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5", CHANGE_TYPE_COLORS[change.type])}>
            {CHANGE_TYPE_LABELS[change.type]}
          </Badge>
          <span className="text-sm font-medium text-foreground leading-snug">{change.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={cn("text-[10px] font-semibold uppercase mr-1", CONFIDENCE_COLORS[change.confidence])}>
            {change.confidence}
          </span>
          {/* Approve */}
          <button onClick={onApprove} className={cn("p-1 rounded transition-colors", isApproved ? "text-green-600" : "text-muted-foreground hover:text-green-600")} title="Approve">
            <CheckCircle2 className="w-4 h-4" />
          </button>
          {/* Edit */}
          {!isRejected && !isDeferred && (
            <button onClick={() => setEditing((p) => !p)} className={cn("p-1 rounded transition-colors", editing ? "text-primary" : "text-muted-foreground hover:text-foreground")} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Defer */}
          <button onClick={onDefer} className={cn("p-1 rounded transition-colors", isDeferred ? "text-amber-600" : "text-muted-foreground hover:text-amber-600")} title="Defer">
            <Clock className="w-3.5 h-3.5" />
          </button>
          {/* Reject */}
          <button onClick={onReject} className={cn("p-1 rounded transition-colors", isRejected ? "text-destructive" : "text-muted-foreground hover:text-destructive")} title="Reject">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* State badges */}
      {isDeferred && <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-600">Deferred — excluded from apply</Badge>}
      {state === "edited" && <Badge variant="outline" className="text-[10px] border-blue-400/40 text-blue-600">Edited</Badge>}

      {/* Open question flag */}
      {change.type === "open_question" && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{change.detail || "Commitment lacks concrete owner or due date"}</span>
        </div>
      )}

      {/* Detail */}
      {change.detail && change.type !== "open_question" && (
        <p className="text-xs text-muted-foreground pl-1">{change.detail}</p>
      )}

      {/* Task update diff */}
      {change.type === "task_update" && change.existing_task_snapshot && (
        <div className="rounded-md border border-border bg-muted/30 text-xs p-2 space-y-1 pl-1">
          <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Current → Proposed</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground line-through">{change.existing_task_snapshot.title}</span>
            <span className="text-foreground font-medium">{change.title.replace(/^Update: /i, "")}</span>
            {change.existing_task_snapshot.status && (
              <>
                <span className="text-muted-foreground">{change.existing_task_snapshot.status}</span>
                <span className="text-foreground">→ {change.detail?.toLowerCase().includes("done") ? "done" : "updated"}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Meta chips for new tasks */}
      {change.type === "new_task" && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {change.suggested_assignee && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">Assignee: {change.suggested_assignee}</span>
          )}
          {change.suggested_due_date && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">Due: {change.suggested_due_date}</span>
          )}
          {change.suggested_phase && (
            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground capitalize">Phase: {change.suggested_phase}</span>
          )}
          {change.suggested_dependencies && (
            <span className="text-[10px] bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-amber-700">{change.suggested_dependencies}</span>
          )}
        </div>
      )}

      {/* Source excerpt + timestamp */}
      {(change.source_excerpt || change.source_timestamp) && (
        <div>
          <button onClick={() => setSourceOpen((p) => !p)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={cn("w-3 h-3 transition-transform", sourceOpen && "rotate-180")} />
            {sourceOpen ? "Hide source" : "Show source"}
            {change.source_timestamp && (
              <span className="ml-1 font-mono text-[9px] bg-muted rounded px-1">{change.source_timestamp}</span>
            )}
          </button>
          {sourceOpen && change.source_excerpt && (
            <blockquote className="mt-1 pl-2 border-l-2 border-muted text-xs text-muted-foreground italic">
              "{change.source_excerpt}"
            </blockquote>
          )}
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="space-y-2 border-t border-border pt-2 mt-1">
          <div className="space-y-1">
            <Label className="text-[10px]">Title</Label>
            <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Detail</Label>
            <Textarea value={editForm.detail} onChange={(e) => setEditForm((f) => ({ ...f, detail: e.target.value }))} className="text-xs min-h-[60px]" />
          </div>
          {change.type === "new_task" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Assignee</Label>
                <Input value={editForm.suggested_assignee} onChange={(e) => setEditForm((f) => ({ ...f, suggested_assignee: e.target.value }))} className="h-7 text-xs" placeholder="Name" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Due Date</Label>
                <Input type="date" value={editForm.suggested_due_date} onChange={(e) => setEditForm((f) => ({ ...f, suggested_due_date: e.target.value }))} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Phase</Label>
                <Input value={editForm.suggested_phase} onChange={(e) => setEditForm((f) => ({ ...f, suggested_phase: e.target.value }))} className="h-7 text-xs" placeholder="discover" />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-7 gap-1" onClick={handleSaveEdit}>
              <CheckCircle2 className="w-3 h-3" />
              Save &amp; Approve
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
