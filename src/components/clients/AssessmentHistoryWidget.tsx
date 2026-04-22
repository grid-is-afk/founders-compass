import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientAssessmentSummary } from "@/hooks/useClientAssessmentSummary";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssessmentHistoryWidgetProps {
  clientId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function feiLevel(total: number): {
  label: string;
  pillClass: string;
} {
  if (total >= 43)
    return {
      label: "Low Exposure",
      pillClass: "bg-emerald-500/10 text-emerald-600",
    };
  if (total >= 27)
    return {
      label: "Moderate Exposure",
      pillClass: "bg-amber-500/10 text-amber-600",
    };
  return {
    label: "High Exposure",
    pillClass: "bg-red-500/10 text-red-600",
  };
}

function SixCsDots({ scores }: { scores: Record<string, number> }) {
  const values = Object.values(scores).slice(0, 6);
  return (
    <span className="flex items-center gap-0.5">
      {values.map((score, i) => {
        const colorClass =
          score === 3
            ? "bg-emerald-500"
            : score === 2
            ? "bg-amber-500"
            : score === 1
            ? "bg-red-500"
            : "bg-muted-foreground/30";
        return (
          <span
            key={i}
            className={cn("inline-block w-2 h-2 rounded-full", colorClass)}
          />
        );
      })}
    </span>
  );
}

function SnapshotDots({
  responses,
}: {
  responses: Record<string, { signal?: string }>;
}) {
  const dims = Object.values(responses).slice(0, 5);
  const count = dims.length;
  return (
    <span className="flex items-center gap-1">
      <span className="flex items-center gap-0.5">
        {dims.map((dim, i) => {
          const signal = dim?.signal;
          const colorClass =
            signal === "strong"
              ? "bg-emerald-500"
              : signal === "weakening"
              ? "bg-amber-500"
              : signal === "urgent"
              ? "bg-red-500"
              : "bg-muted-foreground/30";
          return (
            <span
              key={i}
              className={cn("inline-block w-2 h-2 rounded-full", colorClass)}
            />
          );
        })}
      </span>
      <span className="text-xs text-muted-foreground">{count}/5</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function AssessmentRow({
  label,
  value,
  notRun = false,
  valueNode,
}: {
  label: string;
  value?: string;
  notRun?: boolean;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span
        className={cn(
          "text-xs",
          notRun ? "text-muted-foreground/40" : "text-foreground/80"
        )}
      >
        {label}
      </span>
      {valueNode ? (
        valueNode
      ) : (
        <span
          className={cn(
            "text-xs",
            notRun
              ? "text-muted-foreground/40 italic"
              : "text-muted-foreground"
          )}
        >
          {notRun ? "Not run" : value}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBars() {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="h-4 w-36 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="space-y-3 px-4 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted/40 animate-pulse"
            style={{ width: `${60 + i * 12}%` }}
          />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssessmentHistoryWidget({
  clientId,
}: AssessmentHistoryWidgetProps) {
  const { data: summary, isLoading } = useClientAssessmentSummary(clientId);

  return (
    <div className="rounded-lg border border-border bg-card">
      {isLoading ? (
        <SkeletonBars />
      ) : summary ? (
        <>
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">
              Assessment History
            </h3>
            <span
              className={cn(
                "text-[10px]",
                summary.action_items.done > 0
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              )}
            >
              {summary.action_items.done}/{summary.action_items.total} actions
              done
            </span>
          </div>

          {/* PRE-CLIENT section */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              Pre-Client
            </p>

            {/* Six C's */}
            {summary.prospect.six_cs ? (
              <AssessmentRow
                label="Six C's"
                valueNode={
                  <span className="flex items-center gap-1.5">
                    <SixCsDots scores={summary.prospect.six_cs.scores} />
                    <span className="text-xs text-muted-foreground">
                      {summary.prospect.six_cs.total_score}/18
                    </span>
                  </span>
                }
              />
            ) : (
              <AssessmentRow label="Six C's" notRun />
            )}

            {/* FEI Prospect */}
            {summary.prospect.exposure_index ? (
              (() => {
                const { label, pillClass } = feiLevel(
                  summary.prospect.exposure_index.total
                );
                return (
                  <AssessmentRow
                    label="Exposure Index"
                    valueNode={
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                            pillClass
                          )}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({summary.prospect.exposure_index.total}/54)
                        </span>
                      </span>
                    }
                  />
                );
              })()
            ) : (
              <AssessmentRow label="Exposure Index" notRun />
            )}
          </div>

          {/* Q1 DISCOVER — DIAGNOSE section */}
          <div className="border-t border-border/40 px-4 pt-3 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              Q1 Discover — Diagnose
            </p>

            {/* FEI Client */}
            {summary.q1_discover.exposure_index ? (
              (() => {
                const { label, pillClass } = feiLevel(
                  summary.q1_discover.exposure_index.total
                );
                return (
                  <AssessmentRow
                    label="Exposure Index"
                    valueNode={
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                            pillClass
                          )}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({summary.q1_discover.exposure_index.total}/54)
                        </span>
                      </span>
                    }
                  />
                );
              })()
            ) : (
              <AssessmentRow label="Exposure Index" notRun />
            )}

            {/* Founder Matrix */}
            {summary.q1_discover.founder_matrix ? (
              <AssessmentRow
                label="Founder Matrix"
                value={`Complete (${summary.q1_discover.founder_matrix.entity_type.toUpperCase()})`}
              />
            ) : (
              <AssessmentRow label="Founder Matrix" notRun />
            )}

            {/* Founder Snapshot */}
            {summary.q1_discover.founder_snapshot ? (
              <AssessmentRow
                label="Founder Snapshot"
                valueNode={
                  <SnapshotDots
                    responses={summary.q1_discover.founder_snapshot.responses}
                  />
                }
              />
            ) : (
              <AssessmentRow label="Founder Snapshot" notRun />
            )}
          </div>

          {/* Q1 DISCOVER — OTHER section */}
          <div className="border-t border-border/40 px-4 pt-3 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              Q1 Discover — Other
            </p>

            {/* Optionality Framework */}
            {summary.q1_discover.optionality_framework ? (
              <AssessmentRow
                label="Optionality Framework"
                value={`${summary.q1_discover.optionality_framework.conditions_met}/${summary.q1_discover.optionality_framework.total} conditions met`}
              />
            ) : (
              <AssessmentRow label="Optionality Framework" notRun />
            )}
          </div>

          {/* ONGOING METRICS section */}
          <div className="border-t border-border/40 px-4 pt-3 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              Ongoing Metrics
            </p>

            {/* Six Keys */}
            {summary.ongoing.six_keys ? (
              <AssessmentRow
                label="Six Keys of Capital"
                value={`${summary.ongoing.six_keys.scored_count} of 6 scored`}
              />
            ) : (
              <AssessmentRow label="Six Keys of Capital" notRun />
            )}

            {/* Capital Optionality */}
            {summary.ongoing.capital_optionality ? (
              <AssessmentRow
                label="Capital Optionality"
                value={`${summary.ongoing.capital_optionality.scenarios_set} of 4 scenarios`}
              />
            ) : (
              <AssessmentRow label="Capital Optionality" notRun />
            )}

            {/* Revenue Multiples */}
            {summary.ongoing.multiples ? (
              <AssessmentRow
                label="Revenue Multiples"
                valueNode={
                  summary.ongoing.multiples.current_multiple !== null &&
                  summary.ongoing.multiples.goal_multiple !== null ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{summary.ongoing.multiples.current_multiple}x current</span>
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
                      <span>{summary.ongoing.multiples.goal_multiple}x goal</span>
                    </span>
                  ) : summary.ongoing.multiples.current_multiple !== null ? (
                    <span className="text-xs text-muted-foreground">
                      {summary.ongoing.multiples.current_multiple}x current
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Set</span>
                  )
                }
              />
            ) : (
              <AssessmentRow label="Revenue Multiples" notRun />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
