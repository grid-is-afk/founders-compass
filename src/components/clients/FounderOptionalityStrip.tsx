import { useState } from "react";
import { Unlock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientOptionalityFrameworkRecord } from "@/hooks/useClientOptionalityFramework";
import { FounderOptionalityModal, OPTIONALITY_CONDITIONS } from "./FounderOptionalityModal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderOptionalityStripProps {
  clientId: string;
  clientName: string;
  record: ClientOptionalityFrameworkRecord | null | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderOptionalityStrip({
  clientId,
  clientName,
  record,
}: FounderOptionalityStripProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const totalConditions = OPTIONALITY_CONDITIONS.length;
  const metCount = record
    ? Object.values(record.responses).filter((r) => r.status === "yes").length
    : 0;
  const assessedCount = record ? Object.keys(record.responses).length : 0;

  return (
    <>
      {!record ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-border gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <Unlock className="w-3.5 h-3.5" />
          Run Optionality Framework™
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Optionality Framework™
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[10px] font-semibold",
                metCount === totalConditions
                  ? "text-emerald-700"
                  : metCount >= 2
                  ? "text-amber-700"
                  : "text-destructive"
              )}
            >
              {metCount}/{totalConditions} conditions met
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          </div>
        </button>
      )}

      {modalOpen && (
        <FounderOptionalityModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          clientId={clientId}
          clientName={clientName}
          existingResponses={record?.responses}
        />
      )}
    </>
  );
}
