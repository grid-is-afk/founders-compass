import { useOutletContext } from "react-router-dom";
import { ClipboardList, ExternalLink } from "lucide-react";
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

      {/* HubSpot-synced assessment results — deep-links to the external result
          pages. Scores live in TFO's assessment apps, not HubSpot, so we link
          out rather than render them inline. */}
      {(prospect.assessment_fre_url ||
        prospect.assessment_discovery_url ||
        prospect.assessment_sixcs_url) && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-foreground">
            Self-assessment results <span className="font-normal text-muted-foreground">— synced from HubSpot</span>
          </p>
          {([
            ["Founder Readiness", prospect.assessment_fre_url],
            ["Founders Discovery Paths", prospect.assessment_discovery_url],
            ["Six C's Framework", prospect.assessment_sixcs_url],
          ] as const).map(([label, url]) =>
            url ? (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground hover:border-primary/40 hover:bg-accent/40 transition-colors"
              >
                <span>{label}</span>
                <span className="flex items-center gap-1 text-primary">
                  View result <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            ) : null
          )}
        </div>
      )}

      {/* Assessment block */}
      <ProspectAssessmentBlock
        prospect={prospectForBlock}
        exposureSummary={exposureSummary}
        sixCsRecord={sixCsSummary}
      />
    </div>
  );
}
