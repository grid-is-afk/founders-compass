import { useState } from "react";
import { Layers, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientFounderMatrixRecord } from "@/hooks/useClientFounderMatrix";
import { FounderMatrixModal } from "./FounderMatrixModal";
import { useUpdateClient } from "@/hooks/useClients";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderMatrixStripProps {
  clientId: string;
  clientName: string;
  entityType: "corp" | "llc" | null;
  record: ClientFounderMatrixRecord | null | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderMatrixStrip({
  clientId,
  clientName,
  entityType,
  record,
}: FounderMatrixStripProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const updateClient = useUpdateClient();

  const resolvedEntityType = (record?.entity_type ?? entityType) as "corp" | "llc" | null;

  // FIX-9: Instead of a dead-end message, provide an inline entity type selector so
  // the advisor can fix missing entity_type without leaving the Diagnose panel.
  if (!resolvedEntityType) {
    const handleSelectEntityType = async (type: "corp" | "llc") => {
      try {
        await updateClient.mutateAsync({ id: clientId, entity_type: type });
        toast.success("Entity type updated");
      } catch {
        toast.error("Failed to update entity type");
      }
    };

    return (
      <div className="w-full rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2.5 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Entity type not set — select the client's entity structure to enable Founder Matrix intake.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-3"
            disabled={updateClient.isPending}
            onClick={() => handleSelectEntityType("corp")}
          >
            {updateClient.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Corporation"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-3"
            disabled={updateClient.isPending}
            onClick={() => handleSelectEntityType("llc")}
          >
            {updateClient.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "LLC"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "w-full rounded-md border px-3 py-2 flex items-center justify-between transition-colors",
          record
            ? "border-border/60 bg-muted/20 hover:bg-muted/30"
            : "border-border/60 bg-muted/10 hover:bg-muted/20"
        )}
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Founder Matrix™
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            ({resolvedEntityType.toUpperCase()})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {record ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">Complete</span>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 border-border/60"
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
            >
              Start Intake
            </Button>
          )}
        </div>
      </button>

      {modalOpen && (
        <FounderMatrixModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          clientId={clientId}
          clientName={clientName}
          entityType={resolvedEntityType}
          existingResponses={record?.responses}
        />
      )}
    </>
  );
}
