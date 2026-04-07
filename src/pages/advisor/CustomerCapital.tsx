import { TrendingUp, Shield, Users, AlertTriangle } from "lucide-react";
import { useClientContext } from "@/hooks/useClientContext";

const CustomerCapital = () => {
  const { selectedClient } = useClientContext();
  const clientName = selectedClient?.name || "your client";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Customer Capital Defense</h1>
        <p className="text-muted-foreground mt-1 text-sm">Evaluate customer durability, revenue defensibility, and account transferability — {clientName}</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">No customer data yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Customer concentration, retention durability, and account transferability data will appear here once you add client customer information through the assessments or data room.
        </p>
      </div>
    </div>
  );
};

export default CustomerCapital;
