import { useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardInsurance } from "@/hooks/useDashboardIntelligence";

const statusStyle: Record<string, string> = {
  active: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  review: "text-amber-700 bg-amber-400/10 border-amber-400/20",
  missing: "text-destructive bg-destructive/10 border-destructive/20",
  pending: "text-blue-700 bg-blue-500/10 border-blue-500/20",
};

const statusIcon: Record<string, React.ReactNode> = {
  active: <ShieldCheck className="w-3.5 h-3.5" />,
  review: <Shield className="w-3.5 h-3.5" />,
  missing: <ShieldAlert className="w-3.5 h-3.5" />,
  pending: <Shield className="w-3.5 h-3.5" />,
};

const InsuranceTab = ({ clientId }: { clientId?: string }) => {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useDashboardInsurance(clientId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">No protection items yet</h3>
        <p className="text-sm text-muted-foreground">Add protection items in a client workspace to see them here.</p>
      </div>
    );
  }

  // Group by client
  const byClient = items.reduce<Record<string, typeof items>>(
    (acc, item) => {
      if (!acc[item.client_id]) acc[item.client_id] = [];
      acc[item.client_id].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      {Object.entries(byClient).map(([clientId, clientItems]) => (
        <div key={clientId}>
          <p
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => navigate(`/advisor/clients/${clientId}`)}
          >
            {clientItems[0].client_name}
          </p>
          <div className="space-y-1.5">
            {clientItems.map((item) => {
              const s = item.status ?? "review";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-snug truncate">{item.label}</p>
                    {item.risk && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.risk}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
                      statusStyle[s] ?? statusStyle.review
                    )}
                  >
                    {statusIcon[s] ?? statusIcon.review}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsuranceTab;
