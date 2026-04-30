import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useClientSixCsReconcile,
  useGenerateSixCsReconcile,
  type ReconcileFinding,
} from "@/hooks/useClientSixCsReconcile";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SixCsReconcileCardProps {
  clientId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatusChipProps {
  status: ReconcileFinding["status"];
}

function StatusChip({ status }: StatusChipProps) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
        Confirmed
      </span>
    );
  }
  if (status === "gap") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        Gap
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <XCircle className="w-3 h-3 flex-shrink-0" />
      Discrepancy
    </span>
  );
}

interface FindingRowProps {
  finding: ReconcileFinding;
}

function FindingRow({ finding }: FindingRowProps) {
  const [open, setOpen] = useState(false);
  const scoreChanged = finding.suggested_score !== finding.self_score;

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground flex-1">
          {finding.c}
        </span>
        <StatusChip status={finding.status} />
      </button>

      {open && (
        <div className="px-8 pb-3 space-y-1.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {finding.finding}
          </p>
          {scoreChanged && (
            <p className="text-xs text-muted-foreground">
              Self-assessed:{" "}
              <span className="font-medium text-foreground">
                {finding.self_score}/3
              </span>
              {"  →  "}Suggested:{" "}
              <span className="font-medium text-foreground">
                {finding.suggested_score}/3
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SixCsReconcileCard({ clientId }: SixCsReconcileCardProps) {
  const { data: record, isLoading } = useClientSixCsReconcile(clientId);
  const generate = useGenerateSixCsReconcile(clientId);

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync();
      toast.success("Six C's reconciliation complete");
    } catch {
      toast.error("Failed to analyze. Please try again.");
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-border bg-card">
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          QB: Six C's Reconciliation
        </span>
        {record && !generate.isPending && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {/* Loading — initial fetch */}
      {isLoading && !generate.isPending && (
        <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Loading...
        </div>
      )}

      {/* Loading — generation in progress */}
      {generate.isPending && (
        <div className="flex items-center justify-center gap-2 py-5 text-xs font-medium text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          QB is analyzing your Six C's...
        </div>
      )}

      {/* Empty state — no reconciliation run yet */}
      {!isLoading && !generate.isPending && !record && (
        <div className="px-3 py-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Compare your Six C's self-assessment against your data room
            documents. QB will identify confirmed scores, gaps in documentation,
            and any discrepancies.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze with QB
          </Button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !generate.isPending && record && (
        <>
          {/* Summary */}
          {record.summary && (
            <p className="px-3 py-2.5 text-xs text-muted-foreground leading-relaxed border-b border-border/30">
              {record.summary}
            </p>
          )}

          {/* Findings accordion */}
          <div
            className={cn(
              "divide-y divide-border/30",
              record.findings.length === 0 && "px-3 py-3"
            )}
          >
            {record.findings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No findings returned.</p>
            ) : (
              record.findings.map((f) => (
                <FindingRow key={f.c} finding={f} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
