import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClientExposureIndexStrip } from "@/components/clients/ClientExposureIndexStrip";
import { FounderSnapshotStrip } from "@/components/clients/FounderSnapshotStrip";
import { FounderMatrixStrip } from "@/components/clients/FounderMatrixStrip";
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
  description: string;
  defaultSubtasks: string[];
}

const PROTECT_CHECKLIST: ProtectItem[] = [
  {
    key: "q4_protect_ip",
    label: "Intellectual Property (IP)",
    description:
      "Annual IP audit — confirm all patents, trademarks, trade secrets, and licensing agreements are current, documented, and structurally protected.",
    defaultSubtasks: [
      "Audit all patents, trademarks, and copyrights held",
      "Review trade secrets and proprietary processes",
      "Confirm licensing agreements and brand protection are current",
      "Verify IP ownership structure (business vs. personal)",
    ],
  },
  {
    key: "q4_protect_asset",
    label: "Asset Strategy",
    description:
      "Annual asset protection review — confirm entity governance, liability shielding, and ownership safeguards remain structurally sound heading into the next cycle.",
    defaultSubtasks: [
      "Review entity formation and governance structure",
      "Assess liability shielding between personal and business assets",
      "Confirm ownership and decision-right documentation is current",
      "Evaluate asset transfer and protection mechanisms",
    ],
  },
  {
    key: "q4_protect_insurance",
    label: "Insurance Review",
    description:
      "Annual insurance audit — assess coverage across all risk dimensions for the coming year: business interruption, key person, D&O, professional liability, and estate planning.",
    defaultSubtasks: [
      "Review business interruption coverage for next year",
      "Assess key person insurance status",
      "Evaluate professional liability and D&O coverage",
      "Confirm estate planning insurance alignment",
    ],
  },
  {
    key: "q4_protect_capital",
    label: "Capital / Underwriting",
    description:
      "Annual capital and underwriting review — confirm financing structures, credit facilities, and capital stack are aligned with next-cycle objectives.",
    defaultSubtasks: [
      "Review current financing structures and credit facilities",
      "Assess capital stack alignment with next-year goals",
      "Confirm underwriting documentation is current",
      "Identify any capital gaps heading into the next cycle",
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProtectQ4PanelProps {
  clientId: string;
  clientName: string;
  entityType: "corp" | "llc" | null;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProtectQ4Panel({
  clientId,
  clientName,
  entityType,
  nextPhase,
  onPhaseComplete,
}: ProtectQ4PanelProps) {
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
    ).filter((t) => t.phase === "q4_protect");
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
          phase: "q4_protect",
          status: "todo",
          priority: "medium",
          subtasks: item.defaultSubtasks.map((title, i) => ({ title, done: false, sort_order: i })),
        });
      }
    }
  }, [tasksLoading, protectTasks, clientId, createTask]);

  const allDone =
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
      await updateClient.mutateAsync({ id: clientId, q4_phase: nextPhase });
      toast.success("Protect phase complete", { description: "Moving to Optionality phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const remainingCount = PROTECT_CHECKLIST.filter((i) => !taskMap[i.label]?.done).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Protect</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Annual review — confirm your protection architecture is structurally sound for the coming cycle.
        </p>
      </div>

      {/* Assessment strips */}
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

      {/* Annual protection checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Annual Protection Review
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Based on the assessments above — confirm each pillar of your protection architecture is current,
          documented, and structurally sound heading into the next annual cycle.
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
                <div key={item.key}>
                  <ChecklistItem
                    label={item.label}
                    isDone={task?.done ?? false}
                    subtasks={task?.subtasks ?? []}
                    isPending={updateTask.isPending}
                    onToggle={() => handleToggle(item.label)}
                    onSkip={() => {}}
                    onUnskip={() => {}}
                    onSubtasksChange={(subtasks) => handleSubtasksChange(item.label, subtasks)}
                  />
                  <p className="px-4 pb-3 pt-0 text-[11px] text-muted-foreground/80 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "All protection pillars complete."
              : `${remainingCount} ${remainingCount === 1 ? "item" : "items"} remaining`}
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
