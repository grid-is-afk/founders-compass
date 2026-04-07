export interface FactorDefinition {
  name: string;
  category: string;
  considerations: string;
}

// ─── Business Attractiveness — 25 factors, scored 1–6 ────────────────────────

export const BA_FACTORS: FactorDefinition[] = [
  // Business (11)
  { name: "Years of Business Operation", category: "business", considerations: "How long has the company been established" },
  { name: "Management Strength", category: "business", considerations: "Tenure and experience of management team" },
  { name: "Customer Loyalty", category: "business", considerations: "Tenure and retention of customers" },
  { name: "Brand Awareness", category: "business", considerations: "Strength of brand recognition in market" },
  { name: "Customer Concentration", category: "business", considerations: "Diverse customer base, no single customer >10% revenue" },
  { name: "Packaged IP & Technology", category: "business", considerations: "Technology, processes, IP packaged and transferable" },
  { name: "Key Staff Longevity", category: "business", considerations: "Tenure and experience of key personnel" },
  { name: "Location & Facilities", category: "business", considerations: "Clean, modernized, updated facilities" },
  { name: "Non-Reliance on Key Manager", category: "business", considerations: "Can the business run without the owner" },
  { name: "Replicable Business Model", category: "business", considerations: "How easy to replicate the model" },
  { name: "Business Systems & Processes", category: "business", considerations: "Updated and documented processes and systems" },
  // Forecast (5)
  { name: "Profitability Past/Present", category: "forecast", considerations: "History of profits and industry benchmarks" },
  { name: "Profitability Growth Forecast", category: "forecast", considerations: "Defined future growth forecast" },
  { name: "Revenue Growth", category: "forecast", considerations: "History of consistent revenue growth" },
  { name: "Budget Certainty", category: "forecast", considerations: "Predictability of financial results" },
  { name: "Recurring Revenue Model", category: "forecast", considerations: "Predictability of demand and revenue" },
  // Market (5)
  { name: "Market Growth & Potential", category: "market", considerations: "State of industry and market outlook" },
  { name: "Industry Barriers to Entry", category: "market", considerations: "Barriers protecting from new competitors" },
  { name: "Competitive Advantage", category: "market", considerations: "Degree of competitive moat" },
  { name: "Dominant Market Position", category: "market", considerations: "Market share and positioning" },
  { name: "Economic Prosperity", category: "market", considerations: "State of the economy affecting the business" },
  // Investor (4)
  { name: "Reason for Selling", category: "investor", considerations: "Is the sale planned or forced" },
  { name: "Synergy & Value Add of Buyer", category: "investor", considerations: "Level of synergies for strategic buyer" },
  { name: "Degree of Risk", category: "investor", considerations: "Company-specific risk assessment" },
  { name: "Market for Business Sale", category: "investor", considerations: "State of the M&A market" },
];

// ─── Business Readiness — 22 factors, scored 1–6 ─────────────────────────────

export const BR_FACTORS: FactorDefinition[] = [
  { name: "Brand Issues", category: "brand_market", considerations: "Does the brand add value" },
  { name: "Company Documentation", category: "operations", considerations: "Corp docs, legal, operating agreements" },
  { name: "Compliance Issues", category: "legal_compliance", considerations: "Taxes, environmental, regulatory" },
  { name: "Credibility & Justification", category: "brand_market", considerations: "Customers, awards, community standing" },
  { name: "Customer Contracts", category: "strategy", considerations: "Customer & strategic alliances, warranties" },
  { name: "Employee & Management Issues", category: "operations", considerations: "Reliance, competency, morale, turnover" },
  { name: "Expense Contracts", category: "operations", considerations: "Suppliers, leases, insurance" },
  { name: "Expense Management", category: "financial", considerations: "SGA, insurance, banking, payroll, margins" },
  { name: "Financials", category: "financial", considerations: "Taxes, financial statements, analysis" },
  { name: "Immediate Value Readiness", category: "strategy", considerations: "How ready for a strategic buyer right now" },
  { name: "Intellectual Property", category: "legal_compliance", considerations: "Trademarks, patents, software, domains" },
  { name: "Government Grants", category: "legal_compliance", considerations: "R&D, federal, state, local opportunities" },
  { name: "Management Systems & Forecasts", category: "operations", considerations: "12-month to 3-year forecasts and scorecards" },
  { name: "Marketing Documentation & Systems", category: "brand_market", considerations: "Systematic marketing with proof" },
  { name: "Payment Considerations", category: "financial", considerations: "Net proceeds, terms, exit options" },
  { name: "Personal Expectations", category: "personal_planning", considerations: "Post-sale expectations and plan" },
  { name: "Personal Knowledge", category: "personal_planning", considerations: "Understanding of how buyers place value" },
  { name: "Product & Marketing Strategies", category: "strategy", considerations: "Products and markets analysis" },
  { name: "Revenue Drivers", category: "financial", considerations: "Lead generation, conversion rates" },
  { name: "Shareholder Goals", category: "strategy", considerations: "Shareholder alignment on exit" },
  { name: "Systems, Processes & Databases", category: "operations", considerations: "CRM, accounting, fulfillment systems" },
  { name: "Valuation Expectations", category: "financial", considerations: "Valuation and transition timeframe" },
];

