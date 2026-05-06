import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateQuarterlyPlan } from "@/hooks/useQuarterlyPlans";

interface DbPlan {
  quarter: number;
  year: number;
}

interface Props {
  clientId: string;
  existingPlans: DbPlan[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function nextQuarterYear(plans: DbPlan[]): { quarter: number; year: number } {
  if (plans.length === 0) {
    return { quarter: 1, year: new Date().getFullYear() };
  }
  const sorted = [...plans].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.quarter - b.quarter
  );
  const last = sorted[sorted.length - 1];
  return last.quarter < 4
    ? { quarter: last.quarter + 1, year: last.year }
    : { quarter: 1, year: last.year + 1 };
}

export default function ChapterCreateDialog({
  clientId,
  existingPlans,
  open,
  onOpenChange,
}: Props) {
  const [label, setLabel] = useState("");
  const createPlan = useCreateQuarterlyPlan();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const { quarter, year } = nextQuarterYear(existingPlans);
    createPlan.mutate(
      { client_id: clientId, quarter, year, label: label.trim(), status: "draft" },
      {
        onSuccess: () => {
          toast.success("Chapter created");
          setLabel("");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create chapter"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chapter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chapter-label">Chapter name</Label>
            <Input
              id="chapter-label"
              placeholder="e.g. Annual Review 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!label.trim() || createPlan.isPending}
            >
              {createPlan.isPending ? "Creating..." : "Create Chapter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
