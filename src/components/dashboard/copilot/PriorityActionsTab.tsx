import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePriorityActions } from "@/hooks/useDashboardIntelligence";

const severityIcon = {
  critical: <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />,
};

const severityStyle = {
  critical: "border-destructive/20 bg-destructive/5",
  warning: "border-amber-400/20 bg-amber-400/5",
  info: "border-blue-400/20 bg-blue-400/5",
};

const PriorityActionsTab = () => {
  const navigate = useNavigate();
  const { data: actions = [], isLoading } = usePriorityActions();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  }

  if (actions.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">All caught up</h3>
        <p className="text-sm text-muted-foreground">No overdue tasks or at-risk clients right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div
          key={action.id}
          onClick={() => navigate(`/advisor/clients/${action.client_id}`)}
          className={cn(
            "p-3 rounded-md border cursor-pointer hover:opacity-80 transition-opacity",
            severityStyle[action.severity]
          )}
        >
          <div className="flex items-start gap-2.5">
            {severityIcon[action.severity]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug">{action.label}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {action.client_name}
                </span>
                {action.meta && (
                  <span className="text-xs text-muted-foreground">{action.meta}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PriorityActionsTab;
