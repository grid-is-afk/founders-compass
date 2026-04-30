import { useState } from "react";
import { Lightbulb, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useClientIpValueFramework, useSubmitClientIpValueFramework } from "@/hooks/useClientIpValueFramework";
import type { SubmitIpValueFrameworkPayload } from "@/hooks/useClientIpValueFramework";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IpValueFrameworkStripProps {
  clientId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IpValueFrameworkStrip({ clientId }: IpValueFrameworkStripProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: record, isLoading } = useClientIpValueFramework(clientId);
  const submitFramework = useSubmitClientIpValueFramework(clientId);

  const [formState, setFormState] = useState<SubmitIpValueFrameworkPayload>({
    ip_type: null,
    ip_status: null,
    valuation_basis: null,
    notes: null,
  });

  const handleOpen = () => {
    setFormState({
      ip_type: record?.ip_type ?? null,
      ip_status: record?.ip_status ?? null,
      valuation_basis: record?.valuation_basis ?? null,
      notes: record?.notes ?? null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await submitFramework.mutateAsync(formState);
      toast.success("IP Value Framework saved");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save IP Value Framework");
    }
  };

  if (isLoading) {
    return <div className="h-9 rounded-md bg-muted/30 animate-pulse" />;
  }

  const isComplete = !!record?.completed_at;

  return (
    <>
      {!record ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-border gap-1.5"
          onClick={handleOpen}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Complete IP Value Framework
        </Button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Founder's IP Value Framework
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-700">Complete</span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-semibold text-muted-foreground">Not started</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              </>
            )}
          </div>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Founder's IP Value Framework</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ip-type">IP Type</Label>
              <Select
                value={formState.ip_type ?? ""}
                onValueChange={(v) => setFormState((s) => ({ ...s, ip_type: v || null }))}
              >
                <SelectTrigger id="ip-type">
                  <SelectValue placeholder="Select IP type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Patent">Patent</SelectItem>
                  <SelectItem value="Trademark">Trademark</SelectItem>
                  <SelectItem value="Copyright">Copyright</SelectItem>
                  <SelectItem value="Trade Secret">Trade Secret</SelectItem>
                  <SelectItem value="Multiple">Multiple</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ip-status">IP Status</Label>
              <Select
                value={formState.ip_status ?? ""}
                onValueChange={(v) => setFormState((s) => ({ ...s, ip_status: v || null }))}
              >
                <SelectTrigger id="ip-status">
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Unregistered">Unregistered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valuation-basis">Basis of IP Valuation</Label>
              <Input
                id="valuation-basis"
                placeholder="e.g. Cost approach, market comparables…"
                value={formState.valuation_basis ?? ""}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, valuation_basis: e.target.value || null }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ip-notes">Additional Notes</Label>
              <Textarea
                id="ip-notes"
                placeholder="Any additional context about the IP…"
                rows={3}
                value={formState.notes ?? ""}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, notes: e.target.value || null }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitFramework.isPending}
              className="gap-1.5"
            >
              {submitFramework.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Framework"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
