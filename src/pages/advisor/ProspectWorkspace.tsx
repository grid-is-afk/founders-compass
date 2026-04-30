import { Navigate, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Users } from "lucide-react";
import { useProspect } from "@/hooks/useProspects";
import { cn } from "@/lib/utils";
import type { ProspectStatus } from "@/lib/types/journey";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProspectShape {
  id: string;
  name: string;
  contact: string;
  company: string;
  revenue: string;
  source: string;
  status: ProspectStatus;
  fitScore?: number;
  fitDecision?: "fit" | "no_fit" | null;
  notes?: string;
  date: string;
}

const STATUS_LABEL: Record<string, string> = {
  intake: "Intake",
  discovery_scheduled: "Discovery Scheduled",
  discovery_complete: "Discovery Complete",
  fit_assessment: "Fit Assessment",
  not_fit: "Not a Fit",
  fit: "Discovery",
  onboarding: "Onboarding",
  nurture_call: "Nurture Call",
  kept_in_loop: "Kept in Loop",
  flagged_follow_up: "Flagged Follow-Up",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  intake: "bg-muted text-muted-foreground border-border",
  fit_assessment: "bg-amber-500/10 text-amber-700 border-amber-400/30",
  discovery_scheduled: "bg-blue-500/10 text-blue-700 border-blue-400/30",
  discovery_complete: "bg-blue-500/10 text-blue-700 border-blue-400/30",
  fit: "bg-blue-500/10 text-blue-700 border-blue-400/30",
  onboarding: "bg-blue-500/10 text-blue-700 border-blue-400/30",
  not_fit: "bg-destructive/10 text-destructive border-destructive/20",
  nurture_call: "bg-purple-500/10 text-purple-700 border-purple-400/30",
  kept_in_loop: "bg-muted text-muted-foreground border-border",
  flagged_follow_up: "bg-orange-500/10 text-orange-700 border-orange-400/30",
};

function toProspectShape(row: Record<string, unknown>): ProspectShape {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    contact: String(row.contact ?? "—"),
    company: String(row.company ?? "—"),
    revenue: String(row.revenue ?? "—"),
    source: String(row.source ?? "—"),
    status: (row.status ?? "intake") as ProspectStatus,
    fitScore: row.fit_score != null ? Number(row.fit_score) : undefined,
    fitDecision: (row.fit_decision as "fit" | "no_fit" | null) ?? undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    date: row.date
      ? new Date(String(row.date)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
  };
}

const TABS = [
  { label: "Overview", path: "overview" },
  { label: "Assessments", path: "assessments" },
  { label: "Documents", path: "documents" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProspectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <Navigate to="/advisor/prospects" replace />;

  const { data: rawProspect, isLoading, isError } = useProspect(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading prospect...
      </div>
    );
  }

  if (isError || !rawProspect) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm">Prospect not found.</span>
      </div>
    );
  }

  const prospect = toProspectShape(rawProspect as Record<string, unknown>);
  const statusLabel = STATUS_LABEL[prospect.status] ?? prospect.status;
  const statusClass = STATUS_BADGE_CLASS[prospect.status] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-0">
      {/* Workspace header */}
      <div className="border-b border-border pb-4 mb-6 space-y-3">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/advisor/prospects")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Pipeline
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                {prospect.name}
              </h1>
              {prospect.company && prospect.company !== "—" && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {prospect.company}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "flex items-center rounded-full border px-3 py-1 text-xs font-semibold flex-shrink-0",
              statusClass
            )}
          >
            {statusLabel}
          </div>
        </div>

        {/* Tab bar */}
        <nav className="flex gap-1" aria-label="Prospect workspace tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/advisor/prospects/${id}/${tab.path}`}
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
      <Outlet context={{ prospect }} />
    </div>
  );
}
