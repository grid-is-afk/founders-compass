import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// Document checklist mapping — based on Six C's category score thresholds.
// Low (0–1) or medium (2) scores trigger corresponding document requests.
// ---------------------------------------------------------------------------
interface DocumentItem {
  category: string;
  label: string;
}

function generateDocumentChecklist(
  scores: Record<string, number>
): DocumentItem[] {
  const docs: DocumentItem[] = [];

  // challenge = Clarity analog in Six C's
  const challenge = scores["challenge"] ?? 3;
  if (challenge <= 2) {
    docs.push(
      { category: "Clarity", label: "Business plan" },
      { category: "Clarity", label: "Executive summary" },
      { category: "Clarity", label: "Problem / solution statement" }
    );
  }

  // call_to_action = Capital proxy
  const callToAction = scores["call_to_action"] ?? 3;
  if (callToAction <= 2) {
    docs.push(
      { category: "Capital", label: "Balance sheet" },
      { category: "Capital", label: "Income statement" },
      { category: "Capital", label: "Cap table" },
      { category: "Capital", label: "Existing term sheets" }
    );
  }

  // champion = Customers proxy (team + traction)
  const champion = scores["champion"] ?? 3;
  if (champion <= 2) {
    docs.push(
      { category: "Customers", label: "Customer list" },
      { category: "Customers", label: "Revenue breakdown by customer" },
      { category: "Customers", label: "Churn data" }
    );
  }

  // change = Cash Flow proxy (impact and outcomes)
  const change = scores["change"] ?? 3;
  if (change <= 2) {
    docs.push(
      { category: "Cash Flow", label: "3 years P&L" },
      { category: "Cash Flow", label: "Monthly cash flow statements" },
      { category: "Cash Flow", label: "Bank statements" }
    );
  }

  // credibility = Collateral proxy
  const credibility = scores["credibility"] ?? 3;
  if (credibility <= 2) {
    docs.push(
      { category: "Collateral", label: "Asset summary" },
      { category: "Collateral", label: "IP documentation" },
      { category: "Collateral", label: "Patents / trademarks" }
    );
  }

  // connection = Conditions proxy (market fit)
  const connection = scores["connection"] ?? 3;
  if (connection <= 2) {
    docs.push(
      { category: "Conditions", label: "Market analysis" },
      { category: "Conditions", label: "Competitive landscape" },
      { category: "Conditions", label: "Regulatory documents" }
    );
  }

  return docs;
}

const STATIC_FALLBACK_DOCS: DocumentItem[] = [
  { category: "Financial", label: "Balance Sheet" },
  { category: "Financial", label: "Income Statement" },
  { category: "Financial", label: "Personal Financial Statement" },
  { category: "Assets", label: "Asset Summary" },
  { category: "IP", label: "IP / Patent Documentation" },
];

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/six-cs-baseline
// Reads source_prospect_id from the client, fetches prospect_six_cs record,
// and generates a document checklist based on scores.
// ---------------------------------------------------------------------------
router.get("/:clientId/six-cs-baseline", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    // Verify client ownership
    const clientResult = await query(
      "SELECT id, source_prospect_id FROM clients WHERE id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }

    const { source_prospect_id } = clientResult.rows[0] as {
      source_prospect_id: string | null;
    };

    if (!source_prospect_id) {
      // No linked prospect — return static fallback
      return res.json({
        six_cs: null,
        document_checklist: STATIC_FALLBACK_DOCS,
        has_baseline: false,
      });
    }

    // FIX-2A: Verify the linked prospect belongs to the requesting advisor before
    // exposing any of its Six C's data. Without this check, any advisor who knew
    // a valid prospect UUID could read another advisor's assessment data.
    const prospectOwnerCheck = await query(
      "SELECT id FROM prospects WHERE id = $1 AND advisor_id = $2",
      [source_prospect_id, advisorId]
    );
    if (prospectOwnerCheck.rows.length === 0) {
      return res.status(403).json({ error: "Linked prospect not found or access denied" });
    }

    // Fetch the prospect's Six C's record
    const sixCsResult = await query(
      `SELECT id, prospect_id, scores, total_score, completed_at
       FROM prospect_six_cs
       WHERE prospect_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [source_prospect_id]
    );

    if (sixCsResult.rows.length === 0) {
      return res.json({
        six_cs: null,
        document_checklist: STATIC_FALLBACK_DOCS,
        has_baseline: false,
      });
    }

    const sixCsRow = sixCsResult.rows[0];
    const scores = sixCsRow.scores as Record<string, number>;
    const documentChecklist = generateDocumentChecklist(scores);

    return res.json({
      six_cs: {
        id: sixCsRow.id,
        prospect_id: sixCsRow.prospect_id,
        scores,
        total_score: sixCsRow.total_score,
        completed_at: sixCsRow.completed_at,
      },
      document_checklist: documentChecklist,
      has_baseline: true,
    });
  } catch (err) {
    console.error("GET /clients/:clientId/six-cs-baseline error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
