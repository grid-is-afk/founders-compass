import { useState } from "react";
import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { Clock, Building2, AlertCircle, Plus, BookOpen, FileBarChart2 } from "lucide-react";
import { useClient } from "@/hooks/useClients";
import { useClientQuarterlyPlans } from "@/hooks/useQuarterlyPlans";
import { cn } from "@/lib/utils";
import { daysRemaining, countdownChipClass } from "@/lib/q1Utils";
import ChapterCreateDialog from "@/components/chapters/ChapterCreateDialog";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import { FolderPickerPopover } from "@/components/copilot/FolderPickerPopover";

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
  q4_phase: string | null;
  onboarded_at: string | null;
  capital_readiness: number;
}

const TABS = [
  { label: "Dashboard", path: "dashboard" },
  { label: "Chapter 1: Discover", path: "discover" },
  { label: "Chapter 2: Grow", path: "q2" },
  { label: "Chapter 3: Strengthen", path: "q3" },
  { label: "Chapter 4: Elevate", path: "q4" },
  { label: "Meetings", path: "meetings" },
  { label: "Data Room", path: "data-room" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DbPlan {
  id: string;
  quarter: number;
  year: number;
  label: string | null;
  status: string;
  start_date: string | null;
}

export default function ClientWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { sendMessage, setIsOpen } = useCopilotContext();

  if (!id) return <Navigate to="/advisor/clients" replace />;

  const { data: client, isLoading, isError } = useClient(id);
  const { data: plansRaw = [] } = useClientQuarterlyPlans(id);
  const plans = plansRaw as DbPlan[];
  const extraPlans = plans
    .slice()
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter)
    .slice(4);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading client...
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">You're not entitled to view this account</p>
          <p className="text-xs text-muted-foreground mt-1">
            This client account either doesn't exist or isn't assigned to you.
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const c = client as ClientRecord;
  // Prefer the Q1 plan's start_date (canonical advisor-entered date) over the raw
  // clients.onboarded_at field. Fall back to onboarded_at if no plan exists yet.
  const q1Plan = plans.find((p) => p.quarter === 1);
  const chapterStartDate = q1Plan?.start_date ?? c.onboarded_at;
  const days = daysRemaining(chapterStartDate);

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

          {/* QB AI action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FolderPickerPopover
              defaultFolder="Reports"
              onConfirm={(folder) => {
                setIsOpen(true);
                sendMessage(`Generate an onboarding brief for ${c.name} and save it to the "${folder}" folder. I need to get up to speed quickly. Include: client overview, long-term objective, current TFO phase, key stakeholders, recent meeting themes, top open tasks, any open commitments, and what's likely coming up next.`);
              }}
            >
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors">
                <BookOpen className="w-3.5 h-3.5" />
                Get Up to Speed
              </button>
            </FolderPickerPopover>
            <FolderPickerPopover
              defaultFolder="Reports"
              onConfirm={(folder) => {
                setIsOpen(true);
                sendMessage(`Draft a monthly status update for ${c.name} and save it to the "${folder}" folder. Include a summary of progress this month, what's currently in progress, next steps, and any blockers. Write it in a professional, client-facing tone.`);
              }}
            >
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors">
                <FileBarChart2 className="w-3.5 h-3.5" />
                Draft Status Update
              </button>
            </FolderPickerPopover>

            {/* Q1 countdown chip */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
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
        </div>

        {/* Tab bar */}
        <nav className="flex flex-wrap gap-1 items-center" aria-label="Client workspace tabs">
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
          {extraPlans.map((plan, i) => (
            <NavLink
              key={plan.id}
              to={`/advisor/clients/${id}/chapter/${plan.id}`}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )
              }
            >
              {plan.label ?? `Chapter ${5 + i}`}
            </NavLink>
          ))}
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="New Chapter"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chapter
          </button>
        </nav>
      </div>

      {/* Active tab content */}
      <Outlet context={{ client: c }} />

      <ChapterCreateDialog
        clientId={id}
        existingPlans={plans}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
