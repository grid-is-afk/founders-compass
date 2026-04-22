import { Router } from "express";
import { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SixCsRecord {
  total_score: number;
  scores: Record<string, number>;
  completed_at: string;
}

interface ExposureIndexRecord {
  total: number;
  category_scores: Record<string, number>;
  completed_at: string;
}

interface FounderMatrixRecord {
  entity_type: string;
  completed_at: string;
}

interface FounderSnapshotRecord {
  responses: Record<string, { signal?: string }>;
  completed_at: string;
}

interface OptionalityFrameworkRecord {
  conditions_met: number;
  total: number;
  completed_at: string;
}

interface SixKeysRecord {
  scores: Record<string, number | null>;
  scored_count: number;
  completed_at: string;
}

interface CapitalOptionalityRecord {
  scenarios_set: number;
  completed_at: string;
}

interface MultiplesRecord {
  initial_multiple: number | null;
  current_multiple: number | null;
  best_in_class: number | null;
  goal_multiple: number | null;
}

interface ActionItemsRecord {
  total: number;
  done: number;
}

interface AssessmentSummary {
  prospect: {
    six_cs: SixCsRecord | null;
    exposure_index: ExposureIndexRecord | null;
  };
  q1_discover: {
    exposure_index: ExposureIndexRecord | null;
    founder_matrix: FounderMatrixRecord | null;
    founder_snapshot: FounderSnapshotRecord | null;
    optionality_framework: OptionalityFrameworkRecord | null;
  };
  ongoing: {
    six_keys: SixKeysRecord | null;
    capital_optionality: CapitalOptionalityRecord | null;
    multiples: MultiplesRecord | null;
  };
  action_items: ActionItemsRecord;
}

// ---------------------------------------------------------------------------
// GET /:clientId/assessment-summary
// ---------------------------------------------------------------------------

router.get("/:clientId/assessment-summary", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    // Get client record to obtain source_prospect_id
    const clientResult = await query(
      "SELECT id, source_prospect_id FROM clients WHERE id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );
    const sourceProspectId = (
      clientResult.rows[0] as { source_prospect_id: string | null }
    ).source_prospect_id;

    // Run all DB queries in parallel — two groups because prospect queries
    // depend on sourceProspectId which we already have.
    const [
      prospectSixCsResult,
      prospectEiResult,
      clientSixCsResult,
      clientEiResult,
      clientMatrixResult,
      clientSnapshotResult,
      clientOptionalityResult,
      clientSixKeysResult,
      clientCapitalResult,
      clientMultiplesResult,
      diagnoseTasksResult,
    ] = await Promise.all([
      // Prospect-stage assessments (may be null if no source_prospect_id)
      sourceProspectId
        ? query(
            `SELECT total_score, scores, completed_at
             FROM prospect_six_cs
             WHERE prospect_id = $1
             ORDER BY completed_at DESC
             LIMIT 1`,
            [sourceProspectId]
          )
        : Promise.resolve({ rows: [] }),

      // Fallback Six C's from client_six_cs (used when client skipped prospect pipeline)
      query(
        `SELECT total_score, scores, completed_at
         FROM client_six_cs
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),

      sourceProspectId
        ? query(
            `SELECT category_scores, completed_at
             FROM prospect_exposure_index
             WHERE prospect_id = $1
             ORDER BY completed_at DESC
             LIMIT 1`,
            [sourceProspectId]
          )
        : Promise.resolve({ rows: [] }),

      // Q1 Discover assessments
      query(
        `SELECT category_scores, completed_at
         FROM client_exposure_index
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),

      query(
        `SELECT entity_type, completed_at
         FROM client_founder_matrix
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),

      query(
        `SELECT responses, completed_at
         FROM client_founder_snapshot
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),

      query(
        `SELECT responses, completed_at
         FROM client_optionality_framework
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),

      // Ongoing metrics
      query(
        `SELECT clarity, alignment, structure, stewardship, velocity, legacy, completed_at
         FROM client_six_keys
         WHERE client_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [clientId]
      ),

      query(
        `SELECT minority_recap_pct, strategic_acq_pct, esop_pct, full_exit_pct, completed_at
         FROM client_capital_optionality
         WHERE client_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [clientId]
      ),

      query(
        `SELECT initial_multiple, current_multiple, best_in_class, goal_multiple, updated_at
         FROM client_multiples
         WHERE client_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [clientId]
      ),

      // Diagnose action items count
      query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'done') AS done
         FROM tasks
         WHERE client_id = $1 AND phase = 'diagnose'`,
        [clientId]
      ),
    ]);

    // ---------------------------------------------------------------------------
    // Shape prospect data
    // ---------------------------------------------------------------------------

    let prospectSixCs: SixCsRecord | null = null;
    const sixCsRow =
      prospectSixCsResult.rows.length > 0
        ? prospectSixCsResult.rows[0]
        : clientSixCsResult.rows.length > 0
        ? clientSixCsResult.rows[0]
        : null;
    if (sixCsRow) {
      prospectSixCs = {
        total_score: sixCsRow.total_score as number,
        scores: (sixCsRow.scores as Record<string, number>) ?? {},
        completed_at: sixCsRow.completed_at as string,
      };
    }

    let prospectEi: ExposureIndexRecord | null = null;
    if (prospectEiResult.rows.length > 0) {
      const r = prospectEiResult.rows[0];
      const catScores = (r.category_scores as Record<string, number>) ?? {};
      const total = Object.values(catScores).reduce((acc, v) => acc + v, 0);
      prospectEi = {
        total,
        category_scores: catScores,
        completed_at: r.completed_at as string,
      };
    }

    // ---------------------------------------------------------------------------
    // Shape Q1 Discover data
    // ---------------------------------------------------------------------------

    let clientEi: ExposureIndexRecord | null = null;
    if (clientEiResult.rows.length > 0) {
      const r = clientEiResult.rows[0];
      const catScores = (r.category_scores as Record<string, number>) ?? {};
      const total = Object.values(catScores).reduce((acc, v) => acc + v, 0);
      clientEi = {
        total,
        category_scores: catScores,
        completed_at: r.completed_at as string,
      };
    }

    let founderMatrix: FounderMatrixRecord | null = null;
    if (clientMatrixResult.rows.length > 0) {
      const r = clientMatrixResult.rows[0];
      founderMatrix = {
        entity_type: r.entity_type as string,
        completed_at: r.completed_at as string,
      };
    }

    let founderSnapshot: FounderSnapshotRecord | null = null;
    if (clientSnapshotResult.rows.length > 0) {
      const r = clientSnapshotResult.rows[0];
      founderSnapshot = {
        responses: (r.responses as Record<
          string,
          { signal?: string }
        >) ?? {},
        completed_at: r.completed_at as string,
      };
    }

    let optionalityFramework: OptionalityFrameworkRecord | null = null;
    if (clientOptionalityResult.rows.length > 0) {
      const r = clientOptionalityResult.rows[0];
      const responses = (r.responses as Record<
        string,
        { status?: string }
      >) ?? {};
      const conditionsMet = Object.values(responses).filter(
        (v) => v?.status === "yes"
      ).length;
      const total = Object.keys(responses).length;
      optionalityFramework = {
        conditions_met: conditionsMet,
        total,
        completed_at: r.completed_at as string,
      };
    }

    // ---------------------------------------------------------------------------
    // Shape ongoing metrics
    // ---------------------------------------------------------------------------

    let sixKeys: SixKeysRecord | null = null;
    if (clientSixKeysResult.rows.length > 0) {
      const r = clientSixKeysResult.rows[0];
      const scoreFields = {
        clarity: r.clarity as number | null,
        alignment: r.alignment as number | null,
        structure: r.structure as number | null,
        stewardship: r.stewardship as number | null,
        velocity: r.velocity as number | null,
        legacy: r.legacy as number | null,
      };
      const scoredCount = Object.values(scoreFields).filter(
        (v) => v !== null && v !== undefined
      ).length;
      sixKeys = {
        scores: scoreFields,
        scored_count: scoredCount,
        completed_at: r.completed_at as string,
      };
    }

    let capitalOptionality: CapitalOptionalityRecord | null = null;
    if (clientCapitalResult.rows.length > 0) {
      const r = clientCapitalResult.rows[0];
      const scenariosSet = [
        r.minority_recap_pct,
        r.strategic_acq_pct,
        r.esop_pct,
        r.full_exit_pct,
      ].filter((v) => v !== null && v !== 0).length;
      capitalOptionality = {
        scenarios_set: scenariosSet,
        completed_at: r.completed_at as string,
      };
    }

    let multiples: MultiplesRecord | null = null;
    if (clientMultiplesResult.rows.length > 0) {
      const r = clientMultiplesResult.rows[0];
      if (
        r.initial_multiple !== null ||
        r.current_multiple !== null ||
        r.goal_multiple !== null
      ) {
        multiples = {
          initial_multiple:
            r.initial_multiple !== null ? Number(r.initial_multiple) : null,
          current_multiple:
            r.current_multiple !== null ? Number(r.current_multiple) : null,
          best_in_class:
            r.best_in_class !== null ? Number(r.best_in_class) : null,
          goal_multiple:
            r.goal_multiple !== null ? Number(r.goal_multiple) : null,
        };
      }
    }

    const taskRow = diagnoseTasksResult.rows[0] as
      | { total: string; done: string }
      | undefined;

    const actionItems: ActionItemsRecord = {
      total: taskRow ? parseInt(taskRow.total, 10) : 0,
      done: taskRow ? parseInt(taskRow.done, 10) : 0,
    };

    const summary: AssessmentSummary = {
      prospect: {
        six_cs: prospectSixCs,
        exposure_index: prospectEi,
      },
      q1_discover: {
        exposure_index: clientEi,
        founder_matrix: founderMatrix,
        founder_snapshot: founderSnapshot,
        optionality_framework: optionalityFramework,
      },
      ongoing: {
        six_keys: sixKeys,
        capital_optionality: capitalOptionality,
        multiples,
      },
      action_items: actionItems,
    };

    return res.json(summary);
  } catch (err) {
    console.error("GET /:clientId/assessment-summary error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
