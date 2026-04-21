import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useClientMultiples, useSubmitMultiples } from "@/hooks/useClientMultiples";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentPulseWidgetProps {
  clientId: string;
  clientName?: string;
}

interface MultiplesForm {
  initial_multiple: string;
  current_multiple: string;
  best_in_class: string;
  goal_multiple: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMultiple(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (isNaN(n)) return "—";
  return `${n}x`;
}

// ---------------------------------------------------------------------------
// Edit Modal (inline)
// ---------------------------------------------------------------------------

function MultiplesEditModal({
  open,
  onClose,
  clientId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  initial: MultiplesForm;
}) {
  const submit = useSubmitMultiples(clientId);
  const [form, setForm] = useState<MultiplesForm>(initial);

  const parseOrNull = (v: string): number | null => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    try {
      await submit.mutateAsync({
        initial_multiple: parseOrNull(form.initial_multiple),
        current_multiple: parseOrNull(form.current_multiple),
        best_in_class: parseOrNull(form.best_in_class),
        goal_multiple: parseOrNull(form.goal_multiple),
      });
      toast.success("Multiples updated");
      onClose();
    } catch {
      toast.error("Failed to save multiples");
    }
  };

  const fields: Array<{ key: keyof MultiplesForm; label: string }> = [
    { key: "initial_multiple", label: "Initial Multiple" },
    { key: "current_multiple", label: "Current Multiple" },
    { key: "best_in_class", label: "Best-in-Class" },
    { key: "goal_multiple", label: "Goal Multiple" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Assessment Pulse — Multiples</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-foreground">{label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. 10"
                />
                <span className="text-xs text-muted-foreground">x</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={submit.isPending}>
            {submit.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AssessmentPulseWidget({ clientId, clientName }: AssessmentPulseWidgetProps) {
  const { data: record, isLoading } = useClientMultiples(clientId || null);
  const [editOpen, setEditOpen] = useState(false);

  const boxes: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Initial Multiple", value: record?.initial_multiple },
    { label: "Current Multiple", value: record?.current_multiple },
    { label: "Best-in-Class", value: record?.best_in_class },
    { label: "Goal Multiple", value: record?.goal_multiple },
  ];

  const initialForm: MultiplesForm = {
    initial_multiple: record?.initial_multiple ?? "",
    current_multiple: record?.current_multiple ?? "",
    best_in_class: record?.best_in_class ?? "",
    goal_multiple: record?.goal_multiple ?? "",
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Assessment Pulse{clientName ? ` — ${clientName}` : ""}
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
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {boxes.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-3 text-center space-y-1"
              >
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">
                  {label}
                </p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {formatMultiple(value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <MultiplesEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clientId={clientId}
        initial={initialForm}
      />
    </>
  );
}