// ─── Personal Readiness — 11 factors, scored 1–6 ─────────────────────────────

export const PR_FACTORS: FactorDefinition[] = [
  { name: "Written Personal Plan", category: "personal", considerations: "Interests outside business, personal goals defined and written" },
  { name: "Personal Financial Plan", category: "personal", considerations: "State of the owner's personal financial plan" },
  { name: "Personal Estate & Tax Plan", category: "personal", considerations: "Level of estate and tax planning completed" },
  { name: "Knowledge of Net Proceeds", category: "personal", considerations: "Understanding of net proceeds of each exit option" },
  { name: "Defined Post-Business Income Needs", category: "personal", considerations: "Awareness of spending/income requirements" },
  { name: "Dependency on Business Income", category: "personal", considerations: "Level of dependency on business for income" },
  { name: "Knowledge of Transition Process", category: "personal", considerations: "Understanding of the transition process" },
  { name: "Established Advisory Team", category: "personal", considerations: "Transition team defined and engaged" },
  { name: "Contingency Plans", category: "personal", considerations: "Personal contingency plan, buy-sell, insurance" },
  { name: "Knowledge of Deal Structure", category: "personal", considerations: "Pros and cons of exit options and deal structures" },
  { name: "Family Awareness of Plan", category: "personal", considerations: "Level of family discussions and meetings" },
];

// ─── 54 Value Factors — qualitative rating ───────────────────────────────────

