import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copilotPriorityActions } from "@/lib/mockData";
import { urgencyStyle } from "@/lib/copilotStyles";

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
