import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { urgencyStyle } from "@/lib/copilotStyles";

const copilotPriorityActions = [
  { id: "pa1", urgency: "high" as const, action: "Upload customer revenue segmentation", client: "Atlas Manufacturing", engine: "Customer Capital" },
  { id: "pa2", urgency: "high" as const, action: "Complete founder dependency assessment", client: "Vanguard Tech Solutions", engine: "Performance" },
  { id: "pa3", urgency: "medium" as const, action: "Generate Customer Capital Index", client: "Meridian Industries", engine: "Customer Capital" },
  { id: "pa4", urgency: "medium" as const, action: "Draft 90-Day Execution Plan", client: "Pinnacle Services Group", engine: "Performance" },
  { id: "pa5", urgency: "low" as const, action: "Schedule entity structure review", client: "Atlas Manufacturing", engine: "Capital Architecture" },
];

const PriorityActionsTab = () => {
  return (
    <div className="space-y-2">
      {copilotPriorityActions.map((action, i) => (
        <div
          key={action.id}
          className={cn(
            "flex items-center justify-between p-3 rounded-md border text-sm",
            urgencyStyle[action.urgency]
          )}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-xs w-5">{i + 1}</span>
            <div>
              <p className="font-medium">{action.action}</p>
              <p className="text-xs opacity-70">
                {action.client} · {action.engine}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default PriorityActionsTab;
