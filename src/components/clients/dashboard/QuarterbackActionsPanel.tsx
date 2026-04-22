import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuarterbackActionsPanelProps {
  clientId: string;
  clientName: string;
}

const PLACEHOLDER_ACTIONS = [
  "Complete Q1 Project Kickoff checklist",
  "Upload documents to Data Room",
  "Run Founder Exposure Index assessment",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuarterbackActionsPanel({ clientName }: QuarterbackActionsPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-border bg-sidebar p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-sidebar-foreground/80 leading-none">
          Quarterback AI — Priority Actions
        </span>
      </div>

      <div className="space-y-2">
        {PLACEHOLDER_ACTIONS.map((action) => (
          <div key={action} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-sidebar-foreground/90 font-medium">{action}</p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">{clientName}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full gap-2 text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90 border-0"
        onClick={() => navigate("/advisor/copilot")}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Open Quarterback
      </Button>
    </div>
  );
}
