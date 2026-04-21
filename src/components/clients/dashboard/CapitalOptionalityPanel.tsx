import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientCapitalOptionality } from "@/hooks/useClientCapitalOptionality";
import { CapitalOptionalityModal } from "./CapitalOptionalityModal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapitalOptionalityPanelProps {
  clientId: string;
}

type ViabilityLabel = "Recommended" | "Viable" | "Explore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function badgeColor(label: string): string {
  switch (label as ViabilityLabel) {
    case "Recommended":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "Viable":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "Explore":
    default:
      return "bg-muted text-muted-foreground border-border/60";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Capital Optionality
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-8 rounded bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : rows ? (
          <div className="space-y-2">
            {rows.map(({ label, pct, badge }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0 h-4", badgeColor(badge))}
                    >
                      {badge}
                    </Badge>
                    <span className="text-muted-foreground tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400/70"
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
