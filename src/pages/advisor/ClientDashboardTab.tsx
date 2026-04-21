import { useOutletContext } from "react-router-dom";
import { InvestmentProbabilitySection } from "@/components/clients/dashboard/InvestmentProbabilitySection";
import { AssessmentPulseWidget } from "@/components/clients/dashboard/AssessmentPulseWidget";
import { QuarterProgressWidget } from "@/components/clients/dashboard/QuarterProgressWidget";
import { ClientRoadmapWidget } from "@/components/clients/dashboard/ClientRoadmapWidget";
import { QuarterbackActionsPanel } from "@/components/clients/dashboard/QuarterbackActionsPanel";
import { SixKeysScoreGrid } from "@/components/clients/dashboard/SixKeysScoreGrid";
import { CapitalOptionalityPanel } from "@/components/clients/dashboard/CapitalOptionalityPanel";

// ---------------------------------------------------------------------------
// Types (match ClientWorkspace outlet context)
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  name: string;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  onboarded_at: string | null;
  capital_readiness: number;
  current_quarter?: number;
  current_year?: number;
  source_prospect_id?: string | null;
}

interface WorkspaceContext {
  client: ClientRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDashboardTab() {
  const { client } = useOutletContext<WorkspaceContext>();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ================================================================
          LEFT COLUMN — 2/3 width
      ================================================================ */}
      <div className="lg:col-span-2 space-y-6">
        <InvestmentProbabilitySection clientId={client.id} />

        <AssessmentPulseWidget clientId={client.id} clientName={client.name} />

        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quarter Progress
          </span>
          <QuarterProgressWidget client={client} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Q1 Roadmap
          </span>
          <ClientRoadmapWidget clientId={client.id} />
        </div>

        <QuarterbackActionsPanel clientId={client.id} clientName={client.name} />
      </div>

      {/* ================================================================
          RIGHT SIDEBAR — 1/3 width
      ================================================================ */}
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Six Keys of Capital
          </span>
          <SixKeysScoreGrid clientId={client.id} />
        </div>

        <div className="space-y-2">
          <CapitalOptionalityPanel clientId={client.id} />
        </div>
      </div>
    </div>
  );
}
