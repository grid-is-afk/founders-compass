import { clients } from "@/lib/mockData";
import ClientRow from "@/components/dashboard/ClientRow";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdvisorClients = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all founder engagements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Client</Button>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Readiness</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => <ClientRow key={c.id} client={c} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvisorClients;
