import { useState } from "react";
import { Plus, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClientGrow, useCreateGrow } from "@/hooks/useGrowApi";
import { useUpdateClient } from "@/hooks/useClients";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrowEngagement {
  id: string;
  client_id: string;
  capital_type: string | null;
  label: string;
  partner: string | null;
  status: string;
  created_at: string;
}

type CapitalTypeId =
  | "human_capital"
  | "customer_capital"
  | "structural_capital"
  | "social_capital"
  | "personal_path";

interface CapitalSection {
  id: CapitalTypeId;
  label: string;
}

const CAPITAL_SECTIONS: CapitalSection[] = [
  { id: "human_capital", label: "Human Capital" },
  { id: "customer_capital", label: "Customer Capital" },
  { id: "structural_capital", label: "Structural Capital" },
  { id: "social_capital", label: "Social Capital" },
  { id: "personal_path", label: "Personal Path" },
];

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "completed") return "secondary";
  return "outline";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GrowQ3PanelProps {
  clientId: string;
  nextPhase: string | null;
  onPhaseComplete: () => void;
}

// ---------------------------------------------------------------------------
// Inline add-finding form for each capital section
// ---------------------------------------------------------------------------

interface AddFindingFormProps {
  clientId: string;
  capitalType: CapitalTypeId;
  onClose: () => void;
}

function AddFindingForm({ clientId, capitalType, onClose }: AddFindingFormProps) {
  const [label, setLabel] = useState("");
  const [partner, setPartner] = useState("");
  const createGrow = useCreateGrow();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    try {
      await createGrow.mutateAsync({
        client_id: clientId,
        capital_type: capitalType,
        label: trimmed,
        partner: partner.trim() || undefined,
        status: "exploring",
        chapter: 3,
      });
      toast.success("Finding added");
      onClose();
    } catch {
      toast.error("Failed to add finding");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border/60 rounded-lg bg-muted/10 p-3 space-y-2.5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground" htmlFor={`q3-label-${capitalType}`}>
          Finding label
        </label>
        <Input
          id={`q3-label-${capitalType}`}
          placeholder="e.g. Hire senior engineer Q4…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground" htmlFor={`q3-partner-${capitalType}`}>
          Partner <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id={`q3-partner-${capitalType}`}
          placeholder="e.g. Acme Recruiting…"
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!label.trim() || createGrow.isPending} className="gap-1.5">
          {createGrow.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" /> Add Finding
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GrowQ3Panel({ clientId, nextPhase, onPhaseComplete }: GrowQ3PanelProps) {
  const { data: growItems = [], isLoading } = useClientGrow(clientId, 3);
  const updateClient = useUpdateClient();
  const [openFormFor, setOpenFormFor] = useState<CapitalTypeId | null>(null);

  const items = growItems as GrowEngagement[];

  const handleMarkComplete = async () => {
    if (!nextPhase) return;
    try {
      await updateClient.mutateAsync({ id: clientId, q3_phase: nextPhase });
      toast.success("Grow phase complete", { description: "Moving to Align phase." });
      onPhaseComplete();
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  const handleAiGenerate = () => {
    toast.info("AI generation coming soon — please add findings manually.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading grow data...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">Grow — Six Keys</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map your growth opportunities across the six capitals.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAiGenerate}
          className="gap-1.5 flex-shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate Findings
        </Button>
      </div>

      {CAPITAL_SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => item.capital_type === section.id);
        const isFormOpen = openFormFor === section.id;

        return (
          <div key={section.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenFormFor(isFormOpen ? null : section.id)}
                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3" />
                Add Finding
              </Button>
            </div>

            {sectionItems.length > 0 && (
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                {sectionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{item.label}</p>
                      {item.partner && (
                        <p className="text-[10px] text-muted-foreground/60">{item.partner}</p>
                      )}
                    </div>
                    <Badge
                      variant={statusBadgeVariant(item.status)}
                      className={cn(
                        "text-[10px] capitalize ml-3 flex-shrink-0",
                        item.status === "exploring" && "text-amber-700 border-amber-300 bg-amber-50"
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {sectionItems.length === 0 && !isFormOpen && (
              <p className="text-xs text-muted-foreground/50 italic px-1">
                No findings yet — add one to get started.
              </p>
            )}

            {isFormOpen && (
              <AddFindingForm
                clientId={clientId}
                capitalType={section.id}
                onClose={() => setOpenFormFor(null)}
              />
            )}
          </div>
        );
      })}

      {nextPhase !== null && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {items.length > 0
              ? `${items.length} finding${items.length === 1 ? "" : "s"} logged.`
              : "Add findings to track growth opportunities."}
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
