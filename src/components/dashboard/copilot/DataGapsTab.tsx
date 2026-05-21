import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useDataGaps } from "@/hooks/useDashboardIntelligence";

const DataGapsTab = ({ clientId }: { clientId?: string }) => {
  const navigate = useNavigate();
  const { data: gaps = [], isLoading } = useDataGaps(clientId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  }

  if (gaps.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-1">No data gaps detected</h3>
        <p className="text-sm text-muted-foreground">All key frameworks are populated across your clients.</p>
      </div>
    );
  }

  // Group gaps by client
  const byClient = gaps.reduce<Record<string, { client_name: string; client_id: string; gaps: string[] }>>(
    (acc, g) => {
      if (!acc[g.client_id]) {
        acc[g.client_id] = { client_name: g.client_name, client_id: g.client_id, gaps: [] };
      }
      acc[g.client_id].gaps.push(g.gap);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3">
      {Object.values(byClient).map((client) => (
        <div
          key={client.client_id}
          onClick={() => navigate(`/advisor/clients/${client.client_id}`)}
          className="p-3 rounded-md border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors"
        >
          <p className="text-sm font-semibold text-foreground mb-1.5">{client.client_name}</p>
          <div className="flex flex-wrap gap-1.5">
            {client.gaps.map((gap) => (
              <span
                key={gap}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-700 border border-amber-400/20 font-medium"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataGapsTab;
