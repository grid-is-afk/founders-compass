import { Zap } from "lucide-react";

const PriorityActionsTab = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-8 text-center">
      <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display font-semibold text-foreground mb-1">No priority actions</h3>
      <p className="text-sm text-muted-foreground">Add clients and their data to see AI-generated recommendations here.</p>
    </div>
  );
};

export default PriorityActionsTab;
