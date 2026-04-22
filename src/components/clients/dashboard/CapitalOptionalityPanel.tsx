import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientCapitalOptionality } from "@/hooks/useClientCapitalOptionality";
import { CapitalOptionalityModal } from "./CapitalOptionalityModal";
import { cn } from "@/lib/utils";

interface CapitalOptionalityPanelProps {
  clientId: string;
}

type ViabilityLabel = "Recommended" | "Viable" | "Explore";

function labelColor(label: string): string {
  switch (label as ViabilityLabel) {
    case "Recommended":
      return "text-emerald-600";
    case "Viable":
      return "text-blue-600";
    case "Explore":
    default:
      return "text-muted-foreground";
  }
}

export function CapitalOptionalityPanel({ clientId }: CapitalOptionalityPanelProps) {
  const { data: record, isLoading } = useClientCapitalOptionality(clientId || null);
  const [editOpen, setEditOpen] = useState(false);

  const rows = record
    ? [
        { label: "Minority Recapitalization", pct: record.minority_recap_pct, badge: record.minority_recap_label },
        { label: "Strategic Acquisition", pct: record.strategic_acq_pct, badge: record.strategic_acq_label },
        { label: "ESOP", pct: record.esop_pct, badge: record.esop_label },
        { label: "Full Exit / Sale", pct: record.full_exit_pct, badge: record.full_exit_label },
      ]
    : null;

  return (
    <>
      <div className="space-y-3">
        <div className="relative flex items-center pt-1 pb-3">
          <div className="flex-1 border-t border-border" />
          <span className="absolute left-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground bg-muted px-3 py-0.5 rounded-full">
            Capital Optionality
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground bg-muted"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          Most founders chase earnings. The Value Multiplier Framework™ amplifies the drivers of the multiple.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : rows ? (
          <div className="space-y-2">
            {rows.map(({ label, pct, badge }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-card px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                    <span className={cn("text-xs", labelColor(badge))}>{badge}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Capital strategy not yet defined — click Edit to set options
            </p>
          </div>
        )}
      </div>

      <CapitalOptionalityModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clientId={clientId}
        existing={record ?? null}
      />
    </>
  );
}
