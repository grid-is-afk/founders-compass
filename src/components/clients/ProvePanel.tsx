import { useEffect, useMemo, useRef } from "react";
import { FolderOpen, CheckSquare, Square, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClientSixCsStrip } from "./ClientSixCsStrip";
import { useClientSixCsBaseline } from "@/hooks/useClientSixCsBaseline";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";
import { cn } from "@/lib/utils";

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
  const { data: baseline, isLoading: baselineLoading } = useClientSixCsBaseline(clientId);
  const { data: tasksRaw = [], isLoading: tasksLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  // Prove-phase tasks (document checklist)
  const proveTasks = useMemo(() => {
    return (tasksRaw as Array<{ id: string; title: string; phase: string; status: string }>).filter(
      (t) => t.phase === "prove"
    );
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean }> = {};
    for (const t of proveTasks) {
      map[t.title] = { id: t.id, done: t.status === "done" };
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

  const docItems = baseline?.document_checklist ?? [];
  // FIX-17: When all Six C's scores are high, the checklist is empty — treat that
  // as complete rather than permanently blocking phase advancement.
  const allDone =
    docItems.length === 0 || docItems.every((d) => taskMap[d.label]?.done);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Prove</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Collect and validate the documents that prove the founder's capital position.
        </p>
      </div>

      {/* Data Room link */}
      <button
        type="button"
        onClick={() => navigate("/advisor/data-room")}
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
        <ClientSixCsStrip baseline={baseline} isLoading={baselineLoading} />
      </div>

      {/* Document Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Document Checklist
        </p>

        {!baseline?.has_baseline && !baselineLoading && (
          <div className="rounded-md border border-dashed border-amber-400/40 bg-amber-50/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              No Six C's assessment found for this client's linked prospect. Showing standard document checklist.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="h-32 rounded-lg bg-muted/30 animate-pulse" />
        ) : docItems.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No documents required.</div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            {docItems.map((doc) => {
              const task = taskMap[doc.label];
              const isDone = task?.done ?? false;

              return (
                <button
                  key={`${doc.category}-${doc.label}`}
                  type="button"
                  disabled={updateTask.isPending}
                  onClick={() => handleToggle(doc.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20",
                    updateTask.isPending && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm truncate",
                        isDone ? "line-through text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {doc.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">{doc.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase completion — hidden if this is the last phase (nextPhase === null) */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All documents collected — ready to advance."
              : `${docItems.filter((d) => !taskMap[d.label]?.done).length} documents remaining`}
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
    </div>
  );
}
