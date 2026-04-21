import { useState } from "react";
import { Camera, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientFounderSnapshotRecord, SnapshotSignal } from "@/hooks/useClientFounderSnapshot";
import { FounderSnapshotModal, SNAPSHOT_DIMENSIONS } from "./FounderSnapshotModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalDotClass(signal: SnapshotSignal): string {
  if (signal === "strong") return "bg-emerald-500";
  if (signal === "weakening") return "bg-amber-400";
  return "bg-destructive";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderSnapshotStripProps {
  clientId: string;
  clientName: string;
  record: ClientFounderSnapshotRecord | null | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderSnapshotStrip({
  clientId,
  clientName,
  record,
}: FounderSnapshotStripProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const assessedCount = record
    ? Object.keys(record.responses).length
    : 0;
  const total = SNAPSHOT_DIMENSIONS.length;

  return (
    <>
      {!record ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-border gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <Camera className="w-3.5 h-3.5" />
          Run Founder Snapshot™
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Founder Snapshot™
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Signal dots for each dimension */}
            <div className="flex items-center gap-1">
              {SNAPSHOT_DIMENSIONS.map((dim) => {
                const response = record.responses[dim.id];
                return (
                  <span
                    key={dim.id}
                    title={`${dim.label}: ${response?.signal ?? "not assessed"}`}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      response ? signalDotClass(response.signal) : "bg-muted-foreground/20"
                    )}
                  />
                );
              })}
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {assessedCount}/{total}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          </div>
        </button>
      )}

      {modalOpen && (
        <FounderSnapshotModal
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
