import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { Clock, Building2, AlertCircle } from "lucide-react";
import { useClient } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { daysRemaining, countdownChipClass } from "@/lib/q1Utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  q2_phase: string | null;
  q3_phase: string | null;
  onboarded_at: string | null;
  capital_readiness: number;
}

const TABS = [
  { label: "Dashboard", path: "dashboard" },
  { label: "Chapter 1: Discover", path: "discover" },
  { label: "Chapter 2: Grow", path: "q2" },
  { label: "Chapter 3: Strengthen", path: "q3" },
  { label: "Data Room", path: "data-room" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientWorkspace() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/advisor/clients" replace />;

  const { data: client, isLoading, isError } = useClient(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading client...
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm">Client not found.</span>
      </div>
    );
  }

  const c = client as ClientRecord;
  const days = daysRemaining(c.onboarded_at);

  return (
    <div className="space-y-0">
      {/* Workspace header */}
      <div className="border-b border-border pb-4 mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">{c.name}</h1>
              {c.entity_type && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {c.entity_type === "corp" ? "Corporation" : "LLC"}
                </span>
              )}
            </div>
          </div>

          {/* Q1 countdown chip */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold flex-shrink-0",
              countdownChipClass(days)
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {days === null
              ? "No Chapter 1 start date"
              : days <= 0
              ? "Chapter 1 Complete"
              : `${days} days remaining in Ch. 1`}
          </div>
        </div>

        {/* Tab bar */}
        <nav className="flex gap-1" aria-label="Client workspace tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/advisor/clients/${id}/${tab.path}`}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Active tab content */}
      <Outlet context={{ client: c }} />
    </div>
  );
}