export const VF_FACTORS: FactorDefinition[] = [
  // Personal (5)
  { name: "Age/Motivation of Owner", category: "personal", considerations: "Owner's age, exit plan, commitment level" },
  { name: "Attitude of Owner", category: "personal", considerations: "Cooperative, enthusiastic, honest, open" },
  { name: "Family/Partner Consensus", category: "personal", considerations: "Agreement among stakeholders on exit" },
  { name: "Reasonable Value Expectations", category: "personal", considerations: "Expectations aligned with market" },
  { name: "Open to Deal Structure", category: "personal", considerations: "Willingness to consider various deal terms" },
  // Business Operations (18)
  { name: "Products/Services", category: "business_operations", considerations: "Proprietary, differentiated, value-added" },
  { name: "Management Team", category: "business_operations", considerations: "Strong, experienced, track record" },
  { name: "Sales Team", category: "business_operations", considerations: "Strong sales with growth record" },
  { name: "Sales & Marketing Materials", category: "business_operations", considerations: "Up-to-date, attractive, informative" },
  { name: "Customer Base", category: "business_operations", considerations: "No concentration, long history, growing" },
  { name: "Customer Relationships", category: "business_operations", considerations: "Long-standing, with company not owner" },
  { name: "Vendor Concentration", category: "business_operations", considerations: "Multiple sources, competitive pricing" },
  { name: "Product/Service Quality", category: "business_operations", considerations: "High quality, certifications" },
  { name: "Employees", category: "business_operations", considerations: "Qualified, well-trained, motivated" },
  { name: "Employee Benefits", category: "business_operations", considerations: "Competitive benefit program" },
  { name: "Labor Relations", category: "business_operations", considerations: "Non-union, good relations" },
  { name: "Employee Relations", category: "business_operations", considerations: "Dedicated, positive attitudes, low turnover" },
  { name: "Facilities", category: "business_operations", considerations: "Clean, maintained, efficient, expandable" },
  { name: "Computer Systems", category: "business_operations", considerations: "Up-to-date, integrated, standard software" },
  { name: "Company Website", category: "business_operations", considerations: "Attractive, navigable, up-to-date" },
  { name: "Fixed Assets", category: "business_operations", considerations: "Up-to-date, well maintained" },
  { name: "Leases & Contracts", category: "business_operations", considerations: "Assignable, reasonable terms" },
  { name: "Location", category: "business_operations", considerations: "Convenient, good labor, transportation" },
  // Industry/Market (7)
  { name: "Consolidation Stage", category: "industry_market", considerations: "Industry consolidation activity" },
  { name: "Industry Outlook", category: "industry_market", considerations: "Favorable long-term outlook" },
  { name: "Growth Opportunities", category: "industry_market", considerations: "Identified, feasible, plans in place" },
  { name: "Industry Data Availability", category: "industry_market", considerations: "Information readily available" },
  { name: "Barriers to Entry", category: "industry_market", considerations: "High barriers protecting position" },
  { name: "Market Position", category: "industry_market", considerations: "Strong share or protected niche" },
  { name: "Product Obsolescence Risk", category: "industry_market", considerations: "Not threatened by technology or global competition" },
  // Legal/Regulatory (8)
  { name: "Corporate Structure", category: "legal_regulatory", considerations: "S-Corp, favorable tax treatment" },
  { name: "Board of Directors/Advisors", category: "legal_regulatory", considerations: "Credible outside directors in place" },
  { name: "Lawsuits", category: "legal_regulatory", considerations: "No current or history of lawsuits" },
  { name: "Tax Compliance", category: "legal_regulatory", considerations: "Current on filings and payments" },
  { name: "Environmental", category: "legal_regulatory", considerations: "No hazardous materials, clean audits" },
  { name: "OSHA Compliance", category: "legal_regulatory", considerations: "Clean inspection record" },
  { name: "Insurance Coverage", category: "legal_regulatory", considerations: "Sufficient liability coverage" },
  { name: "IP Protection", category: "legal_regulatory", considerations: "Patents, trademarks properly registered" },
  // Financial (12)
  { name: "Track Record", category: "financial", considerations: "Consistent growth in sales and profits" },
  { name: "Business Plan", category: "financial", considerations: "Documented 3-5 year plan with objectives" },
  { name: "Cyclicality", category: "financial", considerations: "Not affected by economic cycles" },
  { name: "Seasonality", category: "financial", considerations: "Stable throughout the year" },
  { name: "Revenue Size", category: "financial", considerations: "Upper half of competitors" },
  { name: "Operating Margins", category: "financial", considerations: "Equal or better than industry norms" },
  { name: "Overhead Costs", category: "financial", considerations: "Consistent with industry norms" },
  { name: "Assets vs Liabilities", category: "financial", considerations: "Substantial leveragable assets, low debt" },
  { name: "Receivables", category: "financial", considerations: "Consistent or better than industry" },
  { name: "Inventory", category: "financial", considerations: "Good turnover, no obsolete stock" },
  { name: "Current Liabilities", category: "financial", considerations: "Current, consistent with norms" },
  { name: "Capital Expenditures", category: "financial", considerations: "Relatively low requirements" },
  // Economic/M&A (2)
  { name: "Economy", category: "economic_ma", considerations: "Expanding economy, positive indicators" },
  { name: "M&A Marketplace", category: "economic_ma", considerations: "Active buyers, available financing" },
];

// ─── Config map ───────────────────────────────────────────────────────────────

export const ASSESSMENT_CONFIGS = {
  business_attractiveness: {
    label: "Business Attractiveness",
    shortLabel: "BA",
    factors: BA_FACTORS,
    maxPerFactor: 6,
    scoringType: "numeric" as const,
    description: "25 factors scored 1–6. Evaluates how attractive the business is to potential buyers.",
    factorCount: 25,
    maxScore: 150,
  },
  business_readiness: {
    label: "Business Readiness",
    shortLabel: "BR",
    factors: BR_FACTORS,
    maxPerFactor: 6,
    scoringType: "numeric" as const,
    description: "22 factors scored 1–6. Evaluates how ready the business is for transition.",
    factorCount: 22,
    maxScore: 132,
  },
  personal_readiness: {
    label: "Personal Readiness",
    shortLabel: "PR",
    factors: PR_FACTORS,
    maxPerFactor: 6,
    scoringType: "numeric" as const,
    description: "11 factors scored 1–6. Evaluates the owner's personal readiness for exit.",
    factorCount: 11,
    maxScore: 66,
  },
  value_factors: {
    label: "54 Value Factors",
    shortLabel: "VF",
    factors: VF_FACTORS,
    maxPerFactor: 0,
    scoringType: "qualitative" as const,
    description: "54 factors rated Positive / Neutral / For Improvement. Comprehensive buyer's-eye view.",
    factorCount: 54,
    maxScore: 0,
  },
} as const;

export type AssessmentTypeKey = keyof typeof ASSESSMENT_CONFIGS;
