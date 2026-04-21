import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSubmitCapitalOptionality,
  type ClientCapitalOptionalityRecord,
  type SubmitCapitalOptionalityPayload,
} from "@/hooks/useClientCapitalOptionality";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapitalOptionalityModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  existing: ClientCapitalOptionalityRecord | null;
}

type LabelOption = "Recommended" | "Viable" | "Explore";
const LABEL_OPTIONS: LabelOption[] = ["Recommended", "Viable", "Explore"];

interface RowState {
  pct: number;
  label: LabelOption;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CapitalOptionalityModal({
  open,
  onClose,
  clientId,
  existing,
}: CapitalOptionalityModalProps) {
  const submit = useSubmitCapitalOptionality(clientId);

  const [rows, setRows] = useState<{
    minority_recap: RowState;
    strategic_acq: RowState;
    esop: RowState;
    full_exit: RowState;
  }>({
    minority_recap: { pct: 0, label: "Explore" },
    strategic_acq: { pct: 0, label: "Explore" },
    esop: { pct: 0, label: "Explore" },
    full_exit: { pct: 0, label: "Explore" },
  });

  // Seed from existing record when modal opens
  useEffect(() => {
    if (existing) {
      setRows({
        minority_recap: {
          pct: existing.minority_recap_pct,
          label: (existing.minority_recap_label as LabelOption) ?? "Explore",
        },
        strategic_acq: {
          pct: existing.strategic_acq_pct,
          label: (existing.strategic_acq_label as LabelOption) ?? "Explore",
        },
        esop: {
          pct: existing.esop_pct,
          label: (existing.esop_label as LabelOption) ?? "Explore",
        },
        full_exit: {
          pct: existing.full_exit_pct,
          label: (existing.full_exit_label as LabelOption) ?? "Explore",
        },
      });
    }
  }, [existing, open]);

  const totalPct =
    rows.minority_recap.pct +
    rows.strategic_acq.pct +
    rows.esop.pct +
    rows.full_exit.pct;

  const updateRow = (
    key: keyof typeof rows,
    field: keyof RowState,
    value: number | LabelOption
  ) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (totalPct > 100) {
      toast.warning("Total viability exceeds 100% — saving anyway");
    }
    const payload: SubmitCapitalOptionalityPayload = {
      minority_recap_pct: rows.minority_recap.pct,
      minority_recap_label: rows.minority_recap.label,
      strategic_acq_pct: rows.strategic_acq.pct,
      strategic_acq_label: rows.strategic_acq.label,
      esop_pct: rows.esop.pct,
      esop_label: rows.esop.label,
      full_exit_pct: rows.full_exit.pct,
      full_exit_label: rows.full_exit.label,
    };
    try {
      await submit.mutateAsync(payload);
      toast.success("Capital optionality saved");
      onClose();
    } catch {
      toast.error("Failed to save capital optionality");
    }
  };

  const ROW_DEFS: Array<{ key: keyof typeof rows; label: string }> = [
    { key: "minority_recap", label: "Minority Recapitalization" },
    { key: "strategic_acq", label: "Strategic Acquisition" },
    { key: "esop", label: "ESOP" },
    { key: "full_exit", label: "Full Exit / Sale" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Capital Optionality</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {ROW_DEFS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{label}</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rows[key].pct}
                    onChange={(e) =>
                      updateRow(key, "pct", Math.max(0, Math.min(100, Number(e.target.value))))
                    }
                    className="w-16 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <Select
                  value={rows[key].label}
                  onValueChange={(v) => updateRow(key, "label", v as LabelOption)}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {/* Total indicator */}
          <div
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium",
              totalPct > 100
                ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                : "bg-muted/40 text-muted-foreground"
            )}
          >
            <span>Total viability</span>
            <span className="font-bold">{totalPct}%</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submit.isPending}>
            {submit.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
