// Shared lookups for chat-generated reports. Kept in one place so the two-step
// report flow (generate_report gathers context → save_report persists content)
// and any other caller resolve a report's title and Data Room category
// identically — otherwise the deliverable row written by one step and read by
// the other could diverge.

// Map chat-generated reportType → Data Room category. Mirrors the categories
// each dedicated /generate-* route uses for the same reportType so a single
// document type is filed identically regardless of generation path.
export const CATEGORY_BY_REPORT_TYPE: Record<string, string> = {
  quarterly_review: "Quarterly Review",
  onboarding_brief: "Reports",
};

// Human-readable title per chat report type. Shared by generate_report (which
// creates the deliverable row) and save_report (which fills in its content), so
// the title used to reconcile the two calls always matches.
export const REPORT_TITLE_BY_TYPE: Record<string, string> = {
  capital_readiness_memo: "Capital Readiness Memo",
  client_brief: "Client Brief",
  risk_summary: "Risk Summary",
  board_update: "Board-Style Update",
  assessment_summary: "Assessment Summary",
  quarterly_review: "Quarterly Review",
  meeting_recap: "Meeting Recap",
  monthly_status_update: "Monthly Status Update",
  onboarding_brief: "Onboarding Brief",
};
