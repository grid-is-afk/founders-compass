import { Umbrella } from "lucide-react";

const InsuranceTab = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-8 text-center">
      <Umbrella className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display font-semibold text-foreground mb-1">No insurance opportunities identified yet</h3>
      <p className="text-sm text-muted-foreground">Insurance recommendations will appear here once capital architecture analysis is complete for your clients.</p>
    </div>
  );
};

export default InsuranceTab;
