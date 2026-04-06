import { cn } from "@/lib/utils";

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  stage: string;
  capital_readiness: number;
  revenue: string | null;
  updated_at: string;
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

function formatActivity(updatedAt: string): string {
  const now = Date.now();
  const then = new Date(updatedAt).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ClientRow = ({ client }: { client: Client }) => {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{client.name}</p>
        <p className="text-xs text-muted-foreground">{client.contact_name ?? "—"}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full font-medium",
            stageBadge[client.stage] || "bg-muted text-muted-foreground"
          )}
        >
          {client.stage || "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-olive"
              style={{ width: `${client.capital_readiness}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{client.capital_readiness}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{client.revenue ?? "—"}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {client.updated_at ? formatActivity(client.updated_at) : "—"}
      </td>
    </tr>
  );
};

export default ClientRow;
