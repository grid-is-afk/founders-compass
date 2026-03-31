import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";

interface Stage {
  id: string;
  label: string;
  status: "complete" | "active" | "upcoming";
  clients: number;
}

const WorkflowPipeline = ({ stages }: { stages: Stage[] }) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
                  stage.status === "complete" && "gradient-olive",
                  stage.status === "active" && "gradient-gold",
                  stage.status === "upcoming" && "bg-muted"
                )}
              >
                {stage.status === "complete" ? (
                  <Check className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <span className={cn(
                    "text-sm font-semibold",
                    stage.status === "active" ? "text-accent-foreground" : "text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                )}
              </div>
              <p className={cn(
                "text-sm font-medium",
                stage.status === "active" ? "text-foreground" : "text-muted-foreground"
              )}>
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{stage.clients} clients</p>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="w-4 h-4 text-border flex-shrink-0 -mt-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowPipeline;
