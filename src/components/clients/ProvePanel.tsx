import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, ChevronRight, Loader2, AlertCircle, BarChart3, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClientSixCsStrip } from "./ClientSixCsStrip";
import { ChecklistItem, type SubtaskItem } from "./ChecklistItem";
import { SixCsModal } from "@/components/prospects/SixCsModal";
import { useClientSixCsBaseline } from "@/hooks/useClientSixCsBaseline";
import { useUpsertClientSixCs } from "@/hooks/useClientSixCs";
import { useClientTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";

// Labels seeded from the static fallback (used before a Six C's baseline existed).
// When a real baseline is present, these orphaned tasks are auto-cleaned up.
const STATIC_FALLBACK_LABELS = new Set([
  "Balance Sheet",
  "Income Statement",
  "Personal Financial Statement",
  "Asset Summary",
  "IP / Patent Documentation",
]);
import { useClientDocuments } from "@/hooks/useDocuments";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProvePanelProps {
  clientId: string;
  /** FIX-15: Passed from Q1DiscoverPage — the phase to advance to on completion. Null = last phase, hide button. */
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProvePanel({ clientId, nextPhase, onPhaseComplete }: ProvePanelProps) {
  const navigate = useNavigate();
  const [sixCsOpen, setSixCsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const { data: baseline, isLoading: baselineLoading } = useClientSixCsBaseline(clientId);
  const { data: tasksRaw = [], isLoading: tasksLoading } = useClientTasks(clientId);
  const { data: documents = [] } = useClientDocuments(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateClient = useUpdateClient();
  const upsertClientSixCs = useUpsertClientSixCs(clientId);

  // Prove-phase tasks (document checklist)
  const proveTasks = useMemo(() => {
    return (
      tasksRaw as Array<{
        id: string;
        title: string;
        phase: string;
        status: string;
        notes: string | null;
        subtasks: SubtaskItem[];
        document_id: string | null;
        skip_reason: string | null;
      }>
    ).filter((t) => t.phase === "prove");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, {
      id: string;
      done: boolean;
      skipped: boolean;
      skip_reason: string | null;
      subtasks: SubtaskItem[];
      document_id: string | null;
    }> = {};
    for (const t of proveTasks) {
      map[t.title] = {
        id: t.id,
        done: t.status === "done",
        skipped: t.status === "skipped",
        skip_reason: t.skip_reason ?? null,
        subtasks: t.subtasks ?? [],
        document_id: t.document_id ?? null,
      };
    }
    return map;
  }, [proveTasks]);

  // FIX-6: useRef instead of useState — prevents duplicate task seeding on remount.
  const seededRef = useRef(false);
  useEffect(() => {
    if (baselineLoading || tasksLoading || seededRef.current || !baseline) return;
    seededRef.current = true;
    const existing = new Set(proveTasks.map((t) => t.title));
    for (const doc of baseline.document_checklist) {
      if (!existing.has(doc.label)) {
        createTask.mutate({
          client_id: clientId,
          title: doc.label,
          phase: "prove",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [baselineLoading, tasksLoading, baseline, proveTasks, clientId, createTask]);

  // Auto-cleanup: when a real Six C's baseline exists, remove any tasks that were
  // seeded from the static fallback (before the assessment was completed).
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (baselineLoading || tasksLoading || cleanedRef.current || !baseline?.has_baseline) return;
    cleanedRef.current = true;
    for (const task of proveTasks) {
      if (STATIC_FALLBACK_LABELS.has(task.title)) {
        deleteTask.mutate({ id: task.id, clientId });
      }
    }
  }, [baselineLoading, tasksLoading, baseline, proveTasks, clientId, deleteTask]);

  const docItems = baseline?.document_checklist ?? [];
  const docItemLabels = useMemo(() => new Set(docItems.map((d) => d.label)), [docItems]);

  // Manual tasks: prove tasks not seeded from the baseline checklist
  const manualTasks = useMemo(
    () => proveTasks.filter((t) => !docItemLabels.has(t.title)),
    [proveTasks, docItemLabels]
  );

  // FIX-17: All items (auto + manual) must be done or skipped to enable phase advance.
  const allDone = useMemo(() => {
    const autoComplete = docItems.length === 0 || docItems.every((d) => {
      const t = taskMap[d.label];
      return t?.done || t?.skipped;
    });
    const manualComplete = manualTasks.every((t) => t.status === "done" || t.status === "skipped");
    return autoComplete && manualComplete;
  }, [docItems, taskMap, manualTasks]);

  const handleToggle = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        clientId,
        status: task.done ? "todo" : "done",
      });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleSkip = async (label: string, reason: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: "skipped", skip_reason: reason });
    } catch {
      toast.error("Failed to skip checklist item");
    }
  };

  const handleUnskip = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: "todo", skip_reason: null });
    } catch {
      toast.error("Failed to undo skip");
    }
  };

  const handleSubtasksChange = async (label: string, subtasks: SubtaskItem[]) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, subtasks });
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  const handleLinkDocument = async (label: string, documentId: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, document_id: documentId, status: "done" });
    } catch {
      toast.error("Failed to link document");
    }
  };

  const handleUnlinkDocument = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, document_id: null });
    } catch {
      toast.error("Failed to unlink document");
    }
  };

  // Handlers for manual tasks (identified by id rather than label)
  const handleManualToggle = async (taskId: string, currentStatus: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, status: currentStatus === "done" ? "todo" : "done" });
    } catch {
      toast.error("Failed to update checklist item");
    }
  };

  const handleManualSkip = async (taskId: string, reason: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, status: "skipped", skip_reason: reason });
    } catch {
      toast.error("Failed to skip checklist item");
    }
  };

  const handleManualUnskip = async (taskId: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, status: "todo", skip_reason: null });
    } catch {
      toast.error("Failed to undo skip");
    }
  };

  const handleManualSubtasksChange = async (taskId: string, subtasks: SubtaskItem[]) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, subtasks });
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  const handleManualLinkDocument = async (taskId: string, documentId: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, document_id: documentId, status: "done" });
    } catch {
      toast.error("Failed to link document");
    }
  };

  const handleManualUnlinkDocument = async (taskId: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, clientId, document_id: null });
    } catch {
      toast.error("Failed to unlink document");
    }
  };

  const handleDeleteManual = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync({ id: taskId, clientId });
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleAddDocument = async () => {
    const label = newLabel.trim();
    const category = newCategory.trim();
    if (!label || !category) return;
    try {
      await createTask.mutateAsync({
        client_id: clientId,
        title: label,
        phase: "prove",
        status: "todo",
        priority: "medium",
        notes: category,
      });
      setNewLabel("");
      setNewCategory("");
      setShowAddForm(false);
    } catch {
      toast.error("Failed to add document");
    }
  };

  const handleMarkComplete = async () => {
    if (!allDone || !nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q1_phase: nextPhase });
      toast.success("Prove phase complete", { description: "Moving to Diagnose phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const isLoading = baselineLoading || tasksLoading;

  // Build a lookup map for linked document names
  const documentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const doc of documents) {
      map[doc.id] = doc.name;
    }
    return map;
  }, [documents]);

  const docOptions = documents.map((d) => ({ id: d.id, name: d.name, category: d.category ?? null }));

  const remainingCount = docItems.filter((d) => {
    const t = taskMap[d.label];
    return !t?.done && !t?.skipped;
  }).length + manualTasks.filter((t) => t.status !== "done" && t.status !== "skipped").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Prove</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Collect and validate the documents that prove the founder's capital position.
        </p>
      </div>

      {/* Data Room link — navigates to client-scoped tab so the tab bar stays visible */}
      <button
        type="button"
        onClick={() => navigate(`/advisor/clients/${clientId}/data-room`)}
        className="w-full rounded-md border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Open Data Room</span>
        </div>
        <ChevronRight className="w-4 h-4 text-primary/60" />
      </button>

      {/* Six C's Baseline */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Six C's Baseline
        </p>
        <ClientSixCsStrip
          baseline={baseline}
          isLoading={baselineLoading}
          onRetake={() => setSixCsOpen(true)}
        />

        {/* Run Six C's assessment for clients who skipped the prospect phase */}
        {!baseline?.has_baseline && !baselineLoading && (
          <button
            type="button"
            onClick={() => setSixCsOpen(true)}
            className="w-full flex items-center gap-2 rounded-md border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5 text-left hover:bg-accent/10 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="text-xs font-medium text-accent">Run Six C's Assessment</span>
          </button>
        )}
      </div>

      {/* Document Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Document Checklist
        </p>

        {baseline?.has_baseline && !baselineLoading ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            This checklist is generated directly from the Six C's assessment. Each document targets a dimension where the founder scored weak or adequate — so wherever there's a gap, this is the proof needed to close it.
          </p>
        ) : !baselineLoading && (
          <div className="rounded-md border border-dashed border-amber-400/40 bg-amber-50/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              No Six C's assessment found for this client's linked prospect. Showing standard document checklist.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="h-32 rounded-lg bg-muted/30 animate-pulse" />
        ) : (docItems.length === 0 && manualTasks.length === 0) ? (
          <div className="text-sm text-muted-foreground italic">No documents required.</div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            {/* Auto-generated items from Six C's baseline */}
            {docItems.map((doc) => {
              const task = taskMap[doc.label];
              const linkedDocId = task?.document_id ?? null;
              return (
                <ChecklistItem
                  key={`${doc.category}-${doc.label}`}
                  label={doc.label}
                  category={doc.category}
                  isDone={task?.done ?? false}
                  isSkipped={task?.skipped ?? false}
                  skipReason={task?.skip_reason ?? null}
                  subtasks={task?.subtasks ?? []}
                  isPending={updateTask.isPending}
                  onToggle={() => handleToggle(doc.label)}
                  onSkip={(reason) => handleSkip(doc.label, reason)}
                  onUnskip={() => handleUnskip(doc.label)}
                  onSubtasksChange={(subtasks) => handleSubtasksChange(doc.label, subtasks)}
                  documents={docOptions}
                  linkedDocumentId={linkedDocId}
                  linkedDocumentName={linkedDocId ? documentNameMap[linkedDocId] ?? null : null}
                  onLinkDocument={(docId) => handleLinkDocument(doc.label, docId)}
                  onUnlinkDocument={() => handleUnlinkDocument(doc.label)}
                />
              );
            })}

            {/* Manually added items */}
            {manualTasks.map((t) => {
              const linkedDocId = t.document_id ?? null;
              return (
                <ChecklistItem
                  key={t.id}
                  label={t.title}
                  category={t.notes ?? undefined}
                  isDone={t.status === "done"}
                  isSkipped={t.status === "skipped"}
                  skipReason={t.skip_reason ?? null}
                  subtasks={t.subtasks ?? []}
                  isPending={updateTask.isPending}
                  onToggle={() => handleManualToggle(t.id, t.status)}
                  onSkip={(reason) => handleManualSkip(t.id, reason)}
                  onUnskip={() => handleManualUnskip(t.id)}
                  onSubtasksChange={(subtasks) => handleManualSubtasksChange(t.id, subtasks)}
                  documents={docOptions}
                  linkedDocumentId={linkedDocId}
                  linkedDocumentName={linkedDocId ? documentNameMap[linkedDocId] ?? null : null}
                  onLinkDocument={(docId) => handleManualLinkDocument(t.id, docId)}
                  onUnlinkDocument={() => handleManualUnlinkDocument(t.id)}
                  onDelete={() => handleDeleteManual(t.id)}
                />
              );
            })}
          </div>
        )}

        {/* Add Document button + inline form */}
        {!isLoading && (
          <div className="space-y-2">
            {showAddForm ? (
              <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-foreground">Add document to checklist</p>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Document name (e.g. Board deck)"
                  className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Category (e.g. Credibility)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddDocument();
                    if (e.key === "Escape") setShowAddForm(false);
                  }}
                  className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setNewLabel(""); setNewCategory(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newLabel.trim() || !newCategory.trim() || createTask.isPending}
                    onClick={handleAddDocument}
                    className="text-xs font-medium px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createTask.isPending ? "Adding…" : "Add"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add document
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phase completion — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All documents collected — ready to advance."
              : `${remainingCount} document${remainingCount === 1 ? "" : "s"} remaining`}
          </p>
          <Button
            size="sm"
            disabled={!allDone || updateClient.isPending}
            onClick={handleMarkComplete}
            className="gap-1.5"
          >
            {updateClient.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Mark Phase Complete <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Six C's Modal — client mode (run first time or retake) */}
      <SixCsModal
        open={sixCsOpen}
        onClose={() => setSixCsOpen(false)}
        prospectName="Client Assessment"
        existingRecord={baseline?.six_cs as never ?? null}
        onSave={async (payload) => {
          await upsertClientSixCs.mutateAsync(payload);
        }}
      />
    </div>
  );
}
