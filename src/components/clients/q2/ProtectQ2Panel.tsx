import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClientExposureIndexStrip } from "@/components/clients/ClientExposureIndexStrip";
import { FounderSnapshotStrip } from "@/components/clients/FounderSnapshotStrip";
import { FounderMatrixStrip } from "@/components/clients/FounderMatrixStrip";
import { IpValueFrameworkStrip } from "./IpValueFrameworkStrip";
import { ChecklistItem, type SubtaskItem } from "@/components/clients/ChecklistItem";
import { useClientExposureIndex } from "@/hooks/useClientExposureIndex";
import { useClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { useClientFounderSnapshot } from "@/hooks/useClientFounderSnapshot";
import { useClientTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Checklist definition
// ---------------------------------------------------------------------------

interface ProtectItem {
  key: string;
  label: string;
}

const PROTECT_CHECKLIST: ProtectItem[] = [
  { key: "q2_protect_ip", label: "Intellectual Property (IP)" },
  { key: "q2_protect_asset", label: "Asset Strategy" },
  { key: "q2_protect_insurance", label: "Insurance Review" },
  { key: "q2_protect_capital", label: "Capital / Underwriting" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProtectQ2PanelProps {
  clientId: string;
  clientName: string;
  entityType: "corp" | "llc" | null;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProtectQ2Panel({
  clientId,
  clientName,
  entityType,
  nextPhase,
  onPhaseComplete,
}: ProtectQ2PanelProps) {
  const { data: exposureRecord } = useClientExposureIndex(clientId);
  const { data: matrixRecord } = useClientFounderMatrix(clientId);
  const { data: snapshotRecord } = useClientFounderSnapshot(clientId);

  const { data: tasksRaw = [], isLoading: tasksLoading } = useClientTasks(clientId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateClient = useUpdateClient();

  const protectTasks = useMemo(() => {
    return (
      tasksRaw as Array<{ id: string; title: string; phase: string; status: string; subtasks: SubtaskItem[] }>
    ).filter((t) => t.phase === "q2_protect");
  }, [tasksRaw]);

  const taskMap = useMemo(() => {
    const map: Record<string, { id: string; done: boolean; subtasks: SubtaskItem[] }> = {};
    for (const t of protectTasks) {
      map[t.title] = { id: t.id, done: t.status === "done", subtasks: t.subtasks ?? [] };
    }
    return map;
  }, [protectTasks]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (tasksLoading || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(protectTasks.map((t) => t.title));
    for (const item of PROTECT_CHECKLIST) {
      if (!existing.has(item.label)) {
        createTask.mutate({
          client_id: clientId,
          title: item.label,
          phase: "q2_protect",
          status: "todo",
          priority: "medium",
        });
      }
    }
  }, [tasksLoading, protectTasks, clientId, createTask]);

  const assessmentsComplete =
    !!(exposureRecord?.category_scores) &&
    !!(matrixRecord?.completed_at) &&
    !!(snapshotRecord?.completed_at);

  const architectureAllDone =
    PROTECT_CHECKLIST.length > 0 &&
    PROTECT_CHECKLIST.every((item) => taskMap[item.label]?.done);

  const handleToggle = async (label: string) => {
    const task = taskMap[label];
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, clientId, status: task.done ? "todo" : "done" });
    } catch {
      toast.error("Failed to update checklist item");
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

  const handleMarkComplete = async () => {
    if (!nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q2_phase: nextPhase });
      toast.success("Protect phase complete", { description: "Moving to Grow phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Protect</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review all assessments and build a capital protection architecture.
        </p>
      </div>

      {/* Assessment strips — records prefetched in Q2Page, no blanket load gate */}
      <div className="space-y-2">
        <ClientExposureIndexStrip
          clientId={clientId}
          clientName={clientName}
          record={exposureRecord ?? null}
        />
        <FounderSnapshotStrip
          clientId={clientId}
          clientName={clientName}
          record={snapshotRecord ?? null}
        />
        <FounderMatrixStrip
          clientId={clientId}
          clientName={clientName}
          entityType={entityType}
          record={matrixRecord ?? null}
        />
      </div>

      {/* Capital Alignment & Protection Architecture checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capital Alignment & Protection Architecture
        </p>
        {tasksLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            {PROTECT_CHECKLIST.map((item) => {
              const task = taskMap[item.label];
              return (
                <ChecklistItem
                  key={item.key}
                  label={item.label}
                  isDone={task?.done ?? false}
                  subtasks={task?.subtasks ?? []}
                  isPending={updateTask.isPending}
                  onToggle={() => handleToggle(item.label)}
                  onSkip={() => {}}
                  onUnskip={() => {}}
                  onSubtasksChange={(subtasks) => handleSubtasksChange(item.label, subtasks)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* IP Value Framework strip */}
      <IpValueFrameworkStrip clientId={clientId} />

      {/* Phase completion */}
      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {assessmentsComplete && architectureAllDone
              ? "All items complete."
              : `${PROTECT_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length} architecture items remaining`}
          </p>
          <Button
            size="sm"
            disabled={updateClient.isPending}
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
