import { useState } from "react";
import { CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMethodologyRecommendations,
  type MethodologyGap,
} from "@/hooks/useDashboardIntelligence";
import { useCreateTask } from "@/hooks/useTasks";

// ---------------------------------------------------------------------------
// Individual gap card
// ---------------------------------------------------------------------------

interface GapCardProps {
  gap: MethodologyGap;
  clientId: string;
  isAdded: boolean;
  onAdded: (activityId: string) => void;
}

const GapCard = ({ gap, clientId, isAdded, onAdded }: GapCardProps) => {
  const createTask = useCreateTask();

  const handleAddToPlan = () => {
    createTask.mutate(
      {
        title: gap.suggestedTaskTitle,
        priority: gap.suggestedTaskPriority,
        client_id: clientId,
        assignee: "advisor",
        phase: "kickoff",
      },
      {
        onSuccess: () => onAdded(gap.activityId),
      }
    );
  };

  return (
    <div className="p-3 rounded-md border border-border bg-card space-y-2">
      {/* Header row: name + badges */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-snug">
          {gap.activityName}
        </p>
        <span
          className={cn(
            "inline-flex flex-shrink-0 items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            gap.isRequired
              ? "text-destructive bg-destructive/10 border-destructive/20"
              : "text-muted-foreground bg-muted/40 border-border"
          )}
        >
          {gap.isRequired ? "Required" : "Optional"}
        </span>
      </div>

      {/* Framework badge */}
      {gap.framework && (
        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
          {gap.framework}
        </span>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {gap.description}
      </p>

      {/* Action row */}
      <div className="flex items-center justify-end pt-0.5">
        {isAdded ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Added to Plan
          </span>
        ) : (
          <button
            onClick={handleAddToPlan}
            disabled={createTask.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors",
              "border-border bg-card hover:bg-muted/40 text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Plus className="w-3 h-3" />
            {createTask.isPending ? "Adding..." : "Add to Plan"}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

const MethodologyTab = ({ clientId }: { clientId?: string }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useMethodologyRecommendations(clientId ?? "");

  const handleAdded = (activityId: string) => {
    setAddedIds((prev) => new Set(prev).add(activityId));
  };

  if (!clientId) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Select a client to see methodology recommendations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3 rounded-md border border-border bg-card animate-pulse"
          >
            <div className="h-4 w-3/4 rounded bg-muted mb-2" />
            <div className="h-3 w-full rounded bg-muted mb-1" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const gaps = data?.gaps ?? [];
  const phase = data?.phase;
  const quarter = data?.quarter;

  if (gaps.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">
          All methodology activities are on track
        </h3>
        <p className="text-sm text-muted-foreground">
          {phase && quarter
            ? `No gaps detected for the ${phase} phase (Q${quarter}).`
            : "No gaps detected for the current phase."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Phase context header */}
      {phase && quarter && (
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {phase} phase — Q{quarter} &middot; {gaps.length} gap
          {gaps.length !== 1 ? "s" : ""} detected
        </p>
      )}

      {gaps.map((gap) => (
        <GapCard
          key={gap.activityId}
          gap={gap}
          clientId={clientId}
          isAdded={addedIds.has(gap.activityId)}
          onAdded={handleAdded}
        />
      ))}
    </div>
  );
};

export default MethodologyTab;
