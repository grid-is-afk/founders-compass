import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, AlertTriangle, Info, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import { usePriorityActions } from "@/hooks/useDashboardIntelligence";
import { useGenerateEngagementBriefing } from "@/hooks/useDeliverables";

interface QuarterbackActionsPanelProps {
  clientId: string;
  clientName: string;
}

const severityDot: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />,
  info: <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />,
};

export function QuarterbackActionsPanel({ clientId, clientName }: QuarterbackActionsPanelProps) {
  const { togglePanel } = useCopilotContext();
  const { data: actions = [], isLoading } = usePriorityActions(clientId);
  const { mutate: generateBriefing, isPending: isGeneratingBriefing } = useGenerateEngagementBriefing();

  const top5 = actions.slice(0, 5);

  const handleGenerateBriefing = () => {
    generateBriefing(
      { clientId },
      {
        onSuccess: () =>
          toast("Briefing generated — check Deliverables", { duration: 4000 }),
        onError: () =>
          toast("Failed to generate briefing. Please try again."),
      }
    );
  };

  return (
    <div className="rounded-lg border border-border bg-sidebar p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-sidebar-foreground/80 leading-none">
          Quarterback AI — Priority Actions
        </span>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-sidebar-foreground/40">Loading...</p>
        ) : top5.length === 0 ? (
          <p className="text-xs text-sidebar-foreground/40">No priority actions — all on track.</p>
        ) : (
          top5.map((action) => (
            <div key={action.id} className="flex items-start gap-2.5">
              {severityDot[action.severity] ?? severityDot.info}
              <div className="min-w-0">
                <p className="text-xs text-sidebar-foreground/90 font-medium leading-snug line-clamp-2">
                  {action.label}
                </p>
                {action.meta && (
                  <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">{action.meta}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Button
        size="sm"
        className="w-full gap-2 text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90 border-0"
        onClick={togglePanel}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Open Quarterback
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2 text-xs"
        onClick={handleGenerateBriefing}
        disabled={isGeneratingBriefing}
      >
        {isGeneratingBriefing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating Briefing...
          </>
        ) : (
          <>
            <FileText className="w-3.5 h-3.5" />
            Generate Briefing
          </>
        )}
      </Button>
    </div>
  );
}
