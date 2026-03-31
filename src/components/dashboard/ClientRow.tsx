import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  contact: string;
  stage: string;
  capitalReadiness: number;
  revenue: string;
  lastActivity: string;
}

const stageBadge: Record<string, string> = {
  "Q1 — Discover": "bg-primary/10 text-primary",
  "Q1 — Diagnose": "bg-primary/10 text-primary",
  "Q2 — Protect": "bg-accent/15 text-accent-foreground",
  "Q2 — Grow": "bg-emerald-500/10 text-emerald-700",
  "Q3 — Grow": "bg-emerald-500/10 text-emerald-700",
  "Q3 — Prove": "bg-primary/15 text-primary",
  "Q4 — Realign": "bg-amber-500/10 text-amber-700",
};

const ClientRow = ({ client }: { client: Client }) => {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{client.name}</p>
        <p className="text-xs text-muted-foreground">{client.contact}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", stageBadge[client.stage] || "bg-muted text-muted-foreground")}>
          {client.stage}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-olive" style={{ width: `${client.capitalReadiness}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{client.capitalReadiness}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{client.revenue}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{client.lastActivity}</td>
    </tr>
  );
};

export default ClientRow;
