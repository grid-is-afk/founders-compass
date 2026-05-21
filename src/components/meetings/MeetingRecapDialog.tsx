import { useState } from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/hooks/useMeetingsApi";

interface MeetingRecapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetings: Meeting[];
  clientName: string;
  onGenerate: (scope: string, selectedIds: string[]) => void;
}

type Scope = "selected" | "last_week" | "last_month" | "all";

export function MeetingRecapDialog({
  open,
  onOpenChange,
  meetings,
  clientName,
  onGenerate,
}: MeetingRecapDialogProps) {
  const [scope, setScope] = useState<Scope>("selected");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  function toggleMeeting(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    onOpenChange(false);
    onGenerate(scope, Array.from(selectedIds));
  }

  const canGenerate =
    scope !== "selected" || selectedIds.size > 0;

  const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
    { value: "selected", label: "Select meetings", description: "Pick specific meetings below" },
    { value: "last_week", label: "Past week", description: "Meetings in the last 7 days" },
    { value: "last_month", label: "Past month", description: "Meetings in the last 30 days" },
    { value: "all", label: "All meetings", description: `Full recap across all ${meetings.length} past meetings` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Generate Meeting Recap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Scope selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recap scope</p>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={cn(
                    "text-left p-2.5 rounded-lg border transition-colors",
                    scope === opt.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted/40"
                  )}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Meeting list — only shown when scope = selected */}
          {scope === "selected" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Select meetings
              </p>
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No past meetings found.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {meetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMeeting(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors",
                        selectedIds.has(m.id)
                          ? "border-primary bg-primary/8"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
                        selectedIds.has(m.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}>
                        {selectedIds.has(m.id) && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.type ?? "Meeting"}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.date ? new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date"}
                        </p>
                      </div>
                      {now - new Date(m.date ?? 0).getTime() <= oneWeek && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">This week</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary line */}
          {scope !== "selected" && (
            <p className="text-xs text-muted-foreground">
              {scope === "last_week" && `Recap will cover ${meetings.filter(m => now - new Date(m.date ?? 0).getTime() <= oneWeek).length} meeting(s) from the last 7 days.`}
              {scope === "last_month" && `Recap will cover ${meetings.filter(m => now - new Date(m.date ?? 0).getTime() <= oneMonth).length} meeting(s) from the last 30 days.`}
              {scope === "all" && `Recap will cover all ${meetings.length} past meeting(s) with ${clientName}.`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Generate Recap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
