import { useOutletContext } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useProspectExposureIndex } from "@/hooks/useProspectExposureIndex";
import { useProspectSixCs } from "@/hooks/useProspectSixCs";
import { ProspectAssessmentBlock } from "@/components/prospects/ProspectAssessmentBlock";
import type { ProspectShape } from "./ProspectWorkspace";
import type { Prospect } from "@/lib/types/journey";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProspectAssessmentsTab() {
  const { prospect } = useOutletContext<{ prospect: ProspectShape }>();

  const { data: exposureRecord } = useProspectExposureIndex(prospect.id);
  const { data: sixCsRecord } = useProspectSixCs(prospect.id);

  // ProspectAssessmentBlock expects an ExposureIndexSummary (subset of full record)
  const exposureSummary = exposureRecord
    ? {
        id: exposureRecord.id,
        prospect_id: exposureRecord.prospect_id,
        category_scores: exposureRecord.category_scores,
        completed_at: exposureRecord.completed_at,
      }
    : null;

  // ProspectAssessmentBlock expects a SixCsSummary (subset of full record)
  const sixCsSummary = sixCsRecord
    ? {
        id: sixCsRecord.id,
        prospect_id: sixCsRecord.prospect_id,
        scores: sixCsRecord.scores,
        total_score: sixCsRecord.total_score,
        completed_at: sixCsRecord.completed_at,
      }
    : null;

  // Cast ProspectShape to the Prospect type expected by ProspectAssessmentBlock
  const prospectForBlock: Prospect = {
    id: prospect.id,
    name: prospect.name,
    contact: prospect.contact,
    company: prospect.company,
    revenue: prospect.revenue,
    source: prospect.source,
    status: prospect.status,
    fitScore: prospect.fitScore,
    fitDecision: prospect.fitDecision,
    notes: prospect.notes,
    date: prospect.date,
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4.5 h-4.5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Assessments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Exposure Index and Six C's results for this prospect.
          </p>
        </div>
      </div>

      {/* Assessment block — each assessment shows its synced HubSpot result (when
          present) in its own strip; no separate synced block needed. */}
      <ProspectAssessmentBlock
        prospect={prospectForBlock}
        exposureSummary={exposureSummary}
        sixCsRecord={sixCsSummary}
        freUrl={prospect.assessment_fre_url}
        sixcsUrl={prospect.assessment_sixcs_url}
        discoveryUrl={prospect.assessment_discovery_url}
      />
    </div>
  );
}
