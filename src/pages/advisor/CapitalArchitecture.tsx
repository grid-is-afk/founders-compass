import { Shield, Landmark } from "lucide-react";
import { useClientContext } from "@/hooks/useClientContext";

const CapitalArchitecture = () => {
  const { selectedClient } = useClientContext();
  const clientName = selectedClient?.name || "your client";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Capital Architecture</h1>
        <p className="text-muted-foreground mt-1 text-sm">Entity structure, tax optimization, and capital optionality — {clientName}</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Landmark className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">No capital architecture data yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Entity structure, tax opportunities, and capital optionality analysis will appear here once you complete the Capital Strategy Architecture instrument for this client.
        </p>
      </div>
    </div>
  );
};

export default CapitalArchitecture;
