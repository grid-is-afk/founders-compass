import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copilotDeliverables } from "@/lib/mockData";
import { deliverableStatusLabel } from "@/lib/copilotStyles";

const DeliverablesTab = () => {
  return (
    <div className="space-y-2">
      {copilotDeliverables.map((del) => {
        const st = deliverableStatusLabel[del.status];
        return (
          <div
            key={del.id}
            className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{del.title}</p>
              <p className="text-[10px] text-muted-foreground">{del.client}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", st.style)}>
                {st.label}
              </span>
              {del.status === "ready" && (
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <Send className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DeliverablesTab;
