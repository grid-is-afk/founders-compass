import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientDeliverables } from "@/hooks/useDeliverables";
import { deliverableStatusLabel } from "@/lib/copilotStyles";

const DeliverablesTab = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const { data: rawDeliverables = [] } = useClientDeliverables(selectedClientId);

  interface DbDeliverable {
    id: string;
    title: string;
    status: string;
    engine?: string | null;
  }

  const deliverables = (rawDeliverables as DbDeliverable[]).map((d) => ({
    id: d.id,
    title: d.title,
    client: selectedClient.name,
    status: d.status ?? "needs_data",
    engine: d.engine ?? "",
  }));

  if (deliverables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No deliverables for this client.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {deliverables.map((del) => {
        const st = (deliverableStatusLabel as Record<string, { label: string; style: string }>)[del.status]
          ?? { label: del.status, style: "bg-muted text-muted-foreground" };
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
