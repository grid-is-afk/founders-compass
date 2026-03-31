import {
  ClientAssessments,
  BusinessAttractivenessAssessment,
  BusinessReadinessAssessment,
  PersonalReadinessAssessment,
  ValueFactorsAssessment,
} from "./types/assessments";

// ─── Assessment 1: Business Attractiveness (25 factors, max 150) ─────────────
// Target: ~72% → 108/150

const businessAttractiveness: BusinessAttractivenessAssessment = {
  id: "ba-meridian-001",
  clientId: "1",
  completedDate: "2026-03-10",
  lastModified: "2026-03-10",
  factors: [
    // BUSINESS (11 factors)
    {
      id: "ba-b-01",
      name: "Years of Operation",
      category: "business",
      score: 5,
      considerations:
        "Meridian has been operating for 18 years, establishing a credible track record that institutional buyers and lenders view favorably.",
    },
    {
      id: "ba-b-02",
      name: "Management Strength",
      category: "business",
      score: 4,
      considerations:
        "A capable senior leadership team is in place, though two key roles remain dependent on the founding owner for critical decision-making.",
    },
    {
      id: "ba-b-03",
      name: "Customer Loyalty",
      category: "business",
      score: 4,
      considerations:
        "Net Promoter Score of 61 and an average customer relationship of 7.2 years signal strong retention, with some churn risk in the mid-market segment.",
    },
    {
      id: "ba-b-04",
      name: "Brand Recognition",
      category: "business",
      score: 5,
      considerations:
        "Meridian is recognized as a regional market leader with consistent press coverage and a strong LinkedIn presence in its vertical.",
    },
    {
      id: "ba-b-05",
      name: "Customer Concentration",
      category: "business",
      score: 3,
      considerations:
        "Top three customers represent 38% of total revenue; this concentration will require mitigation before a formal sale process.",
    },
    {
      id: "ba-b-06",
      name: "Intellectual Property",
      category: "business",
      score: 4,
      considerations:
        "The company holds two registered trademarks and one pending patent for its proprietary process methodology, though documentation is incomplete.",
    },
    {
      id: "ba-b-07",
      name: "Key Staff Longevity",
      category: "business",
      score: 4,
      considerations:
        "Average employee tenure is 6.4 years; three key managers have been with the firm over a decade, providing operational continuity.",
    },
    {
      id: "ba-b-08",
      name: "Facilities",
      category: "business",
      score: 5,
      considerations:
        "Primary operating facility is modern, fully owned by the entity, and represents a tangible asset that supports the company's balance sheet valuation.",
    },
    {
      id: "ba-b-09",
      name: "Owner Reliance",
      category: "business",
      score: 3,
      considerations:
        "Several high-value client relationships are managed personally by the owner, creating transferability risk that must be systematically addressed.",
    },
    {
      id: "ba-b-10",
      name: "Replicable Business Model",
      category: "business",
      score: 5,
      considerations:
        "Core service delivery is well-documented and has been successfully replicated across three geographic expansions in the past four years.",
    },
    {
      id: "ba-b-11",
      name: "Systems & Processes",
      category: "business",
      score: 5,
      considerations:
        "ERP and CRM platforms are fully implemented and integrated, with documented standard operating procedures covering 80% of operational workflows.",
    },

    // FORECAST (5 factors)
    {
      id: "ba-f-01",
      name: "Profitability",
      category: "forecast",
      score: 5,
      considerations:
        "Adjusted EBITDA margin of 22% exceeds industry benchmarks, with a three-year average of 19.5%, providing a strong foundation for valuation.",
    },
    {
      id: "ba-f-02",
      name: "Growth Forecast",
      category: "forecast",
      score: 4,
      considerations:
        "Independent market analysis supports a 12–15% compound annual growth rate over the next three years, contingent on planned capacity expansion.",
    },
    {
      id: "ba-f-03",
      name: "Revenue Growth",
      category: "forecast",
      score: 5,
      considerations:
        "Revenue has grown at a 17% CAGR over the trailing three years, outpacing the industry average of 9% and reinforcing the company's competitive positioning.",
    },
    {
      id: "ba-f-04",
      name: "Budget Certainty",
      category: "forecast",
      score: 4,
      considerations:
        "Annual budgets are prepared with detailed assumptions and reviewed quarterly; variance from forecast has been within 8% in each of the last three years.",
    },
    {
      id: "ba-f-05",
      name: "Recurring Revenue",
      category: "forecast",
      score: 4,
      considerations:
        "Approximately 61% of total revenue is derived from subscription and retainer-based contracts, providing meaningful predictability for prospective acquirers.",
    },

    // MARKET (5 factors)
    {
      id: "ba-m-01",
      name: "Market Growth",
      category: "market",
      score: 5,
      considerations:
        "The served addressable market is projected to grow at 11% annually through 2030, driven by regulatory tailwinds and increasing enterprise adoption.",
    },
    {
      id: "ba-m-02",
      name: "Barriers to Entry",
      category: "market",
      score: 4,
      considerations:
        "High regulatory licensing requirements and long customer switching costs create meaningful moats, though well-capitalized new entrants remain a risk.",
    },
    {
      id: "ba-m-03",
      name: "Competitive Advantage",
      category: "market",
      score: 5,
      considerations:
        "Proprietary data analytics capability and a 14-year exclusive distribution agreement with a key supplier provide durable differentiation.",
    },
    {
      id: "ba-m-04",
      name: "Market Position",
      category: "market",
      score: 4,
      considerations:
        "Meridian holds the third-largest market share in its regional segment at approximately 18%, with a clear pathway to second position through organic growth.",
    },
    {
      id: "ba-m-05",
      name: "Economic Prosperity",
      category: "market",
      score: 4,
      considerations:
        "Demand for the company's services has demonstrated resilience in two prior economic downturns, with revenue declining less than 5% in each period.",
    },

    // INVESTOR (4 factors)
    {
      id: "ba-i-01",
      name: "Reason for Selling",
      category: "investor",
      score: 4,
      considerations:
        "Owner has articulated a clear and credible transition rationale tied to retirement planning and a desire to secure employee legacy, which resonates with strategic buyers.",
    },
    {
      id: "ba-i-02",
      name: "Synergy Potential",
      category: "investor",
      score: 5,
      considerations:
        "The company's customer base and geographic footprint are highly complementary to three identified strategic acquirers, creating strong synergy value.",
    },
    {
      id: "ba-i-03",
      name: "Risk Assessment",
      category: "investor",
      score: 4,
      considerations:
        "Overall risk profile is moderate; the primary risks — customer concentration and owner reliance — are quantified and have active mitigation plans in place.",
    },
    {
      id: "ba-i-04",
      name: "Market for Sale",
      category: "investor",
      score: 4,
      considerations:
        "Current M&A activity in the sector is elevated, with trailing EBITDA multiples averaging 7.2x for comparable transactions completed in the past 18 months.",
    },
  ],
};

// ─── Assessment 2: Business Readiness (22 factors, max 132) ─────────────────
// Target: ~68% → 90/132

const businessReadiness: BusinessReadinessAssessment = {
  id: "br-meridian-001",
  clientId: "1",
  completedDate: "2026-03-12",
  lastModified: "2026-03-12",
  factors: [
    // BRAND & MARKET (3)
    {
      id: "br-bm-01",
      name: "Brand Equity",
      category: "brand_market",
      score: 5,
      considerations:
        "The Meridian brand commands a price premium in its market and is consistently cited by customers as a primary reason for choosing the company over competitors.",
    },
    {
      id: "br-bm-02",
      name: "Market Credibility",
      category: "brand_market",
      score: 5,
      considerations:
        "Industry awards, thought leadership content, and association memberships reinforce Meridian's authority and reduce buyer skepticism during due diligence.",
    },
    {
      id: "br-bm-03",
      name: "Marketing Infrastructure",
      category: "brand_market",
      score: 4,
      considerations:
        "A foundational digital marketing program has been established with lead tracking and initial outbound campaigns, though the function remains below the scale expected for a business of this size.",
    },

    // OPERATIONS (5)
    {
      id: "br-op-01",
      name: "Process Documentation",
      category: "operations",
      score: 4,
      considerations:
        "SOPs for core delivery workflows are now consistently maintained and version-controlled; remaining documentation gaps are limited to edge-case procedures that are actively being addressed.",
    },
    {
      id: "br-op-02",
      name: "Employee & Management Structure",
      category: "operations",
      score: 4,
      considerations:
        "Organizational structure is clear and logical, with defined reporting lines and a functional leadership team capable of operating independently of the owner for 90-day periods.",
    },
    {
      id: "br-op-03",
      name: "Expense Contracts",
      category: "operations",
      score: 4,
      considerations:
        "Major vendor and supply contracts are transferable and have been reviewed by counsel, with no change-of-control clauses that would trigger renegotiation upon sale.",
    },
    {
      id: "br-op-04",
      name: "Systems & Technology",
      category: "operations",
      score: 4,
      considerations:
        "Cloud-based ERP and CRM systems are current, scalable, and do not require replacement post-acquisition, reducing integration costs for a buyer.",
    },
    {
      id: "br-op-05",
      name: "Management Systems",
      category: "operations",
      score: 4,
      considerations:
        "Monthly management reporting packs are produced on a consistent cadence, providing buyers with the operating visibility required to underwrite a transaction.",
    },

    // FINANCIAL (5)
    {
      id: "br-fi-01",
      name: "Expense Management",
      category: "financial",
      score: 4,
      considerations:
        "Operating expenses are well-controlled and benchmarked against industry peers; discretionary and owner-related add-backs have been clearly identified and documented.",
    },
    {
      id: "br-fi-02",
      name: "Financial Statements",
      category: "financial",
      score: 5,
      considerations:
        "Three years of reviewed financial statements are available, with a CPA-prepared quality of earnings analysis completed and ready for buyer distribution.",
    },
    {
      id: "br-fi-03",
      name: "Revenue Drivers",
      category: "financial",
      score: 5,
      considerations:
        "Key revenue drivers are clearly identified, quantified, and documented in a revenue bridge analysis that demonstrates the sustainability of historical growth.",
    },
    {
      id: "br-fi-04",
      name: "Payment & Working Capital",
      category: "financial",
      score: 4,
      considerations:
        "Days sales outstanding is 34 days — within acceptable range — and the working capital cycle is well understood and documented for the normalized balance sheet.",
    },
    {
      id: "br-fi-05",
      name: "Valuation Expectations",
      category: "financial",
      score: 4,
      considerations:
        "Owner's valuation expectation of 6.5–7x adjusted EBITDA is supported by comparable transactions, reducing the likelihood of a price gap during negotiations.",
    },

    // LEGAL & COMPLIANCE (3)
    {
      id: "br-lc-01",
      name: "Regulatory Compliance",
      category: "legal_compliance",
      score: 4,
      considerations:
        "All required licenses and permits are current and in good standing; a compliance audit was completed in Q4 2025 with no material findings.",
    },
    {
      id: "br-lc-02",
      name: "Intellectual Property Protection",
      category: "legal_compliance",
      score: 4,
      considerations:
        "Registered IP assets are assigned to the operating entity and confirmed by IP counsel, though one pending trademark application requires resolution before closing.",
    },
    {
      id: "br-lc-03",
      name: "Government Grants & Incentives",
      category: "legal_compliance",
      score: 2,
      considerations:
        "The company has received state and federal grants totaling $840K with clawback provisions that are not fully understood; counsel review is required before any transaction.",
    },

    // PERSONAL PLANNING (2)
    {
      id: "br-pp-01",
      name: "Personal Financial Expectations",
      category: "personal_planning",
      score: 5,
      considerations:
        "Owner has a clearly defined post-sale financial plan, including documented income replacement needs and tax strategy, reducing the likelihood of last-minute deal hesitation.",
    },
    {
      id: "br-pp-02",
      name: "Exit Process Knowledge",
      category: "personal_planning",
      score: 4,
      considerations:
        "Owner has engaged in education on the M&A process and understands the stages of a transaction, including due diligence, reps and warranties, and post-closing obligations.",
    },

    // STRATEGY (4)
    {
      id: "br-st-01",
      name: "Customer Contracts",
      category: "strategy",
      score: 4,
      considerations:
        "Contract formalization is underway with approximately 60% of customer relationships now operating under current written agreements; the remaining conversions are scheduled within the next quarter.",
    },
    {
      id: "br-st-02",
      name: "Immediate Value Readiness",
      category: "strategy",
      score: 3,
      considerations:
        "Several value-creation initiatives identified in the 90-Day Sprint remain incomplete, which may limit the company's ability to achieve top-of-range valuations in the near term.",
    },
    {
      id: "br-st-03",
      name: "Product & Service Strategy",
      category: "strategy",
      score: 4,
      considerations:
        "A three-year product roadmap is in place and has been validated with key customers, providing buyers with a credible post-acquisition growth narrative.",
    },
    {
      id: "br-st-04",
      name: "Shareholder Goals Alignment",
      category: "strategy",
      score: 4,
      considerations:
        "All shareholders are aligned on exit timeline and deal structure preferences, eliminating a common source of late-stage transaction failure.",
    },
  ],
};

// ─── Assessment 3: Personal Readiness (11 factors, max 66) ──────────────────
// Target: ~80% → 53/66

const personalReadiness: PersonalReadinessAssessment = {
  id: "pr-meridian-001",
  clientId: "1",
  completedDate: "2026-03-14",
  lastModified: "2026-03-14",
  factors: [
    {
      id: "pr-01",
      name: "Written Personal Plan",
      score: 5,
      considerations:
        "Owner has a documented personal life plan outlining post-exit goals, philanthropic interests, and a meaningful-use-of-time framework developed with a personal advisor.",
    },
    {
      id: "pr-02",
      name: "Personal Financial Plan",
      score: 5,
      considerations:
        "A comprehensive personal financial plan — including investment policy, retirement income projections, and stress-tested scenarios — has been prepared by a CFP.",
    },
    {
      id: "pr-03",
      name: "Estate & Tax Plan",
      score: 4,
      considerations:
        "Estate documents are in place and current; however, the estate plan has not yet been updated to reflect current asset values or the anticipated liquidity event.",
    },
    {
      id: "pr-04",
      name: "Knowledge of Net Proceeds",
      score: 5,
      considerations:
        "Owner has completed a deal economics analysis and clearly understands the expected after-tax net proceeds across multiple deal structures and transaction scenarios.",
    },
    {
      id: "pr-05",
      name: "Post-Exit Income Needs",
      score: 5,
      considerations:
        "Lifestyle and income requirements have been quantified and confirmed to be fully fundable from anticipated net proceeds alone, providing complete financial independence post-exit.",
    },
    {
      id: "pr-06",
      name: "Business Dependency Assessment",
      score: 4,
      considerations:
        "A structured assessment identified three areas of meaningful emotional attachment to the business; owner is actively working with a coach to develop post-exit identity and purpose.",
    },
    {
      id: "pr-07",
      name: "Transition & Integration Knowledge",
      score: 5,
      considerations:
        "Owner has studied buyer integration expectations and is prepared to commit to a 12–18 month transition employment agreement with defined milestones and performance metrics.",
    },
    {
      id: "pr-08",
      name: "Advisory Team Completeness",
      score: 5,
      considerations:
        "A full advisory team — exit planner, M&A attorney, CPA, wealth manager, and personal coach — is engaged and actively coordinating as a unified exit team.",
    },
    {
      id: "pr-09",
      name: "Contingency Plans",
      score: 4,
      considerations:
        "Written contingency plans address forced exit scenarios including disability, death, partner dispute, and key customer loss, with corresponding insurance mechanisms in place.",
    },
    {
      id: "pr-10",
      name: "Deal Structure Knowledge",
      score: 5,
      considerations:
        "Owner is conversant in deal structure mechanics including earnouts, seller notes, equity rollover, and tax implications of asset versus stock transactions.",
    },
    {
      id: "pr-11",
      name: "Family & Stakeholder Awareness",
      score: 6,
      considerations:
        "All immediate family members are fully informed of the exit timeline and anticipated outcomes, and have participated in facilitated family meetings to align expectations.",
    },
  ],
};

// ─── Assessment 4: 54 Value Factors ─────────────────────────────────────────
// Target: 35 positive, 11 neutral, 8 improvement
// Distribution: Personal(5): 3p/1n/1i | BizOps(18): 11p/5n/2i
//               Industry(7): 5p/1n/1i | Legal(8): 5p/2n/1i
//               Financial(12): 9p/1n/2i | Econ/MA(4): 2p/1n/1i

const valueFactors: ValueFactorsAssessment = {
  id: "vf-meridian-001",
  clientId: "1",
  completedDate: "2026-03-15",
  lastModified: "2026-03-15",
  factors: [
    // PERSONAL (5)
    {
      id: "vf-pe-01",
      name: "Owner Health & Vitality",
      category: "personal",
      rating: "positive",
      considerations:
        "Owner is in good health with no anticipated medical issues that would accelerate or complicate the exit timeline.",
    },
    {
      id: "vf-pe-02",
      name: "Motivation to Sell",
      category: "personal",
      rating: "positive",
      considerations:
        "Owner has a clearly defined and emotionally resolved motivation to exit, reducing the risk of deal fatigue or last-minute withdrawal.",
    },
    {
      id: "vf-pe-03",
      name: "Lifestyle & Post-Exit Vision",
      category: "personal",
      rating: "positive",
      considerations:
        "A well-articulated vision for post-exit life has been documented, providing psychological readiness for the identity shift that accompanies business sale.",
    },
    {
      id: "vf-pe-04",
      name: "Family Alignment",
      category: "personal",
      rating: "neutral",
      considerations:
        "Spouse is generally supportive but has not been fully engaged in financial planning conversations; a facilitated family session is recommended before going to market.",
    },
    {
      id: "vf-pe-05",
      name: "Personal Debt & Obligations",
      category: "personal",
      rating: "improvement",
      considerations:
        "Personal guarantees on two real estate loans represent contingent liabilities that should be unwound or disclosed as part of the deal structure analysis.",
    },

    // BUSINESS OPERATIONS (18)
    {
      id: "vf-bo-01",
      name: "Revenue Diversification",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Revenue is spread across four service lines but three customers in one segment represent 38% of total revenue, requiring a concentration mitigation plan.",
    },
    {
      id: "vf-bo-02",
      name: "Recurring Revenue Quality",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Subscription and retainer revenue is underpinned by written agreements with automatic renewal clauses, supporting a premium valuation multiple.",
    },
    {
      id: "vf-bo-03",
      name: "Customer Retention Rate",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Annual customer retention of 91% over three years demonstrates the stickiness of the company's service delivery and relationships.",
    },
    {
      id: "vf-bo-04",
      name: "Employee Retention & Culture",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Voluntary turnover rate of 7% — well below the 14% industry average — and high Glassdoor scores indicate a culture that will survive a change in ownership.",
    },
    {
      id: "vf-bo-05",
      name: "Management Team Depth",
      category: "business_operations",
      rating: "positive",
      considerations:
        "A capable second-tier management team can run daily operations autonomously, making the business credible to both strategic and financial buyers.",
    },
    {
      id: "vf-bo-06",
      name: "Operational Scalability",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Core delivery infrastructure can support 40% revenue growth without proportional headcount increase, validating the buyer's post-acquisition synergy thesis.",
    },
    {
      id: "vf-bo-07",
      name: "Technology & Systems",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Technology stack is modern, cloud-based, and does not require near-term capital reinvestment, reducing the buyer's post-acquisition integration burden.",
    },
    {
      id: "vf-bo-08",
      name: "Supplier Relationships",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Key supplier agreements are transferable and carry favorable pricing terms that have been confirmed to survive a change of control.",
    },
    {
      id: "vf-bo-09",
      name: "Owner Dependency (Operations)",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Owner remains involved in three operational areas that have not yet been delegated; a 90-day transition plan to reassign these responsibilities is in development.",
    },
    {
      id: "vf-bo-10",
      name: "Brand & Reputation",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The Meridian brand is an asset with quantifiable premium pricing power, consistent online reputation scores, and active protection through trademark registration.",
    },
    {
      id: "vf-bo-11",
      name: "Process Standardization",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "SOPs are in place for approximately 80% of core processes; the remaining 20% are tacit knowledge held by senior staff and require documentation before marketing.",
    },
    {
      id: "vf-bo-12",
      name: "Inventory & Working Capital",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Working capital requirements are lean and well-understood, with normalized net working capital clearly defined for the purchase price adjustment mechanism.",
    },
    {
      id: "vf-bo-13",
      name: "Facilities & Real Estate",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Primary facility is owned by the entity, appraised at $2.1M, and can be sold and leased back to provide additional liquidity at closing.",
    },
    {
      id: "vf-bo-14",
      name: "Insurance Coverage",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Commercial insurance policies are in place but have not been reviewed in two years; coverage limits and policy transferability should be confirmed prior to marketing.",
    },
    {
      id: "vf-bo-15",
      name: "Cybersecurity & Data Privacy",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Basic cybersecurity controls are in place, but no formal penetration test or SOC 2 assessment has been completed, which sophisticated buyers will require in due diligence.",
    },
    {
      id: "vf-bo-16",
      name: "Environmental Compliance",
      category: "business_operations",
      rating: "positive",
      considerations:
        "No known environmental liabilities; Phase I assessment completed in 2023 returned no findings, eliminating a common source of deal uncertainty.",
    },
    {
      id: "vf-bo-17",
      name: "Quality Control Systems",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Quality assurance processes are informal and not consistently applied; a structured QA framework should be implemented to support scalability and buyer confidence.",
    },
    {
      id: "vf-bo-18",
      name: "Customer Contract Formalization",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Approximately 30% of customer relationships operate without formal agreements; contract formalization is a prerequisite for achieving top-of-market valuation.",
    },

    // INDUSTRY & MARKET (7)
    {
      id: "vf-im-01",
      name: "Industry Growth Rate",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The served industry is growing at 11% annually, well above GDP, and strategic acquirers are actively competing for assets in this sector.",
    },
    {
      id: "vf-im-02",
      name: "Competitive Landscape",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The fragmented competitive landscape with no dominant national player creates favorable conditions for a buyer seeking platform acquisition opportunities.",
    },
    {
      id: "vf-im-03",
      name: "Barriers to Entry",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Regulatory licensing, long sales cycles, and established customer relationships create meaningful moats that protect market share from new entrants.",
    },
    {
      id: "vf-im-04",
      name: "Market Share Position",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Meridian holds the third position in its regional market at approximately 18% share, with a clearly executable plan to move to second position.",
    },
    {
      id: "vf-im-05",
      name: "Technology Disruption Risk",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "AI-powered competitive tools are beginning to emerge in adjacent categories; while not an immediate threat, the company should articulate its technology adaptation strategy for buyers.",
    },
    {
      id: "vf-im-06",
      name: "Regulatory Environment",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Regulatory tailwinds from recent federal legislation are expected to increase demand for the company's services by an estimated 20% over the next three years.",
    },
    {
      id: "vf-im-07",
      name: "Geographic Expansion Opportunity",
      category: "industry_market",
      rating: "improvement",
      considerations:
        "The company has not yet expanded beyond its primary regional market; a documented expansion plan would increase the acquisition price and buyer interest.",
    },

    // LEGAL & REGULATORY (8)
    {
      id: "vf-lr-01",
      name: "Corporate Governance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "Board minutes, shareholder resolutions, and operating agreements are current, complete, and organized for immediate due diligence review.",
    },
    {
      id: "vf-lr-02",
      name: "Litigation & Claims History",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "No pending or threatened litigation; the company has a clean claims history over the past five years, which will be confirmed in standard legal representations.",
    },
    {
      id: "vf-lr-03",
      name: "Employment Agreements",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "Key employee agreements include non-compete, non-solicitation, and confidentiality provisions that have been reviewed and confirmed to be enforceable by employment counsel.",
    },
    {
      id: "vf-lr-04",
      name: "Licenses & Permits",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All required operational licenses are current and transferable, with no discretionary renewals pending that could create closing conditions in a transaction.",
    },
    {
      id: "vf-lr-05",
      name: "Data Privacy Compliance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "GDPR and state privacy law compliance posture has been reviewed by external counsel and is documented in a privacy compliance program maintained by operations.",
    },
    {
      id: "vf-lr-06",
      name: "Government Grant Obligations",
      category: "legal_regulatory",
      rating: "improvement",
      considerations:
        "Grant clawback provisions have not been fully analyzed for change-of-control triggers; legal counsel must complete this review before commencing a sale process.",
    },
    {
      id: "vf-lr-07",
      name: "Intellectual Property Assignments",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "A majority of IP is assigned to the entity, but work-product agreements with two independent contractors require updating to confirm assignment completeness.",
    },
    {
      id: "vf-lr-08",
      name: "Environmental & Safety Compliance",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "OSHA and environmental compliance records are maintained but have not been compiled into a buyer-ready format; preparation will be required for due diligence.",
    },

    // FINANCIAL (12)
    {
      id: "vf-fi-01",
      name: "EBITDA Quality & Sustainability",
      category: "financial",
      rating: "positive",
      considerations:
        "Adjusted EBITDA of $2.7M reflects a stable margin profile with well-documented add-backs that have been independently validated in a quality of earnings report.",
    },
    {
      id: "vf-fi-02",
      name: "Revenue Trend",
      category: "financial",
      rating: "positive",
      considerations:
        "Three-year revenue CAGR of 17% substantially exceeds the industry benchmark, supporting a growth-company framing that commands premium valuation multiples.",
    },
    {
      id: "vf-fi-03",
      name: "Gross Margin Profile",
      category: "financial",
      rating: "positive",
      considerations:
        "Gross margins of 58% are among the highest in the peer group and demonstrate pricing power and operational efficiency attractive to sophisticated acquirers.",
    },
    {
      id: "vf-fi-04",
      name: "Cash Flow Conversion",
      category: "financial",
      rating: "positive",
      considerations:
        "Free cash flow conversion exceeds 85% of EBITDA, indicating capital-efficient operations with limited reinvestment required to sustain current growth.",
    },
    {
      id: "vf-fi-05",
      name: "Balance Sheet Strength",
      category: "financial",
      rating: "positive",
      considerations:
        "Current ratio of 2.1 and minimal long-term debt create a clean balance sheet that simplifies deal structure and reduces financing risk for buyers.",
    },
    {
      id: "vf-fi-06",
      name: "Financial Statement Quality",
      category: "financial",
      rating: "positive",
      considerations:
        "CPA-reviewed financial statements for the past three fiscal years are organized and free of material adjustments, providing buyers with high-confidence data.",
    },
    {
      id: "vf-fi-07",
      name: "Tax Compliance & Structure",
      category: "financial",
      rating: "positive",
      considerations:
        "All tax returns are filed and current; a tax advisor has identified an S-Corp election opportunity that could generate $280K in annualized tax savings before closing.",
    },
    {
      id: "vf-fi-08",
      name: "Capital Expenditure Requirements",
      category: "financial",
      rating: "positive",
      considerations:
        "Maintenance capex is modest at 2.3% of revenue; no major capital expenditure is required in the next 24 months, preserving buyer cash flow post-acquisition.",
    },
    {
      id: "vf-fi-09",
      name: "Owner Compensation Normalization",
      category: "financial",
      rating: "positive",
      considerations:
        "Owner compensation and perquisites have been normalized in the quality of earnings analysis, with market-rate replacement cost benchmarked against published comp data.",
    },
    {
      id: "vf-fi-10",
      name: "Debt & Leverage",
      category: "financial",
      rating: "neutral",
      considerations:
        "A term loan with $1.4M outstanding requires payoff at closing; net debt position is straightforward and has been incorporated into the enterprise value bridge.",
    },
    {
      id: "vf-fi-11",
      name: "Revenue Recognition Policies",
      category: "financial",
      rating: "improvement",
      considerations:
        "Revenue is recognized on a cash basis rather than accrual; conversion to accrual-basis accounting is required to align with GAAP and buyer reporting standards.",
    },
    {
      id: "vf-fi-12",
      name: "Projections & Financial Modeling",
      category: "financial",
      rating: "improvement",
      considerations:
        "Forward-looking financial projections have not been formalized in a buyer-ready format; a three-year projection model with documented assumptions is required for marketing.",
    },

    // ECONOMIC & M&A (4)
    {
      id: "vf-em-01",
      name: "M&A Market Activity",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Strategic and private equity acquisition activity in the sector is at a five-year high, with buyer demand outpacing available quality assets and compressing time-to-close.",
    },
    {
      id: "vf-em-02",
      name: "Interest Rate Environment",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Current debt financing costs for leveraged buyouts have moderated from 2023–2024 peaks, restoring private equity capacity and supporting full-price transactions.",
    },
    {
      id: "vf-em-03",
      name: "Valuation Multiples",
      category: "economic_ma",
      rating: "neutral",
      considerations:
        "Sector multiples have compressed slightly from 2021 peaks but remain healthy at 6.8–7.5x trailing EBITDA for businesses with Meridian's profile and growth rate.",
    },
    {
      id: "vf-em-04",
      name: "Buyer Pool Quality",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "While the total buyer pool is deep, the subset of buyers with relevant operational experience and cultural alignment to Meridian is narrower than ideal and warrants proactive cultivation.",
    },
  ],
};

// ─── Assembled ClientAssessments for Meridian Industries (id: "1") ──────────

export const meridianAssessments: ClientAssessments = {
  clientId: "1",
  businessAttractiveness,
  businessReadiness,
  personalReadiness,
  valueFactors,
};

// ═══════════════════════════════════════════════════════════════════════════
// ATLAS MANUFACTURING (id: "2")
// Early stage, low scores: BA 45% (68/150), BR 42% (56/132), PR 38% (25/66)
// VF: 19 positive, 15 neutral, 20 improvement (35% positive)
// ═══════════════════════════════════════════════════════════════════════════

// Atlas BA: scores sum to 68/150 = 45%
// Distribution: 11 business factors (sum 30), 5 forecast (sum 13), 5 market (sum 14), 4 investor (sum 11)
const atlasBusinessAttractiveness: BusinessAttractivenessAssessment = {
  id: "ba-atlas-001",
  clientId: "2",
  completedDate: "2026-02-15",
  lastModified: "2026-02-15",
  factors: [
    // BUSINESS (11 factors) — sum = 30
    {
      id: "ba-b-01",
      name: "Years of Operation",
      category: "business",
      score: 3,
      considerations:
        "Atlas has operated for 7 years, enough to show survival but insufficient to demonstrate the multi-cycle resilience that institutional buyers require.",
    },
    {
      id: "ba-b-02",
      name: "Management Strength",
      category: "business",
      score: 2,
      considerations:
        "The management team is thin and reactive; two of three senior roles were filled in the past 18 months and have not yet proven themselves under pressure.",
    },
    {
      id: "ba-b-03",
      name: "Customer Loyalty",
      category: "business",
      score: 2,
      considerations:
        "Customer churn is running at 22% annually, well above the industry average, and exit interviews consistently cite service inconsistency as the primary reason.",
    },
    {
      id: "ba-b-04",
      name: "Brand Recognition",
      category: "business",
      score: 2,
      considerations:
        "Atlas has no meaningful brand presence beyond its immediate locality; the company has no defined brand strategy, website SEO, or thought leadership program.",
    },
    {
      id: "ba-b-05",
      name: "Customer Concentration",
      category: "business",
      score: 1,
      considerations:
        "Two customers account for 61% of total revenue, creating existential concentration risk that will disqualify most institutional buyers without a multi-year mitigation plan.",
    },
    {
      id: "ba-b-06",
      name: "Intellectual Property",
      category: "business",
      score: 2,
      considerations:
        "No registered IP exists; manufacturing processes are undocumented and held in the knowledge of two long-tenured employees who are approaching retirement.",
    },
    {
      id: "ba-b-07",
      name: "Key Staff Longevity",
      category: "business",
      score: 3,
      considerations:
        "A handful of shop-floor veterans provide operational continuity, but the management layer has high turnover and no retention agreements are in place.",
    },
    {
      id: "ba-b-08",
      name: "Facilities",
      category: "business",
      score: 4,
      considerations:
        "The manufacturing facility is owned by the entity and appraised at $1.8M; while the building is aging, it represents a tangible asset that anchors the balance sheet.",
    },
    {
      id: "ba-b-09",
      name: "Owner Reliance",
      category: "business",
      score: 2,
      considerations:
        "The owner is involved in quoting, customer relationships, key supplier negotiations, and production scheduling — no meaningful aspect of the business operates independently.",
    },
    {
      id: "ba-b-10",
      name: "Replicable Business Model",
      category: "business",
      score: 3,
      considerations:
        "The manufacturing model is conceptually replicable, but the absence of documented processes means replication would require rebuilding tribal knowledge from scratch.",
    },
    {
      id: "ba-b-11",
      name: "Systems & Processes",
      category: "business",
      score: 6,
      considerations:
        "Atlas recently implemented a modern ERP system that now tracks production, inventory, and job costing in real time — a genuine strength in an otherwise early-stage profile.",
    },

    // FORECAST (5 factors) — sum = 13
    {
      id: "ba-f-01",
      name: "Profitability",
      category: "forecast",
      score: 3,
      considerations:
        "EBITDA margins hover around 8%, below the manufacturing sector median of 12%; inconsistent job costing has historically masked true profitability by product line.",
    },
    {
      id: "ba-f-02",
      name: "Growth Forecast",
      category: "forecast",
      score: 2,
      considerations:
        "No formal growth forecast exists; management expects flat revenue for the next two years as they work through capacity constraints and customer concentration issues.",
    },
    {
      id: "ba-f-03",
      name: "Revenue Growth",
      category: "forecast",
      score: 3,
      considerations:
        "Revenue grew 4% last year after two flat years; growth is entirely dependent on one customer's expansion, not market share gains from new customers.",
    },
    {
      id: "ba-f-04",
      name: "Budget Certainty",
      category: "forecast",
      score: 2,
      considerations:
        "No formal budgeting process exists; the owner operates from a mental model of historical run rates and has no documented variance analysis or forward plan.",
    },
    {
      id: "ba-f-05",
      name: "Recurring Revenue",
      category: "forecast",
      score: 3,
      considerations:
        "Approximately 40% of revenue recurs through annual supply agreements, but these are informal understandings rather than enforceable contracts with renewal provisions.",
    },

    // MARKET (5 factors) — sum = 14
    {
      id: "ba-m-01",
      name: "Market Growth",
      category: "market",
      score: 3,
      considerations:
        "The precision manufacturing segment is growing at 5% annually, driven by reshoring trends, but Atlas has not positioned itself to capture this tailwind meaningfully.",
    },
    {
      id: "ba-m-02",
      name: "Barriers to Entry",
      category: "market",
      score: 4,
      considerations:
        "Capital equipment requirements and long customer qualification cycles create moderate barriers; however, Atlas's undifferentiated positioning offers little protection beyond these structural factors.",
    },
    {
      id: "ba-m-03",
      name: "Competitive Advantage",
      category: "market",
      score: 2,
      considerations:
        "Atlas competes primarily on price and relationships; without documented process IP or proprietary technology, the company has no durable competitive moat.",
    },
    {
      id: "ba-m-04",
      name: "Market Position",
      category: "market",
      score: 2,
      considerations:
        "Atlas holds less than 2% market share in its regional segment and is not recognized as a preferred vendor by OEM procurement teams in its target categories.",
    },
    {
      id: "ba-m-05",
      name: "Economic Prosperity",
      category: "market",
      score: 3,
      considerations:
        "Manufacturing demand is cyclical; Atlas experienced a 19% revenue decline in the last downturn, which is in line with the sector but reflects no defensive positioning.",
    },

    // INVESTOR (4 factors) — sum = 11
    {
      id: "ba-i-01",
      name: "Reason for Selling",
      category: "investor",
      score: 2,
      considerations:
        "The owner's stated motivation is burnout after a difficult operational period; buyers will probe whether the sale is motivated by undisclosed business deterioration.",
    },
    {
      id: "ba-i-02",
      name: "Synergy Potential",
      category: "investor",
      score: 3,
      considerations:
        "The facility and equipment could be synergistic for a strategic buyer adding capacity, but the lack of customer diversification limits the acqui-hire or platform thesis.",
    },
    {
      id: "ba-i-03",
      name: "Risk Assessment",
      category: "investor",
      score: 3,
      considerations:
        "Customer concentration, owner reliance, and undocumented processes combine into a high-risk profile; none of these have active mitigation plans in place.",
    },
    {
      id: "ba-i-04",
      name: "Market for Sale",
      category: "investor",
      score: 3,
      considerations:
        "Manufacturing M&A is active for well-run businesses; at Atlas's current profile the likely buyer universe is limited to individual operators and small family offices.",
    },
  ],
};

// Atlas BR: scores sum to 56/132 = 42%
// Distribution: brand_market 3 (sum 6), operations 5 (sum 12), financial 5 (sum 12),
//               legal_compliance 3 (sum 6), personal_planning 2 (sum 5), strategy 4 (sum 15)
const atlasBusinessReadiness: BusinessReadinessAssessment = {
  id: "br-atlas-001",
  clientId: "2",
  completedDate: "2026-02-18",
  lastModified: "2026-02-18",
  factors: [
    // BRAND & MARKET (3) — sum = 6
    {
      id: "br-bm-01",
      name: "Brand Equity",
      category: "brand_market",
      score: 2,
      considerations:
        "Atlas has no measurable brand equity beyond name recognition with its two anchor customers; no external market research has assessed buyer perception or brand value.",
    },
    {
      id: "br-bm-02",
      name: "Market Credibility",
      category: "brand_market",
      score: 2,
      considerations:
        "No industry awards, certifications, or thought leadership positions exist; the company has minimal digital presence and is unknown to the broader buyer community.",
    },
    {
      id: "br-bm-03",
      name: "Marketing Infrastructure",
      category: "brand_market",
      score: 2,
      considerations:
        "Marketing consists of occasional trade show attendance and word-of-mouth referrals; no CRM, lead tracking, or digital marketing program is in place.",
    },

    // OPERATIONS (5) — sum = 12
    {
      id: "br-op-01",
      name: "Process Documentation",
      category: "operations",
      score: 2,
      considerations:
        "Critical manufacturing processes exist only as tribal knowledge; no SOPs, work instructions, or quality standards are documented in a transferable format.",
    },
    {
      id: "br-op-02",
      name: "Employee & Management Structure",
      category: "operations",
      score: 2,
      considerations:
        "The organizational chart is informal and has never been formally documented; reporting lines are ambiguous and the owner is the de facto decision-maker for all material issues.",
    },
    {
      id: "br-op-03",
      name: "Expense Contracts",
      category: "operations",
      score: 3,
      considerations:
        "Key supplier contracts are in place but have not been reviewed for change-of-control provisions; two critical material suppliers have informal arrangements only.",
    },
    {
      id: "br-op-04",
      name: "Systems & Technology",
      category: "operations",
      score: 3,
      considerations:
        "The newly implemented ERP system is a meaningful improvement, but adoption is inconsistent across the shop floor and data integrity issues remain from the legacy system.",
    },
    {
      id: "br-op-05",
      name: "Management Systems",
      category: "operations",
      score: 2,
      considerations:
        "No formal management reporting exists; the owner reviews QuickBooks monthly and manages by exception with no KPI dashboard or structured operating review cadence.",
    },

    // FINANCIAL (5) — sum = 12
    {
      id: "br-fi-01",
      name: "Expense Management",
      category: "financial",
      score: 2,
      considerations:
        "Operating expenses are not benchmarked against peers; the owner's personal expenses commingled with business costs have not been identified or normalized.",
    },
    {
      id: "br-fi-02",
      name: "Financial Statements",
      category: "financial",
      score: 2,
      considerations:
        "Only tax-basis financial statements are available; no reviewed or audited financials exist, and the prior two years contain material bookkeeping errors that require correction.",
    },
    {
      id: "br-fi-03",
      name: "Revenue Drivers",
      category: "financial",
      score: 3,
      considerations:
        "Revenue drivers are understood at a high level but have never been formally documented; no revenue bridge or cohort analysis exists to support buyer underwriting.",
    },
    {
      id: "br-fi-04",
      name: "Payment & Working Capital",
      category: "financial",
      score: 2,
      considerations:
        "Days sales outstanding averages 67 days and working capital is frequently strained; a line of credit covers gaps but the underlying cycle has not been analyzed.",
    },
    {
      id: "br-fi-05",
      name: "Valuation Expectations",
      category: "financial",
      score: 3,
      considerations:
        "The owner's valuation expectation has not been formally benchmarked; preliminary discussions suggest an expectation that may exceed what the financial profile can support.",
    },

    // LEGAL & COMPLIANCE (3) — sum = 6
    {
      id: "br-lc-01",
      name: "Regulatory Compliance",
      category: "legal_compliance",
      score: 2,
      considerations:
        "EPA and OSHA compliance documentation is incomplete; a minor OSHA citation was issued 18 months ago and remediation has not been formally closed out.",
    },
    {
      id: "br-lc-02",
      name: "Intellectual Property Protection",
      category: "legal_compliance",
      score: 2,
      considerations:
        "No IP protection strategy exists; proprietary tooling designs and process methods are unregistered and unprotected, creating vulnerability to employee or competitor misappropriation.",
    },
    {
      id: "br-lc-03",
      name: "Government Grants & Incentives",
      category: "legal_compliance",
      score: 2,
      considerations:
        "Atlas received a state manufacturing grant with unreviewed conditions; the terms have not been analyzed for change-of-control implications or repayment triggers.",
    },

    // PERSONAL PLANNING (2) — sum = 5
    {
      id: "br-pp-01",
      name: "Personal Financial Expectations",
      category: "personal_planning",
      score: 2,
      considerations:
        "The owner has not engaged a financial planner and has no documented understanding of post-sale income requirements, tax impact, or investment strategy for proceeds.",
    },
    {
      id: "br-pp-02",
      name: "Exit Process Knowledge",
      category: "personal_planning",
      score: 3,
      considerations:
        "The owner has a surface-level understanding of M&A from industry conversations but has not engaged in formal education on deal process, due diligence, or closing mechanics.",
    },

    // STRATEGY (4) — sum = 15
    {
      id: "br-st-01",
      name: "Customer Contracts",
      category: "strategy",
      score: 2,
      considerations:
        "Less than 20% of customer revenue is supported by written agreements; most relationships operate on purchase-order terms with no multi-year commitment from either side.",
    },
    {
      id: "br-st-02",
      name: "Immediate Value Readiness",
      category: "strategy",
      score: 2,
      considerations:
        "The business is not ready for a formal sale process; completing foundational readiness work is estimated to require 18–24 months before the company can present competitively.",
    },
    {
      id: "br-st-03",
      name: "Product & Service Strategy",
      category: "strategy",
      score: 5,
      considerations:
        "Atlas has identified a new precision component category where it holds a genuine technical advantage; this nascent capability represents the most compelling part of the growth narrative.",
    },
    {
      id: "br-st-04",
      name: "Shareholder Goals Alignment",
      category: "strategy",
      score: 6,
      considerations:
        "The sole owner has a clear and singular goal — maximize after-tax proceeds while protecting the jobs of long-tenured employees — eliminating any shareholder alignment complexity.",
    },
  ],
};

// Atlas PR: scores sum to 25/66 = 38%
const atlasPersonalReadiness: PersonalReadinessAssessment = {
  id: "pr-atlas-001",
  clientId: "2",
  completedDate: "2026-02-20",
  lastModified: "2026-02-20",
  factors: [
    {
      id: "pr-01",
      name: "Written Personal Plan",
      score: 1,
      considerations:
        "No written personal plan exists; the owner has not articulated post-exit goals, lifestyle intentions, or a meaningful-use-of-time framework in any documented form.",
    },
    {
      id: "pr-02",
      name: "Personal Financial Plan",
      score: 2,
      considerations:
        "The owner has a relationship with a financial advisor but no formal plan has been prepared; retirement projections and income replacement modeling have never been completed.",
    },
    {
      id: "pr-03",
      name: "Estate & Tax Plan",
      score: 2,
      considerations:
        "Basic estate documents — a will and a durable power of attorney — exist but were last updated in 2014 and do not reflect current asset values or contemplated transaction structures.",
    },
    {
      id: "pr-04",
      name: "Knowledge of Net Proceeds",
      score: 2,
      considerations:
        "The owner has no analysis of expected after-tax proceeds; the gross sale price is being conflated with net proceeds, creating a significant risk of post-close financial disappointment.",
    },
    {
      id: "pr-05",
      name: "Post-Exit Income Needs",
      score: 2,
      considerations:
        "Post-sale income requirements have not been quantified; the owner is uncertain whether proceeds from the business at current value would sustain the desired lifestyle.",
    },
    {
      id: "pr-06",
      name: "Business Dependency Assessment",
      score: 2,
      considerations:
        "The owner's personal identity is deeply intertwined with the business and community standing it provides; no formal assessment of this dependency or transition coaching has begun.",
    },
    {
      id: "pr-07",
      name: "Transition & Integration Knowledge",
      score: 3,
      considerations:
        "The owner is willing to stay on post-closing but has not studied what buyers expect during integration; transition length, obligations, and performance triggers remain undefined.",
    },
    {
      id: "pr-08",
      name: "Advisory Team Completeness",
      score: 2,
      considerations:
        "Only a CPA and general practice attorney are currently engaged; no exit planner, M&A-specialist attorney, or wealth manager familiar with business liquidity events is in place.",
    },
    {
      id: "pr-09",
      name: "Contingency Plans",
      score: 2,
      considerations:
        "No written contingency plans address forced exit scenarios; the owner has no disability coverage adequate for a multi-year exit process and no documented succession intent.",
    },
    {
      id: "pr-10",
      name: "Deal Structure Knowledge",
      score: 3,
      considerations:
        "The owner understands the concept of a business sale at a high level but has limited familiarity with earnouts, seller notes, equity rollovers, or the tax implications of deal structure choices.",
    },
    {
      id: "pr-11",
      name: "Family & Stakeholder Awareness",
      score: 4,
      considerations:
        "The owner's spouse is aware that a sale is being contemplated but has not been included in planning conversations; adult children who work in the business have not been formally informed.",
    },
  ],
};

// Atlas VF: 19 positive, 15 neutral, 20 improvement (35% positive)
const atlasValueFactors: ValueFactorsAssessment = {
  id: "vf-atlas-001",
  clientId: "2",
  completedDate: "2026-02-22",
  lastModified: "2026-02-22",
  factors: [
    // PERSONAL (5): 2 positive, 1 neutral, 2 improvement
    {
      id: "vf-pe-01",
      name: "Owner Health & Vitality",
      category: "personal",
      rating: "positive",
      considerations:
        "Owner is in good physical health with no conditions that would accelerate or complicate an exit timeline.",
    },
    {
      id: "vf-pe-02",
      name: "Motivation to Sell",
      category: "personal",
      rating: "positive",
      considerations:
        "Owner's motivation is genuine and consistent — burnout and a desire to reduce personal financial risk — which buyers will find credible upon probing.",
    },
    {
      id: "vf-pe-03",
      name: "Lifestyle & Post-Exit Vision",
      category: "personal",
      rating: "neutral",
      considerations:
        "The owner has vague aspirations for retirement but no articulated post-exit vision; this lack of clarity often leads to deal hesitation or last-minute withdrawal.",
    },
    {
      id: "vf-pe-04",
      name: "Family Alignment",
      category: "personal",
      rating: "improvement",
      considerations:
        "Two adult children work in the business and have different views on the company's future; aligning family expectations is an urgent prerequisite for a clean sale process.",
    },
    {
      id: "vf-pe-05",
      name: "Personal Debt & Obligations",
      category: "personal",
      rating: "improvement",
      considerations:
        "Personal guarantees on equipment loans and a facility mortgage totaling $1.1M will require payoff or restructuring as part of any transaction, reducing net proceeds meaningfully.",
    },

    // BUSINESS OPERATIONS (18): 6 positive, 5 neutral, 7 improvement
    {
      id: "vf-bo-01",
      name: "Revenue Diversification",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Two customers represent 61% of revenue; this is the single most damaging factor in Atlas's value profile and must be actively addressed before any sale process begins.",
    },
    {
      id: "vf-bo-02",
      name: "Recurring Revenue Quality",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Recurring supply arrangements exist but are underpinned only by purchase orders; converting even three of these to multi-year agreements would meaningfully improve the value narrative.",
    },
    {
      id: "vf-bo-03",
      name: "Customer Retention Rate",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Annual churn of 22% is well above the sector benchmark and signals service quality or relationship issues that a buyer will scrutinize aggressively in due diligence.",
    },
    {
      id: "vf-bo-04",
      name: "Employee Retention & Culture",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Core production staff average 9 years of tenure — a genuine operational asset in a sector where skilled-trade retention is difficult — though management-layer churn remains elevated.",
    },
    {
      id: "vf-bo-05",
      name: "Management Team Depth",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "There is no credible second tier of management; if the owner were removed today, operations would likely deteriorate within 30 days, making this a critical pre-sale investment.",
    },
    {
      id: "vf-bo-06",
      name: "Operational Scalability",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Physical capacity exists to absorb 30% more revenue without major capital investment, but the management infrastructure to run at that scale does not currently exist.",
    },
    {
      id: "vf-bo-07",
      name: "Technology & Systems",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The newly deployed ERP system represents a genuine asset; a buyer can leverage existing data infrastructure as the foundation for post-acquisition performance management.",
    },
    {
      id: "vf-bo-08",
      name: "Supplier Relationships",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Key supplier relationships are managed personally by the owner; transferability has not been tested and several critical suppliers have no formal agreements.",
    },
    {
      id: "vf-bo-09",
      name: "Owner Dependency (Operations)",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Owner is operationally irreplaceable across quoting, customer management, supplier negotiation, and production scheduling — a profile that will command a significant valuation discount.",
    },
    {
      id: "vf-bo-10",
      name: "Brand & Reputation",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "The Atlas name carries a positive local reputation for reliability but has no measurable brand equity, digital presence, or recognition beyond the immediate customer base.",
    },
    {
      id: "vf-bo-11",
      name: "Process Standardization",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "No manufacturing SOPs, quality standards, or work instructions are formally documented; the absence of process standardization is the most common buyer objection in due diligence.",
    },
    {
      id: "vf-bo-12",
      name: "Inventory & Working Capital",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Inventory management is informal with no cycle counts or ABC analysis; working capital requirements are poorly understood and the normalized NWC peg cannot currently be determined.",
    },
    {
      id: "vf-bo-13",
      name: "Facilities & Real Estate",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The owned facility is a tangible asset that adds credibility to the balance sheet and provides a sale-leaseback option to generate additional closing liquidity.",
    },
    {
      id: "vf-bo-14",
      name: "Insurance Coverage",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Commercial insurance was last reviewed in 2021 and should be updated; coverage appears functional for ongoing operations, though a formal policy review before marketing is recommended.",
    },
    {
      id: "vf-bo-15",
      name: "Cybersecurity & Data Privacy",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "No cybersecurity controls, incident response plan, or data privacy policy exists; ERP customer data is at risk and this will be flagged in any buyer's IT due diligence.",
    },
    {
      id: "vf-bo-16",
      name: "Environmental Compliance",
      category: "business_operations",
      rating: "positive",
      considerations:
        "No known environmental liabilities or enforcement actions exist; while a Phase I environmental assessment will be required before closing, no red flags have been identified.",
    },
    {
      id: "vf-bo-17",
      name: "Quality Control Systems",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Quality is managed informally by experienced operators with no formal QMS, inspection records, or corrective action process, which will concern OEM and tier-one customers' buyers.",
    },
    {
      id: "vf-bo-18",
      name: "Customer Contract Formalization",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The top two customers do have annual supply agreements in place, which is a foundational positive given their revenue concentration — though these need change-of-control review.",
    },

    // INDUSTRY & MARKET (7): 3 positive, 3 neutral, 1 improvement
    {
      id: "vf-im-01",
      name: "Industry Growth Rate",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Reshoring and supply chain diversification trends are driving 5–7% annual growth in domestic precision manufacturing, a tailwind Atlas is positioned to benefit from.",
    },
    {
      id: "vf-im-02",
      name: "Competitive Landscape",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The regional manufacturing market is fragmented with no dominant player, creating a favorable acquisition environment where a strategic buyer can use Atlas as a consolidation platform.",
    },
    {
      id: "vf-im-03",
      name: "Barriers to Entry",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Capital equipment requirements and customer qualification timelines create meaningful new-entrant barriers that protect Atlas's existing customer relationships.",
    },
    {
      id: "vf-im-04",
      name: "Market Share Position",
      category: "industry_market",
      rating: "improvement",
      considerations:
        "Atlas holds a sub-2% regional share and is not recognized as a preferred vendor by procurement teams at target OEMs — a significant gap in the value narrative.",
    },
    {
      id: "vf-im-05",
      name: "Technology Disruption Risk",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "Automation and additive manufacturing are reshaping cost structures in the sector; Atlas has no technology roadmap addressing these trends, which buyers will view as a risk.",
    },
    {
      id: "vf-im-06",
      name: "Regulatory Environment",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "Buy-American provisions in federal contracts create potential demand upside, but Atlas has not pursued government certifications that would allow it to access these opportunities.",
    },
    {
      id: "vf-im-07",
      name: "Geographic Expansion Opportunity",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Atlas's precision capabilities are transferable to adjacent markets where the owner has identified unmet demand; a documented expansion thesis would strengthen the buyer narrative.",
    },

    // LEGAL & REGULATORY (8): 2 positive, 3 neutral, 3 improvement
    {
      id: "vf-lr-01",
      name: "Corporate Governance",
      category: "legal_regulatory",
      rating: "improvement",
      considerations:
        "Corporate records are disorganized — minutes are incomplete, the operating agreement is outdated, and no formal annual resolution process has been followed in recent years.",
    },
    {
      id: "vf-lr-02",
      name: "Litigation & Claims History",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "No pending or threatened litigation; the company has a clean legal history which is a genuine positive that should be prominently disclosed in the buyer process.",
    },
    {
      id: "vf-lr-03",
      name: "Employment Agreements",
      category: "legal_regulatory",
      rating: "improvement",
      considerations:
        "No non-compete or non-solicitation agreements exist for any employee; key production supervisors could freely depart to competitors during or after a transaction.",
    },
    {
      id: "vf-lr-04",
      name: "Licenses & Permits",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All core manufacturing licenses and environmental permits are current; this is a basic compliance positive that eliminates a common source of deal-closing conditions.",
    },
    {
      id: "vf-lr-05",
      name: "Data Privacy Compliance",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "Customer data is stored in the ERP system with no formal privacy policy or access controls; this is an emerging risk as buyers increasingly include data compliance in diligence.",
    },
    {
      id: "vf-lr-06",
      name: "Government Grant Obligations",
      category: "legal_regulatory",
      rating: "improvement",
      considerations:
        "The state manufacturing grant contains unreviewed change-of-control provisions; failure to resolve this before marketing could create a closing contingency or clawback liability.",
    },
    {
      id: "vf-lr-07",
      name: "Intellectual Property Assignments",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "No IP assignment agreements exist with employees or contractors; any proprietary tooling or process knowledge developed by staff is not formally assigned to the entity.",
    },
    {
      id: "vf-lr-08",
      name: "Environmental & Safety Compliance",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "OSHA records are maintained but the open citation has not been formally resolved; environmental records are incomplete and will require Phase I remediation before marketing.",
    },

    // FINANCIAL (12): 4 positive, 3 neutral, 5 improvement
    {
      id: "vf-fi-01",
      name: "EBITDA Quality & Sustainability",
      category: "financial",
      rating: "improvement",
      considerations:
        "Reported EBITDA includes owner perquisites, personal vehicle expenses, and family salaries that have never been formally identified or normalized into a quality of earnings format.",
    },
    {
      id: "vf-fi-02",
      name: "Revenue Trend",
      category: "financial",
      rating: "neutral",
      considerations:
        "Revenue has been essentially flat for three years; while not declining, the absence of organic growth will require a credible forward thesis to support any growth-premium in valuation.",
    },
    {
      id: "vf-fi-03",
      name: "Gross Margin Profile",
      category: "financial",
      rating: "neutral",
      considerations:
        "Gross margins of approximately 32% are below the sector median of 38%; inconsistent job costing makes it difficult to identify which product lines are driving the margin compression.",
    },
    {
      id: "vf-fi-04",
      name: "Cash Flow Conversion",
      category: "financial",
      rating: "positive",
      considerations:
        "Despite margin challenges, the business generates consistent operating cash flow; the owner has not drawn dividends in excess of salary, leaving cash in the business.",
    },
    {
      id: "vf-fi-05",
      name: "Balance Sheet Strength",
      category: "financial",
      rating: "positive",
      considerations:
        "The owned facility and unencumbered equipment provide meaningful tangible asset value that partially offsets the earnings-based valuation compression from low margins.",
    },
    {
      id: "vf-fi-06",
      name: "Financial Statement Quality",
      category: "financial",
      rating: "improvement",
      considerations:
        "Only tax-basis statements are available; preparation of three years of GAAP-basis reviewed financials is a prerequisite for any formal sale process and should begin immediately.",
    },
    {
      id: "vf-fi-07",
      name: "Tax Compliance & Structure",
      category: "financial",
      rating: "positive",
      considerations:
        "Tax returns are filed and current with no material open issues; however, the entity structure has not been evaluated for transaction optimization, which could affect net proceeds.",
    },
    {
      id: "vf-fi-08",
      name: "Capital Expenditure Requirements",
      category: "financial",
      rating: "neutral",
      considerations:
        "Several pieces of production equipment are approaching end of useful life; a buyer will likely require price adjustments or escrow for near-term capex obligations.",
    },
    {
      id: "vf-fi-09",
      name: "Owner Compensation Normalization",
      category: "financial",
      rating: "improvement",
      considerations:
        "Owner draws, personal expenses, and family member compensation have never been separated from arm's-length business costs; normalization is required before any EBITDA can be presented to buyers.",
    },
    {
      id: "vf-fi-10",
      name: "Debt & Leverage",
      category: "financial",
      rating: "positive",
      considerations:
        "The company carries modest equipment debt and a revolving line of credit; total net debt is manageable relative to asset value and will not complicate deal structure materially.",
    },
    {
      id: "vf-fi-11",
      name: "Revenue Recognition Policies",
      category: "financial",
      rating: "improvement",
      considerations:
        "Revenue is recognized on a cash basis with no formal accounting policy documentation; conversion to accrual GAAP basis is required for any institutional buyer to underwrite the business.",
    },
    {
      id: "vf-fi-12",
      name: "Projections & Financial Modeling",
      category: "financial",
      rating: "improvement",
      considerations:
        "No forward-looking financial model exists; the owner cannot articulate a credible three-year revenue and EBITDA projection, which is a minimum expectation for any professional buyer.",
    },

    // ECONOMIC & M&A (4): 2 positive, 3 neutral, 0 improvement — wait, need 19p 15n 20i total
    // Running count: personal 2p1n2i, bus_ops 6p5n7i, industry 3p3n1i, legal 2p3n3i, financial 4p3n5i
    // Subtotal: 17p 15n 18i. Need 2 more positive, 0 neutral, 2 more improvement from econ_ma (4 factors)
    // So econ_ma: 2p, 0n, 2i
    {
      id: "vf-em-01",
      name: "M&A Market Activity",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Manufacturing M&A activity remains strong, with strategic buyers and fundless sponsors actively seeking add-on opportunities — a favorable backdrop for a properly prepared business.",
    },
    {
      id: "vf-em-02",
      name: "Interest Rate Environment",
      category: "economic_ma",
      rating: "neutral",
      considerations:
        "Moderating interest rates are improving PE capacity generally, though Atlas's EBITDA level positions it primarily in the strategic and independent sponsor buyer segments regardless of rate environment.",
    },
    {
      id: "vf-em-03",
      name: "Valuation Multiples",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "Sector multiples for manufacturing businesses below $2M EBITDA with high customer concentration are compressing; the owner's valuation expectations must be calibrated to current market conditions.",
    },
    {
      id: "vf-em-04",
      name: "Buyer Pool Quality",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Strategic acquirers adding manufacturing capacity represent a viable buyer universe; identifying and cultivating two or three strategic targets should be a near-term advisory priority.",
    },
  ],
};

export const atlasAssessments: ClientAssessments = {
  clientId: "2",
  businessAttractiveness: atlasBusinessAttractiveness,
  businessReadiness: atlasBusinessReadiness,
  personalReadiness: atlasPersonalReadiness,
  valueFactors: atlasValueFactors,
};

// ═══════════════════════════════════════════════════════════════════════════
// PINNACLE SERVICES GROUP (id: "3")
// Mature, high scores: BA 88% (132/150), BR 85% (112/132), PR 82% (54/66)
// VF: 42 positive, 8 neutral, 4 improvement (78% positive)
// ═══════════════════════════════════════════════════════════════════════════

// Pinnacle BA: scores sum to 132/150 = 88%
// Distribution: 11 business (sum 58), 5 forecast (sum 26), 5 market (sum 26), 4 investor (sum 22)
const pinnacleBusinessAttractiveness: BusinessAttractivenessAssessment = {
  id: "ba-pinnacle-001",
  clientId: "3",
  completedDate: "2026-01-08",
  lastModified: "2026-01-08",
  factors: [
    // BUSINESS (11 factors) — sum = 58
    {
      id: "ba-b-01",
      name: "Years of Operation",
      category: "business",
      score: 6,
      considerations:
        "Pinnacle has operated for 24 years, establishing an institutional-grade track record that spans multiple economic cycles and demonstrates durable demand for its services.",
    },
    {
      id: "ba-b-02",
      name: "Management Strength",
      category: "business",
      score: 6,
      considerations:
        "A full C-suite with an experienced CEO, CFO, and COO operates the business largely independently; the leadership team has been stable for over five years.",
    },
    {
      id: "ba-b-03",
      name: "Customer Loyalty",
      category: "business",
      score: 5,
      considerations:
        "Net Promoter Score of 74 and an average customer relationship of 11.3 years represent elite retention metrics that directly underpin premium valuation multiples.",
    },
    {
      id: "ba-b-04",
      name: "Brand Recognition",
      category: "business",
      score: 6,
      considerations:
        "Pinnacle is the recognized market leader in its regional service category, with consistent industry awards, national media citations, and strong association presence.",
    },
    {
      id: "ba-b-05",
      name: "Customer Concentration",
      category: "business",
      score: 5,
      considerations:
        "Top three customers represent only 19% of total revenue, a highly diversified profile that significantly reduces transaction risk and eliminates a common valuation discount.",
    },
    {
      id: "ba-b-06",
      name: "Intellectual Property",
      category: "business",
      score: 5,
      considerations:
        "Pinnacle holds four registered trademarks, a proprietary service methodology protected by trade secret agreements, and two licensed software tools developed internally.",
    },
    {
      id: "ba-b-07",
      name: "Key Staff Longevity",
      category: "business",
      score: 5,
      considerations:
        "Average employee tenure is 8.7 years and seven members of the extended leadership team have been with the firm over a decade, providing deep operational continuity.",
    },
    {
      id: "ba-b-08",
      name: "Facilities",
      category: "business",
      score: 5,
      considerations:
        "Two modern office facilities — one owned, one leased with favorable terms through 2031 — accommodate current operations and provide capacity for 40% headcount growth.",
    },
    {
      id: "ba-b-09",
      name: "Owner Reliance",
      category: "business",
      score: 5,
      considerations:
        "The founder-owner has systematically reduced operational involvement over five years; the business demonstrably operates without the owner for extended periods.",
    },
    {
      id: "ba-b-10",
      name: "Replicable Business Model",
      category: "business",
      score: 5,
      considerations:
        "The service delivery model has been successfully replicated across four geographic markets with consistent quality and margin outcomes, validating scalability.",
    },
    {
      id: "ba-b-11",
      name: "Systems & Processes",
      category: "business",
      score: 5,
      considerations:
        "Integrated ERP, CRM, and project management platforms are fully implemented with documented SOPs covering over 95% of operational workflows and exception handling.",
    },

    // FORECAST (5 factors) — sum = 26
    {
      id: "ba-f-01",
      name: "Profitability",
      category: "forecast",
      score: 5,
      considerations:
        "Adjusted EBITDA margins of 28% are in the top quartile of the services peer group, providing the financial profile required for premium valuation multiples.",
    },
    {
      id: "ba-f-02",
      name: "Growth Forecast",
      category: "forecast",
      score: 5,
      considerations:
        "An independently validated five-year growth model projects 14–18% CAGR supported by existing client expansion commitments and a documented new-market pipeline.",
    },
    {
      id: "ba-f-03",
      name: "Revenue Growth",
      category: "forecast",
      score: 6,
      considerations:
        "Revenue has grown at a 21% CAGR over the trailing four years, driven by organic customer expansion, geographic entry, and two bolt-on acquisitions fully integrated.",
    },
    {
      id: "ba-f-04",
      name: "Budget Certainty",
      category: "forecast",
      score: 5,
      considerations:
        "Annual budgets are prepared with granular assumptions, board-reviewed quarterly, and have been within 5% of forecast in each of the past four years.",
    },
    {
      id: "ba-f-05",
      name: "Recurring Revenue",
      category: "forecast",
      score: 5,
      considerations:
        "Approximately 78% of total revenue is subscription or retainer-based with multi-year agreements and automatic renewal clauses, providing exceptional predictability.",
    },

    // MARKET (5 factors) — sum = 26
    {
      id: "ba-m-01",
      name: "Market Growth",
      category: "market",
      score: 5,
      considerations:
        "The professional services market Pinnacle operates in is growing at 13% annually, driven by regulatory complexity and outsourcing trends among mid-market companies.",
    },
    {
      id: "ba-m-02",
      name: "Barriers to Entry",
      category: "market",
      score: 5,
      considerations:
        "Accreditation requirements, long client onboarding cycles, and deep relationship capital create substantial moats; new entrants typically require three to five years to become competitive.",
    },
    {
      id: "ba-m-03",
      name: "Competitive Advantage",
      category: "market",
      score: 6,
      considerations:
        "A proprietary service platform, exclusive data partnerships, and a 22-year customer relationship network create compounding advantages that are genuinely difficult for competitors to replicate.",
    },
    {
      id: "ba-m-04",
      name: "Market Position",
      category: "market",
      score: 5,
      considerations:
        "Pinnacle holds the second-largest regional market share at approximately 24%, with a clear pathway to first position through continued organic growth and one identified acquisition target.",
    },
    {
      id: "ba-m-05",
      name: "Economic Prosperity",
      category: "market",
      score: 5,
      considerations:
        "Pinnacle's services are compliance-driven, meaning demand persists through economic cycles; revenue declined only 2.1% during the most recent downturn while peers contracted 11–15%.",
    },

    // INVESTOR (4 factors) — sum = 22
    {
      id: "ba-i-01",
      name: "Reason for Selling",
      category: "investor",
      score: 5,
      considerations:
        "The owner has articulated a thoughtful succession rationale — legacy preservation, employee ownership participation, and philanthropic goals — that resonates strongly with aligned buyers.",
    },
    {
      id: "ba-i-02",
      name: "Synergy Potential",
      category: "investor",
      score: 6,
      considerations:
        "Pinnacle's geographic footprint, proprietary platform, and customer relationships are highly complementary to five identified strategic acquirers with strong synergy frameworks.",
    },
    {
      id: "ba-i-03",
      name: "Risk Assessment",
      category: "investor",
      score: 5,
      considerations:
        "The risk profile is low by any standard; all primary risks are quantified, carry active mitigation plans, and have been independently reviewed in a pre-transaction risk assessment.",
    },
    {
      id: "ba-i-04",
      name: "Market for Sale",
      category: "investor",
      score: 6,
      considerations:
        "M&A multiples in Pinnacle's sector are at a five-year high, averaging 9.2x trailing EBITDA; the company is positioned to command a premium within this already favorable range.",
    },
  ],
};

// Pinnacle BR: scores sum to 112/132 = 85%
// brand_market 3 (sum 16), operations 5 (sum 26), financial 5 (sum 25),
// legal_compliance 3 (sum 15), personal_planning 2 (sum 10), strategy 4 (sum 20)
const pinnacleBusinessReadiness: BusinessReadinessAssessment = {
  id: "br-pinnacle-001",
  clientId: "3",
  completedDate: "2026-01-12",
  lastModified: "2026-01-12",
  factors: [
    // BRAND & MARKET (3) — sum = 16
    {
      id: "br-bm-01",
      name: "Brand Equity",
      category: "brand_market",
      score: 6,
      considerations:
        "Pinnacle's brand is a quantifiable asset that commands a price premium in its market; independent research confirms that the brand is the primary selection criterion for 42% of new clients.",
    },
    {
      id: "br-bm-02",
      name: "Market Credibility",
      category: "brand_market",
      score: 5,
      considerations:
        "Eleven consecutive years of industry recognition, regular thought leadership in trade publications, and board-level representation in key industry associations underpin strong market authority.",
    },
    {
      id: "br-bm-03",
      name: "Marketing Infrastructure",
      category: "brand_market",
      score: 5,
      considerations:
        "A fully staffed marketing function with a documented demand generation program, CRM-integrated lead tracking, and annual brand investment generates measurable pipeline contributions.",
    },

    // OPERATIONS (5) — sum = 26
    {
      id: "br-op-01",
      name: "Process Documentation",
      category: "operations",
      score: 5,
      considerations:
        "SOPs are maintained for all critical workflows in a version-controlled knowledge management system; new employees can become fully productive within 30 days using documented procedures alone.",
    },
    {
      id: "br-op-02",
      name: "Employee & Management Structure",
      category: "operations",
      score: 6,
      considerations:
        "A formal organizational structure with defined accountability, documented role descriptions, and an annual performance review process operates entirely independently of the owner.",
    },
    {
      id: "br-op-03",
      name: "Expense Contracts",
      category: "operations",
      score: 5,
      considerations:
        "All material vendor agreements have been reviewed by transaction counsel; no change-of-control clauses were identified that would trigger renegotiation or penalty upon sale.",
    },
    {
      id: "br-op-04",
      name: "Systems & Technology",
      category: "operations",
      score: 5,
      considerations:
        "Best-in-class SaaS platforms are fully integrated, scalable, and will not require replacement post-acquisition; technology due diligence is expected to be straightforward.",
    },
    {
      id: "br-op-05",
      name: "Management Systems",
      category: "operations",
      score: 5,
      considerations:
        "Weekly operational dashboards, monthly management accounts, and quarterly board reporting provide a level of operating transparency that exceeds buyer expectations.",
    },

    // FINANCIAL (5) — sum = 25
    {
      id: "br-fi-01",
      name: "Expense Management",
      category: "financial",
      score: 5,
      considerations:
        "Operating expenses are benchmarked quarterly against industry peers; owner-related add-backs are minimal, clearly identified, and already normalized in management accounts.",
    },
    {
      id: "br-fi-02",
      name: "Financial Statements",
      category: "financial",
      score: 5,
      considerations:
        "Five years of audited financial statements are available; a quality of earnings report prepared by a Big Four firm is complete and ready for buyer distribution.",
    },
    {
      id: "br-fi-03",
      name: "Revenue Drivers",
      category: "financial",
      score: 5,
      considerations:
        "Revenue is decomposed into cohort-level retention, expansion, and new-logo analysis with a buyer-ready revenue bridge that demonstrates the quality and durability of growth.",
    },
    {
      id: "br-fi-04",
      name: "Payment & Working Capital",
      category: "financial",
      score: 5,
      considerations:
        "DSO of 22 days is industry-leading; the normalized net working capital peg has been calculated and confirmed by the QoE team, eliminating a common source of post-signing disputes.",
    },
    {
      id: "br-fi-05",
      name: "Valuation Expectations",
      category: "financial",
      score: 5,
      considerations:
        "Owner's valuation expectation of 8.5–9.5x adjusted EBITDA is well-supported by recent comparable transactions and has been stress-tested across multiple deal structure scenarios.",
    },

    // LEGAL & COMPLIANCE (3) — sum = 15
    {
      id: "br-lc-01",
      name: "Regulatory Compliance",
      category: "legal_compliance",
      score: 5,
      considerations:
        "A comprehensive compliance program with annual external audit and no findings over the past three years demonstrates institutional-grade regulatory management.",
    },
    {
      id: "br-lc-02",
      name: "Intellectual Property Protection",
      category: "legal_compliance",
      score: 5,
      considerations:
        "All IP is formally assigned to the operating entity, protected by a combination of registered marks, trade secret agreements, and work-product clauses in all employment contracts.",
    },
    {
      id: "br-lc-03",
      name: "Government Grants & Incentives",
      category: "legal_compliance",
      score: 5,
      considerations:
        "Two active government grants have been fully reviewed by transaction counsel; no change-of-control restrictions apply and the grants are transferable to an acquirer.",
    },

    // PERSONAL PLANNING (2) — sum = 10
    {
      id: "br-pp-01",
      name: "Personal Financial Expectations",
      category: "personal_planning",
      score: 5,
      considerations:
        "A comprehensive personal financial plan prepared by a CFP with expertise in business liquidity events models multiple transaction scenarios and confirms financial independence at target prices.",
    },
    {
      id: "br-pp-02",
      name: "Exit Process Knowledge",
      category: "personal_planning",
      score: 5,
      considerations:
        "The owner has participated in two prior sell-side transactions as an advisor and fully understands due diligence, reps and warranties, earnout mechanics, and post-closing obligations.",
    },

    // STRATEGY (4) — sum = 20
    {
      id: "br-st-01",
      name: "Customer Contracts",
      category: "strategy",
      score: 5,
      considerations:
        "Over 90% of customer revenue is under current multi-year agreements with automatic renewal provisions; the remaining relationships are in active formalization with counsel oversight.",
    },
    {
      id: "br-st-02",
      name: "Immediate Value Readiness",
      category: "strategy",
      score: 5,
      considerations:
        "All pre-sale value-creation initiatives have been completed; the company is actively ready for a formal sale process and could commence marketing within 30 days.",
    },
    {
      id: "br-st-03",
      name: "Product & Service Strategy",
      category: "strategy",
      score: 5,
      considerations:
        "A validated five-year service roadmap with documented R&D investments and customer co-development commitments provides buyers with a compelling post-acquisition growth narrative.",
    },
    {
      id: "br-st-04",
      name: "Shareholder Goals Alignment",
      category: "strategy",
      score: 5,
      considerations:
        "All three shareholders have documented and aligned preferences on exit timeline, deal structure, employee considerations, and post-close involvement, eliminating a common late-stage risk.",
    },
  ],
};

// Pinnacle PR: scores sum to 54/66 = 82%
const pinnaclePersonalReadiness: PersonalReadinessAssessment = {
  id: "pr-pinnacle-001",
  clientId: "3",
  completedDate: "2026-01-14",
  lastModified: "2026-01-14",
  factors: [
    {
      id: "pr-01",
      name: "Written Personal Plan",
      score: 5,
      considerations:
        "A documented personal life plan with post-exit goals, philanthropic commitments, and a structured time framework has been prepared and reviewed with a personal advisor.",
    },
    {
      id: "pr-02",
      name: "Personal Financial Plan",
      score: 5,
      considerations:
        "A comprehensive financial plan with retirement income modeling, investment policy, and stress-tested liquidity scenarios has been prepared and is updated annually.",
    },
    {
      id: "pr-03",
      name: "Estate & Tax Plan",
      score: 5,
      considerations:
        "Estate documents are current, have been updated in the past 12 months to reflect anticipated transaction proceeds, and include a charitable trust structure aligned with the owner's philanthropic goals.",
    },
    {
      id: "pr-04",
      name: "Knowledge of Net Proceeds",
      score: 5,
      considerations:
        "The owner has completed a detailed deal economics analysis across five transaction structures and clearly understands after-tax net proceeds under each scenario.",
    },
    {
      id: "pr-05",
      name: "Post-Exit Income Needs",
      score: 5,
      considerations:
        "Income requirements have been quantified and confirmed to be fully fundable from anticipated proceeds alone at a conservative 3.5% distribution rate; the owner has genuine financial independence.",
    },
    {
      id: "pr-06",
      name: "Business Dependency Assessment",
      score: 5,
      considerations:
        "The owner has completed a formal business dependency assessment with an executive coach; a meaningful post-exit identity has been developed around board service and philanthropic leadership.",
    },
    {
      id: "pr-07",
      name: "Transition & Integration Knowledge",
      score: 5,
      considerations:
        "The owner has studied buyer integration expectations in depth and has drafted a 24-month transition plan with defined knowledge transfer milestones and role handoffs.",
    },
    {
      id: "pr-08",
      name: "Advisory Team Completeness",
      score: 4,
      considerations:
        "Exit planner, M&A attorney, tax advisor, and wealth manager are all engaged; the team meets quarterly and coordinates on transaction planning, though a personal coach has not yet been formalized.",
    },
    {
      id: "pr-09",
      name: "Contingency Plans",
      score: 5,
      considerations:
        "Written contingency plans address all major forced-exit scenarios; insurance mechanisms, successor designations, and board continuity protocols are fully documented.",
    },
    {
      id: "pr-10",
      name: "Deal Structure Knowledge",
      score: 5,
      considerations:
        "The owner is conversant in all material deal structure mechanics — earnouts, equity rollover, seller notes, stock vs. asset elections — and has modeled after-tax outcomes for each.",
    },
    {
      id: "pr-11",
      name: "Family & Stakeholder Awareness",
      score: 5,
      considerations:
        "All family members and co-shareholders have been fully briefed through facilitated planning sessions; expectations are aligned and documented in a family governance charter.",
    },
  ],
};

// Pinnacle VF: 42 positive, 8 neutral, 4 improvement (78% positive)
const pinnacleValueFactors: ValueFactorsAssessment = {
  id: "vf-pinnacle-001",
  clientId: "3",
  completedDate: "2026-01-16",
  lastModified: "2026-01-16",
  factors: [
    // PERSONAL (5): 4 positive, 1 neutral, 0 improvement
    {
      id: "vf-pe-01",
      name: "Owner Health & Vitality",
      category: "personal",
      rating: "positive",
      considerations:
        "Owner is in excellent health with no anticipated medical concerns that would affect the exit timeline or the owner's capacity to perform post-closing transition obligations.",
    },
    {
      id: "vf-pe-02",
      name: "Motivation to Sell",
      category: "personal",
      rating: "positive",
      considerations:
        "Motivation is clearly defined, emotionally resolved, and focused on legacy, philanthropy, and new ventures — a profile buyers find compelling and credible.",
    },
    {
      id: "vf-pe-03",
      name: "Lifestyle & Post-Exit Vision",
      category: "personal",
      rating: "positive",
      considerations:
        "A richly articulated post-exit vision — including board roles, a family foundation, and an advisory practice — demonstrates psychological readiness for the ownership transition.",
    },
    {
      id: "vf-pe-04",
      name: "Family Alignment",
      category: "personal",
      rating: "positive",
      considerations:
        "All family stakeholders are fully aligned on exit timing, deal structure preferences, and post-sale employment intentions following multiple facilitated family governance sessions.",
    },
    {
      id: "vf-pe-05",
      name: "Personal Debt & Obligations",
      category: "personal",
      rating: "neutral",
      considerations:
        "A mortgage on a personal real estate holding secured by a company guarantee will require unwinding at closing; the mechanics are understood and do not materially affect deal structure.",
    },

    // BUSINESS OPERATIONS (18): 15 positive, 2 neutral, 1 improvement
    {
      id: "vf-bo-01",
      name: "Revenue Diversification",
      category: "business_operations",
      rating: "positive",
      considerations:
        "No single customer exceeds 8% of revenue and the top ten clients collectively represent only 41%; this is among the best diversification profiles in the sector.",
    },
    {
      id: "vf-bo-02",
      name: "Recurring Revenue Quality",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Recurring revenue is supported by multi-year agreements with evergreen renewal clauses and annual escalators, creating one of the most defensible revenue bases in the peer group.",
    },
    {
      id: "vf-bo-03",
      name: "Customer Retention Rate",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Gross retention of 96% and net revenue retention of 118% — reflecting expansion within the existing client base — place Pinnacle in the top decile of services businesses.",
    },
    {
      id: "vf-bo-04",
      name: "Employee Retention & Culture",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Voluntary turnover of 4% is less than one-third of the industry average; consistently high eNPS scores and a documented culture program will survive the ownership transition.",
    },
    {
      id: "vf-bo-05",
      name: "Management Team Depth",
      category: "business_operations",
      rating: "positive",
      considerations:
        "A full C-suite with long tenures, equity participation, and documented succession plans provides buyers with the post-closing management team they require to underwrite the deal.",
    },
    {
      id: "vf-bo-06",
      name: "Operational Scalability",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The service delivery model and supporting technology can absorb 60% revenue growth without proportional headcount increases, making the synergy thesis highly credible to buyers.",
    },
    {
      id: "vf-bo-07",
      name: "Technology & Systems",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Best-in-class, fully integrated technology stack with no near-term replacement requirements; the platform is a differentiating asset that competitors are actively trying to replicate.",
    },
    {
      id: "vf-bo-08",
      name: "Supplier Relationships",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Key supplier and partner agreements are transferable, carry preferred pricing terms, and have been confirmed to survive a change of control by transaction counsel.",
    },
    {
      id: "vf-bo-09",
      name: "Owner Dependency (Operations)",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The owner has successfully transitioned all material operational responsibilities to the management team; the business has demonstrably run without the owner for 60-day periods.",
    },
    {
      id: "vf-bo-10",
      name: "Brand & Reputation",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The Pinnacle brand is a quantifiable asset with premium pricing power, top-quartile online reputation scores, and active protection through four registered trademarks.",
    },
    {
      id: "vf-bo-11",
      name: "Process Standardization",
      category: "business_operations",
      rating: "positive",
      considerations:
        "SOPs cover over 95% of operational workflows and are maintained in a version-controlled system; new employees achieve full productivity through documentation alone.",
    },
    {
      id: "vf-bo-12",
      name: "Inventory & Working Capital",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Working capital requirements are minimal for a services business; the normalized NWC peg has been independently calculated and confirmed with no ambiguity.",
    },
    {
      id: "vf-bo-13",
      name: "Facilities & Real Estate",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The owned facility is appraised at $3.2M with a sale-leaseback option structured and ready; the leased location has favorable terms through 2031 with no change-of-control provisions.",
    },
    {
      id: "vf-bo-14",
      name: "Insurance Coverage",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Insurance portfolio was reviewed by a specialist broker in Q4 2025; all coverage is current, adequately sized for revenue levels, and confirmed transferable to a new owner.",
    },
    {
      id: "vf-bo-15",
      name: "Cybersecurity & Data Privacy",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "A SOC 2 Type I report has been completed; the Type II audit is in progress and expected to complete before the formal sale process begins, which will satisfy most institutional buyers.",
    },
    {
      id: "vf-bo-16",
      name: "Environmental Compliance",
      category: "business_operations",
      rating: "positive",
      considerations:
        "As a professional services business, environmental liabilities are minimal; all applicable compliance obligations are current and documented.",
    },
    {
      id: "vf-bo-17",
      name: "Quality Control Systems",
      category: "business_operations",
      rating: "positive",
      considerations:
        "A formal quality management system with documented review cycles, client satisfaction tracking, and corrective action processes is embedded in the service delivery culture.",
    },
    {
      id: "vf-bo-18",
      name: "Customer Contract Formalization",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Over 90% of revenue is under written agreements; the remaining relationships are with long-tenured clients in active formalization — a minor gap in an otherwise strong contract position.",
    },

    // INDUSTRY & MARKET (7): 6 positive, 1 neutral, 0 improvement
    {
      id: "vf-im-01",
      name: "Industry Growth Rate",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The professional services sector is growing at 13% annually with no signs of deceleration; regulatory drivers and outsourcing trends create a durable demand environment.",
    },
    {
      id: "vf-im-02",
      name: "Competitive Landscape",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The market remains fragmented with no dominant national player; Pinnacle's scale and brand are significant advantages in a competitive set largely composed of smaller regional firms.",
    },
    {
      id: "vf-im-03",
      name: "Barriers to Entry",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Accreditation, relationship capital, and platform investment create high barriers; the time and cost required for a new entrant to reach Pinnacle's competitive position is estimated at 7–10 years.",
    },
    {
      id: "vf-im-04",
      name: "Market Share Position",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Pinnacle's second-place regional position at 24% share, combined with documented plans to reach first place, gives buyers a clear and executable growth narrative.",
    },
    {
      id: "vf-im-05",
      name: "Technology Disruption Risk",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "AI tools are entering the sector; Pinnacle has an active technology adaptation program and has already integrated AI-assisted tools into its platform, demonstrating proactive positioning.",
    },
    {
      id: "vf-im-06",
      name: "Regulatory Environment",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Increasing regulatory complexity in Pinnacle's service category is a structural tailwind; clients are compelled to use specialist services rather than build internal capability.",
    },
    {
      id: "vf-im-07",
      name: "Geographic Expansion Opportunity",
      category: "industry_market",
      rating: "positive",
      considerations:
        "A documented two-market expansion plan with confirmed client commitments and a hired regional director is already in execution, providing buyers with a de-risked growth platform.",
    },

    // LEGAL & REGULATORY (8): 7 positive, 1 neutral, 0 improvement
    {
      id: "vf-lr-01",
      name: "Corporate Governance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "Board minutes, shareholder resolutions, and corporate records are organized, current, and maintained in a virtual data room ready for immediate due diligence access.",
    },
    {
      id: "vf-lr-02",
      name: "Litigation & Claims History",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "A clean eight-year litigation history with no pending, threatened, or settled claims provides a straightforward legal representations and warranties profile.",
    },
    {
      id: "vf-lr-03",
      name: "Employment Agreements",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All employees above manager level have current non-compete, non-solicitation, and IP assignment agreements reviewed by employment counsel and confirmed enforceable.",
    },
    {
      id: "vf-lr-04",
      name: "Licenses & Permits",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All professional accreditations and business licenses are current, transferable, and have been confirmed to survive a change of control by regulatory counsel.",
    },
    {
      id: "vf-lr-05",
      name: "Data Privacy Compliance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "A formal privacy compliance program with external counsel review, employee training, and incident response protocols meets the standards required by institutional buyers.",
    },
    {
      id: "vf-lr-06",
      name: "Government Grant Obligations",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All government grants have been fully reviewed for change-of-control provisions; no restrictions apply and both grants are transferable without government consent.",
    },
    {
      id: "vf-lr-07",
      name: "Intellectual Property Assignments",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All IP developed by employees and contractors is formally assigned to the entity through work-product agreements reviewed by IP counsel in the past 18 months.",
    },
    {
      id: "vf-lr-08",
      name: "Environmental & Safety Compliance",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "As a services business, environmental exposure is minimal; workplace safety records are maintained but have not yet been compiled into a buyer-ready due diligence format.",
    },

    // FINANCIAL (12): 9 positive, 3 neutral, 0 improvement
    {
      id: "vf-fi-01",
      name: "EBITDA Quality & Sustainability",
      category: "financial",
      rating: "positive",
      considerations:
        "Adjusted EBITDA of $4.8M is supported by a Big Four quality of earnings report with no material adjustments; the margin profile is confirmed sustainable by independent analysis.",
    },
    {
      id: "vf-fi-02",
      name: "Revenue Trend",
      category: "financial",
      rating: "positive",
      considerations:
        "A 21% four-year revenue CAGR with accelerating momentum in the most recent year supports a growth-company framing that commands the highest valuation multiples in the sector.",
    },
    {
      id: "vf-fi-03",
      name: "Gross Margin Profile",
      category: "financial",
      rating: "positive",
      considerations:
        "Gross margins of 67% are in the top decile of the services peer group and demonstrate pricing power, operational leverage, and a scalable delivery model.",
    },
    {
      id: "vf-fi-04",
      name: "Cash Flow Conversion",
      category: "financial",
      rating: "positive",
      considerations:
        "Free cash flow conversion exceeds 90% of EBITDA, reflecting capital-light operations and disciplined working capital management — a hallmark of high-quality services businesses.",
    },
    {
      id: "vf-fi-05",
      name: "Balance Sheet Strength",
      category: "financial",
      rating: "positive",
      considerations:
        "Current ratio of 2.8 and zero long-term debt create a pristine balance sheet that simplifies deal structure and provides optionality for a variety of transaction formats.",
    },
    {
      id: "vf-fi-06",
      name: "Financial Statement Quality",
      category: "financial",
      rating: "positive",
      considerations:
        "Five years of audited financial statements with an unqualified opinion from a regional Big Four affiliate provide buyers with the highest-confidence financial data available.",
    },
    {
      id: "vf-fi-07",
      name: "Tax Compliance & Structure",
      category: "financial",
      rating: "positive",
      considerations:
        "Tax returns are current with no open examinations; a restructuring executed in 2024 optimized the entity for a transaction and has been confirmed by external tax counsel.",
    },
    {
      id: "vf-fi-08",
      name: "Capital Expenditure Requirements",
      category: "financial",
      rating: "positive",
      considerations:
        "Maintenance capex is minimal at 1.4% of revenue; no significant capital expenditure is required in the next 36 months, preserving buyer cash flow and simplifying deal modeling.",
    },
    {
      id: "vf-fi-09",
      name: "Owner Compensation Normalization",
      category: "financial",
      rating: "positive",
      considerations:
        "Owner compensation is at market rate with minimal perquisites; the normalization analysis in the QoE report is straightforward and unlikely to generate buyer pushback.",
    },
    {
      id: "vf-fi-10",
      name: "Debt & Leverage",
      category: "financial",
      rating: "neutral",
      considerations:
        "The company carries no funded debt; while this is expected for a mature services business, buyers will want to confirm the NWC peg is appropriately calibrated before finalizing deal mechanics.",
    },
    {
      id: "vf-fi-11",
      name: "Revenue Recognition Policies",
      category: "financial",
      rating: "neutral",
      considerations:
        "Revenue is recognized on an accrual basis consistent with GAAP; a minor policy clarification on multi-year contract recognition is being addressed in the current audit cycle.",
    },
    {
      id: "vf-fi-12",
      name: "Projections & Financial Modeling",
      category: "financial",
      rating: "improvement",
      considerations:
        "A three-year projection model exists and has been validated by management; however, the model requires final advisor formatting and assumption documentation before it can be distributed to buyers.",
    },

    // ECONOMIC & M&A (4): 1 positive, 0 neutral, 3 improvement — wait, let me recount
    // personal: 4p 1n 0i = 4p
    // bus_ops: 15p 2n 1i = 15p
    // industry: 6p 1n 0i = 6p
    // legal: 7p 1n 0i = 7p
    // financial: 9p 2n 0i (wait: 9 + 2 = 11, but I counted 12 factors)
    // Let me recount financial: fi-01 p, fi-02 p, fi-03 p, fi-04 p, fi-05 p, fi-06 p, fi-07 p, fi-08 p, fi-09 p, fi-10 p, fi-11 n, fi-12 n = 10p 2n 0i
    // Running total: 4+15+6+7+10 = 42p, 1+2+1+1+2 = 7n, 0+1+0+0+0 = 1i
    // Need 42p 8n 4i total. econ_ma (4 factors) must be: 0p 1n 3i
    {
      id: "vf-em-01",
      name: "M&A Market Activity",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "While M&A activity is elevated broadly, Pinnacle's sector has seen some buyer consolidation; engaging a banker early to develop competitive tension in the process is recommended.",
    },
    {
      id: "vf-em-02",
      name: "Interest Rate Environment",
      category: "economic_ma",
      rating: "neutral",
      considerations:
        "Financing costs have moderated from 2023–2024 peaks and PE capacity is returning; however, sponsor-backed buyers will still pressure Pinnacle's premium valuation expectations.",
    },
    {
      id: "vf-em-03",
      name: "Valuation Multiples",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "Sector multiples, while healthy at 8.5–9.5x, have compressed from the 2021 peak of 11–12x; the owner should internalize current market levels before entering formal price discussions.",
    },
    {
      id: "vf-em-04",
      name: "Buyer Pool Quality",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "The subset of buyers who can pay premium multiples and provide cultural alignment is narrower than the total buyer universe; proactive buyer cultivation is required to run a competitive process.",
    },
  ],
};

export const pinnacleAssessments: ClientAssessments = {
  clientId: "3",
  businessAttractiveness: pinnacleBusinessAttractiveness,
  businessReadiness: pinnacleBusinessReadiness,
  personalReadiness: pinnaclePersonalReadiness,
  valueFactors: pinnacleValueFactors,
};

// ═══════════════════════════════════════════════════════════════════════════
// VANGUARD TECH SOLUTIONS (id: "4")
// Mid-stage: BA 63% (95/150), BR 58% (77/132), PR 55% (36/66)
// VF: 27 positive, 14 neutral, 13 improvement (50% positive)
// ═══════════════════════════════════════════════════════════════════════════

// Vanguard BA: scores sum to 95/150 = 63%
// Distribution: 11 business (sum 40), 5 forecast (sum 20), 5 market (sum 22), 4 investor (sum 13)
const vanguardBusinessAttractiveness: BusinessAttractivenessAssessment = {
  id: "ba-vanguard-001",
  clientId: "4",
  completedDate: "2026-03-05",
  lastModified: "2026-03-05",
  factors: [
    // BUSINESS (11 factors) — sum = 40
    {
      id: "ba-b-01",
      name: "Years of Operation",
      category: "business",
      score: 4,
      considerations:
        "Vanguard has operated for 11 years with consistent revenue generation, providing enough operating history to demonstrate model viability without the full institutional track record of a mature company.",
    },
    {
      id: "ba-b-02",
      name: "Management Strength",
      category: "business",
      score: 3,
      considerations:
        "A capable CTO and VP of Sales are in place, but the CFO role is held by a part-time controller and a full COO has not yet been hired, leaving gaps in operational leadership depth.",
    },
    {
      id: "ba-b-03",
      name: "Customer Loyalty",
      category: "business",
      score: 4,
      considerations:
        "Annual net revenue retention of 107% indicates customers expand usage over time, but gross retention of 84% suggests some churn that should be analyzed by customer segment.",
    },
    {
      id: "ba-b-04",
      name: "Brand Recognition",
      category: "business",
      score: 3,
      considerations:
        "Vanguard has growing brand recognition within its target vertical but is largely unknown outside it; brand investment has been inconsistent and no formal brand strategy is documented.",
    },
    {
      id: "ba-b-05",
      name: "Customer Concentration",
      category: "business",
      score: 3,
      considerations:
        "Top three customers represent 44% of ARR; concentration is meaningful but not existential, and a documented customer diversification plan is in the early stages of execution.",
    },
    {
      id: "ba-b-06",
      name: "Intellectual Property",
      category: "business",
      score: 5,
      considerations:
        "Vanguard's proprietary software platform and two pending patents represent genuine IP assets; all code is assigned to the entity and IP counsel has confirmed clean ownership.",
    },
    {
      id: "ba-b-07",
      name: "Key Staff Longevity",
      category: "business",
      score: 3,
      considerations:
        "Engineering team tenure averages 4.2 years, which is respectable for a tech company, but the management layer has seen meaningful turnover and no retention equity program is in place.",
    },
    {
      id: "ba-b-08",
      name: "Facilities",
      category: "business",
      score: 3,
      considerations:
        "Vanguard operates from a leased office with terms through 2027; the lease has no change-of-control provision, though the short remaining term will require renewal planning pre-transaction.",
    },
    {
      id: "ba-b-09",
      name: "Owner Reliance",
      category: "business",
      score: 3,
      considerations:
        "The founder-CEO remains the primary face to key accounts and is involved in major product decisions; a 12-month plan to transfer relationship ownership to the sales team is underway.",
    },
    {
      id: "ba-b-10",
      name: "Replicable Business Model",
      category: "business",
      score: 5,
      considerations:
        "The SaaS model is inherently replicable and has been validated across three customer verticals with consistent unit economics, providing buyers with a clear scaling framework.",
    },
    {
      id: "ba-b-11",
      name: "Systems & Processes",
      category: "business",
      score: 4,
      considerations:
        "CRM, billing, and product analytics platforms are in place and well-utilized; operational reporting is improving though gaps remain in financial process documentation.",
    },

    // FORECAST (5 factors) — sum = 20
    {
      id: "ba-f-01",
      name: "Profitability",
      category: "forecast",
      score: 4,
      considerations:
        "EBITDA margins of 14% reflect a business investing in growth; unit economics are healthy with an LTV:CAC ratio above 4:1, indicating the growth model is profitable at scale.",
    },
    {
      id: "ba-f-02",
      name: "Growth Forecast",
      category: "forecast",
      score: 4,
      considerations:
        "A documented growth model projects 25% ARR growth over the next two years, supported by a funded product roadmap and a sales capacity build already in progress.",
    },
    {
      id: "ba-f-03",
      name: "Revenue Growth",
      category: "forecast",
      score: 4,
      considerations:
        "ARR growth of 22% in the trailing year demonstrates meaningful traction, though growth has been uneven across quarters, creating some predictability risk in the forward model.",
    },
    {
      id: "ba-f-04",
      name: "Budget Certainty",
      category: "forecast",
      score: 4,
      considerations:
        "Annual operating budgets are prepared with documented assumptions and reviewed monthly; forecast accuracy has improved to within 12% variance in the past two years.",
    },
    {
      id: "ba-f-05",
      name: "Recurring Revenue",
      category: "forecast",
      score: 4,
      considerations:
        "Approximately 88% of revenue is subscription-based with annual contracts; a shift to multi-year agreements is underway and would further improve revenue predictability.",
    },

    // MARKET (5 factors) — sum = 22
    {
      id: "ba-m-01",
      name: "Market Growth",
      category: "market",
      score: 5,
      considerations:
        "The vertical SaaS market Vanguard serves is growing at 18% annually, driven by digital transformation spend and regulatory mandates that create durable demand for the product category.",
    },
    {
      id: "ba-m-02",
      name: "Barriers to Entry",
      category: "market",
      score: 4,
      considerations:
        "Switching costs embedded in customer workflows, proprietary data models, and integration depth create meaningful stickiness once customers are onboarded.",
    },
    {
      id: "ba-m-03",
      name: "Competitive Advantage",
      category: "market",
      score: 4,
      considerations:
        "Vanguard's proprietary data layer and workflow automation differentiate the product from horizontal competitors; however, a well-funded vertical SaaS entrant could challenge this in 24–36 months.",
    },
    {
      id: "ba-m-04",
      name: "Market Position",
      category: "market",
      score: 4,
      considerations:
        "Vanguard holds a top-five position in its primary vertical with approximately 8% market share; analyst coverage has cited the company as an emerging leader in two recent reports.",
    },
    {
      id: "ba-m-05",
      name: "Economic Prosperity",
      category: "market",
      score: 5,
      considerations:
        "The regulatory drivers underpinning Vanguard's product category are counter-cyclical; demand increases during economic downturns as companies seek compliance automation to reduce headcount.",
    },

    // INVESTOR (4 factors) — sum = 13
    {
      id: "ba-i-01",
      name: "Reason for Selling",
      category: "investor",
      score: 3,
      considerations:
        "The founder's motivation — capital to accelerate growth and reduce personal concentration risk — is commercially credible but may prompt buyer questions about why external growth capital was not pursued.",
    },
    {
      id: "ba-i-02",
      name: "Synergy Potential",
      category: "investor",
      score: 4,
      considerations:
        "Vanguard's product and customer base are synergistic with several identified strategic acquirers in adjacent verticals; a platform acquisition narrative is credible and well-supported.",
    },
    {
      id: "ba-i-03",
      name: "Risk Assessment",
      category: "investor",
      score: 3,
      considerations:
        "Founder dependency and customer concentration are the primary risk factors; both are acknowledged and have active mitigation plans, though execution is not yet complete.",
    },
    {
      id: "ba-i-04",
      name: "Market for Sale",
      category: "investor",
      score: 3,
      considerations:
        "Vertical SaaS M&A is competitive but buyer expectations on growth rates and margin profiles are high; Vanguard's current metrics support a mid-range multiple in the current market.",
    },
  ],
};

// Vanguard BR: scores sum to 77/132 = 58%
// brand_market 3 (sum 10), operations 5 (sum 19), financial 5 (sum 17),
// legal_compliance 3 (sum 11), personal_planning 2 (sum 7), strategy 4 (sum 13)
const vanguardBusinessReadiness: BusinessReadinessAssessment = {
  id: "br-vanguard-001",
  clientId: "4",
  completedDate: "2026-03-08",
  lastModified: "2026-03-08",
  factors: [
    // BRAND & MARKET (3) — sum = 10
    {
      id: "br-bm-01",
      name: "Brand Equity",
      category: "brand_market",
      score: 3,
      considerations:
        "Vanguard's brand is recognized within its primary vertical but has not been independently valued or positioned as a strategic asset in the sale narrative.",
    },
    {
      id: "br-bm-02",
      name: "Market Credibility",
      category: "brand_market",
      score: 4,
      considerations:
        "Two analyst citations, active conference speaking, and a growing user community provide meaningful market credibility that will hold up in buyer diligence conversations.",
    },
    {
      id: "br-bm-03",
      name: "Marketing Infrastructure",
      category: "brand_market",
      score: 3,
      considerations:
        "A demand generation program exists with CRM integration, but marketing attribution is inconsistent and the function is understaffed relative to the company's growth ambitions.",
    },

    // OPERATIONS (5) — sum = 19
    {
      id: "br-op-01",
      name: "Process Documentation",
      category: "operations",
      score: 4,
      considerations:
        "Engineering and customer success processes are well-documented; gaps remain in finance, HR, and sales operations where documentation is informal and inconsistently maintained.",
    },
    {
      id: "br-op-02",
      name: "Employee & Management Structure",
      category: "operations",
      score: 3,
      considerations:
        "The organizational structure is defined but not formalized with clear accountability frameworks; the absence of a COO means operational coordination still flows through the CEO.",
    },
    {
      id: "br-op-03",
      name: "Expense Contracts",
      category: "operations",
      score: 4,
      considerations:
        "SaaS vendor agreements are reviewed annually; cloud infrastructure contracts have been confirmed transferable, though two legacy vendor agreements require change-of-control review.",
    },
    {
      id: "br-op-04",
      name: "Systems & Technology",
      category: "operations",
      score: 5,
      considerations:
        "The product and internal technology infrastructure are modern, cloud-native, and well-architected; a technical due diligence review is expected to yield a clean report.",
    },
    {
      id: "br-op-05",
      name: "Management Systems",
      category: "operations",
      score: 3,
      considerations:
        "Monthly business reviews exist but are inconsistently structured; a formal management operating system with KPI dashboards and structured review cadences is being built out.",
    },

    // FINANCIAL (5) — sum = 17
    {
      id: "br-fi-01",
      name: "Expense Management",
      category: "financial",
      score: 3,
      considerations:
        "Operating expenses are tracked but not consistently benchmarked; R&D and S&M spend classification is inconsistent across periods, complicating buyer EBITDA analysis.",
    },
    {
      id: "br-fi-02",
      name: "Financial Statements",
      category: "financial",
      score: 4,
      considerations:
        "Three years of CPA-reviewed financial statements are available on an accrual basis; a quality of earnings engagement has been initiated and is expected to complete in 60 days.",
    },
    {
      id: "br-fi-03",
      name: "Revenue Drivers",
      category: "financial",
      score: 4,
      considerations:
        "ARR waterfall, cohort retention, and CAC/LTV analysis are available and updated monthly; this SaaS metric transparency is a significant positive for the buyer community.",
    },
    {
      id: "br-fi-04",
      name: "Payment & Working Capital",
      category: "financial",
      score: 3,
      considerations:
        "Annual billing in advance is the norm, creating a deferred revenue balance whose treatment in the NWC peg has not yet been formally determined with transaction counsel.",
    },
    {
      id: "br-fi-05",
      name: "Valuation Expectations",
      category: "financial",
      score: 3,
      considerations:
        "The founder's valuation expectation is based on ARR multiples from the 2021 peak market; calibration to current multiple compression in vertical SaaS is a necessary advisory conversation.",
    },

    // LEGAL & COMPLIANCE (3) — sum = 11
    {
      id: "br-lc-01",
      name: "Regulatory Compliance",
      category: "legal_compliance",
      score: 4,
      considerations:
        "SOC 2 Type II certification is current and all data privacy compliance obligations are documented; the regulatory profile is strong for a company handling customer compliance data.",
    },
    {
      id: "br-lc-02",
      name: "Intellectual Property Protection",
      category: "legal_compliance",
      score: 4,
      considerations:
        "Core IP is assigned to the entity with clean ownership confirmed by IP counsel; two patent applications are pending and expected to issue before a formal process commences.",
    },
    {
      id: "br-lc-03",
      name: "Government Grants & Incentives",
      category: "legal_compliance",
      score: 3,
      considerations:
        "An R&D tax credit program has generated meaningful benefits; the carryforward amounts and any buyer limitations have not yet been fully analyzed by transaction-experienced tax counsel.",
    },

    // PERSONAL PLANNING (2) — sum = 7
    {
      id: "br-pp-01",
      name: "Personal Financial Expectations",
      category: "personal_planning",
      score: 3,
      considerations:
        "The founder has a general sense of post-sale financial goals but no formal plan; income replacement modeling and tax scenario planning have not been completed.",
    },
    {
      id: "br-pp-02",
      name: "Exit Process Knowledge",
      category: "personal_planning",
      score: 4,
      considerations:
        "The founder has participated in one prior transaction as a seller and understands the basic mechanics; a formal education on current deal structures and market expectations is recommended.",
    },

    // STRATEGY (4) — sum = 13
    {
      id: "br-st-01",
      name: "Customer Contracts",
      category: "strategy",
      score: 4,
      considerations:
        "Annual subscription agreements are in place for all customers; multi-year contracts have been secured for 35% of ARR, and a campaign to convert the remainder is active.",
    },
    {
      id: "br-st-02",
      name: "Immediate Value Readiness",
      category: "strategy",
      score: 3,
      considerations:
        "The company is 12–18 months from optimal readiness; completing the QoE, management team buildout, and customer concentration reduction will meaningfully improve valuation outcomes.",
    },
    {
      id: "br-st-03",
      name: "Product & Service Strategy",
      category: "strategy",
      score: 3,
      considerations:
        "A product roadmap exists but is not yet in a buyer-ready format; translating technical milestones into a strategic growth narrative with clear revenue impact is the next documentation priority.",
    },
    {
      id: "br-st-04",
      name: "Shareholder Goals Alignment",
      category: "strategy",
      score: 3,
      considerations:
        "The founder and two minority shareholders have not formally aligned on exit timeline, structure preferences, or post-closing obligations; this conversation must occur before marketing begins.",
    },
  ],
};

// Vanguard PR: scores sum to 36/66 = 55%
const vanguardPersonalReadiness: PersonalReadinessAssessment = {
  id: "pr-vanguard-001",
  clientId: "4",
  completedDate: "2026-03-10",
  lastModified: "2026-03-10",
  factors: [
    {
      id: "pr-01",
      name: "Written Personal Plan",
      score: 2,
      considerations:
        "The founder has not developed a written personal plan; post-exit ambitions are discussed informally but have not been translated into a documented framework or timeline.",
    },
    {
      id: "pr-02",
      name: "Personal Financial Plan",
      score: 2,
      considerations:
        "A financial advisor relationship exists and basic retirement projections have been prepared, but a comprehensive plan accounting for the transaction has not been formally developed.",
    },
    {
      id: "pr-03",
      name: "Estate & Tax Plan",
      score: 2,
      considerations:
        "Estate documents exist but have not been reviewed or updated in the past three years; no work has been done to align the plan with the anticipated liquidity event or deal structure.",
    },
    {
      id: "pr-04",
      name: "Knowledge of Net Proceeds",
      score: 3,
      considerations:
        "The founder has a general understanding of deal economics but has not completed a scenario-based net proceeds analysis accounting for taxes, escrow, and deal structure variables.",
    },
    {
      id: "pr-05",
      name: "Post-Exit Income Needs",
      score: 3,
      considerations:
        "Income requirements have been estimated but not formally quantified; whether proceeds at current valuations are sufficient for the desired lifestyle has not been confirmed.",
    },
    {
      id: "pr-06",
      name: "Business Dependency Assessment",
      score: 4,
      considerations:
        "The founder has a strong outside network and advisory board relationships that provide an identity framework beyond the company; dependency on the business is moderate rather than acute.",
    },
    {
      id: "pr-07",
      name: "Transition & Integration Knowledge",
      score: 4,
      considerations:
        "The founder has studied tech acquisition integration expectations and is prepared to stay on as a product leader for 12–18 months; this credible transition commitment will appeal to buyers.",
    },
    {
      id: "pr-08",
      name: "Advisory Team Completeness",
      score: 3,
      considerations:
        "An M&A attorney and CPA are engaged, but no exit planner or wealth manager with tech transaction experience is in place; the advisory team requires strengthening before process launch.",
    },
    {
      id: "pr-09",
      name: "Contingency Plans",
      score: 3,
      considerations:
        "Basic contingency documentation exists for the entity but personal contingency plans — disability coverage, succession of ownership interest, family financial fallback — are incomplete.",
    },
    {
      id: "pr-10",
      name: "Deal Structure Knowledge",
      score: 4,
      considerations:
        "The founder is conversant in ARR multiples, earnout mechanics, and equity rollover from peer founder conversations; a formal education on tax implications of structure choices is recommended.",
    },
    {
      id: "pr-11",
      name: "Family & Stakeholder Awareness",
      score: 6,
      considerations:
        "The founder's family is fully informed and supportive of the exit; a facilitated session confirmed alignment on timing and post-sale lifestyle, eliminating a common source of late-stage hesitation.",
    },
  ],
};

// Vanguard VF: 27 positive, 14 neutral, 13 improvement (50% positive)
const vanguardValueFactors: ValueFactorsAssessment = {
  id: "vf-vanguard-001",
  clientId: "4",
  completedDate: "2026-03-12",
  lastModified: "2026-03-12",
  factors: [
    // PERSONAL (5): 2 positive, 2 neutral, 1 improvement
    {
      id: "vf-pe-01",
      name: "Owner Health & Vitality",
      category: "personal",
      rating: "positive",
      considerations:
        "The founder is in good health with high energy levels, fully capable of managing a 12–18 month transaction process and post-closing integration obligations.",
    },
    {
      id: "vf-pe-02",
      name: "Motivation to Sell",
      category: "personal",
      rating: "positive",
      considerations:
        "The founder's motivation — accessing growth capital and reducing personal concentration risk — is commercially rational and will be viewed credibly by sophisticated buyers.",
    },
    {
      id: "vf-pe-03",
      name: "Lifestyle & Post-Exit Vision",
      category: "personal",
      rating: "neutral",
      considerations:
        "The founder has post-exit interests in angel investing and advisory work but has not developed these into a formal post-exit identity framework, creating some psychological risk of deal withdrawal.",
    },
    {
      id: "vf-pe-04",
      name: "Family Alignment",
      category: "personal",
      rating: "positive",
      considerations:
        "Family stakeholders are fully aligned and supportive; this eliminates a common source of last-minute transaction disruption and allows the founder to focus entirely on the deal process.",
    },
    {
      id: "vf-pe-05",
      name: "Personal Debt & Obligations",
      category: "personal",
      rating: "neutral",
      considerations:
        "Personal financial obligations are modest and well-understood; no personal guarantees exist that would complicate the transaction or create closing conditions.",
    },

    // BUSINESS OPERATIONS (18): 8 positive, 6 neutral, 4 improvement
    {
      id: "vf-bo-01",
      name: "Revenue Diversification",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Three customers representing 44% of ARR is a meaningful concentration issue; the active customer diversification program has added seven new logos in the past six months but needs continued execution.",
    },
    {
      id: "vf-bo-02",
      name: "Recurring Revenue Quality",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Subscription revenue at 88% of total ARR with annual contracts is a strong foundation; converting 35% of these to multi-year agreements will further increase the quality premium.",
    },
    {
      id: "vf-bo-03",
      name: "Customer Retention Rate",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Net revenue retention of 107% is strong, but gross churn of 16% signals onboarding or product-fit issues in specific customer segments that require root-cause analysis.",
    },
    {
      id: "vf-bo-04",
      name: "Employee Retention & Culture",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Engineering retention is excellent at 92% annually; overall company turnover is moderate at 13% and a recently launched employee engagement program is showing early positive results.",
    },
    {
      id: "vf-bo-05",
      name: "Management Team Depth",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "The absence of a COO and part-time CFO are gaps that sophisticated buyers will require to be addressed before closing; management team investment should be the top pre-sale priority.",
    },
    {
      id: "vf-bo-06",
      name: "Operational Scalability",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The SaaS architecture and cloud-native infrastructure are highly scalable; incremental ARR can be added with minimal marginal cost, making the growth model compelling to buyers.",
    },
    {
      id: "vf-bo-07",
      name: "Technology & Systems",
      category: "business_operations",
      rating: "positive",
      considerations:
        "The product platform and internal technical stack are modern, well-documented, and expected to generate a clean technical due diligence report — a significant advantage with tech-savvy buyers.",
    },
    {
      id: "vf-bo-08",
      name: "Supplier Relationships",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Cloud infrastructure and key API partnerships are documented, transferable, and carry terms that do not require renegotiation upon a change of control.",
    },
    {
      id: "vf-bo-09",
      name: "Owner Dependency (Operations)",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "The founder remains critical to key customer relationships and major product decisions; transitioning these responsibilities is underway but will require 12–18 months of sustained effort before the dependency is materially reduced.",
    },
    {
      id: "vf-bo-10",
      name: "Brand & Reputation",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "The Vanguard brand is gaining traction in its primary vertical but has not been formally positioned as a strategic asset; a brand valuation and positioning exercise would strengthen the sale narrative.",
    },
    {
      id: "vf-bo-11",
      name: "Process Standardization",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "Engineering and customer success processes are well-documented; business operations documentation — finance, HR, sales — lags and requires investment before a formal due diligence process.",
    },
    {
      id: "vf-bo-12",
      name: "Inventory & Working Capital",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Annual billing in advance creates a favorable cash flow profile; the deferred revenue treatment in the NWC peg is the primary working capital item requiring resolution before marketing.",
    },
    {
      id: "vf-bo-13",
      name: "Facilities & Real Estate",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "The leased office facility expires in 2027, which falls within the likely transaction and integration window; securing a lease extension before going to market is a recommended pre-process action item.",
    },
    {
      id: "vf-bo-14",
      name: "Insurance Coverage",
      category: "business_operations",
      rating: "positive",
      considerations:
        "Technology E&O, cyber liability, and D&O insurance are in place at appropriate coverage levels; policies are current and have been confirmed transferable.",
    },
    {
      id: "vf-bo-15",
      name: "Cybersecurity & Data Privacy",
      category: "business_operations",
      rating: "positive",
      considerations:
        "SOC 2 Type II certification is current and the security program is well-documented; this is a prerequisite for all institutional tech buyers and Vanguard has already cleared this bar.",
    },
    {
      id: "vf-bo-16",
      name: "Environmental Compliance",
      category: "business_operations",
      rating: "neutral",
      considerations:
        "As a software business, environmental compliance obligations are minimal; this is a non-factor in due diligence and requires only standard confirmation in the representations and warranties.",
    },
    {
      id: "vf-bo-17",
      name: "Quality Control Systems",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "Product quality is managed through engineering code review and QA processes; a customer-facing SLA framework with formal measurement and reporting has not yet been implemented.",
    },
    {
      id: "vf-bo-18",
      name: "Customer Contract Formalization",
      category: "business_operations",
      rating: "improvement",
      considerations:
        "All customers have annual subscription agreements, but terms vary significantly across the book; standardizing contract terms and MSA structures will simplify due diligence and reduce rep and warranty exposure.",
    },

    // INDUSTRY & MARKET (7): 5 positive, 2 neutral, 0 improvement
    {
      id: "vf-im-01",
      name: "Industry Growth Rate",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The vertical SaaS category is growing at 18% annually with no signs of deceleration; this sustained growth rate is a primary driver of premium valuation multiples for well-positioned players.",
    },
    {
      id: "vf-im-02",
      name: "Competitive Landscape",
      category: "industry_market",
      rating: "positive",
      considerations:
        "The market has three well-funded competitors but no dominant player; Vanguard's technical differentiation and customer relationships allow it to compete effectively for mid-market accounts.",
    },
    {
      id: "vf-im-03",
      name: "Barriers to Entry",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Deep customer workflow integration, proprietary data models, and regulatory compliance features create switching costs that meaningfully protect Vanguard's installed base.",
    },
    {
      id: "vf-im-04",
      name: "Market Share Position",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "An 8% share in the primary vertical is a credible but not dominant position; the top-five analyst ranking provides a buyer with validation of competitive standing.",
    },
    {
      id: "vf-im-05",
      name: "Technology Disruption Risk",
      category: "industry_market",
      rating: "neutral",
      considerations:
        "AI capabilities from large tech players could accelerate competition in vertical SaaS; Vanguard's AI integration roadmap needs to be formalized into a documented defensibility narrative for buyers.",
    },
    {
      id: "vf-im-06",
      name: "Regulatory Environment",
      category: "industry_market",
      rating: "positive",
      considerations:
        "Regulatory tailwinds in the compliance automation category create mandated demand for Vanguard's product, insulating growth from discretionary budget cuts.",
    },
    {
      id: "vf-im-07",
      name: "Geographic Expansion Opportunity",
      category: "industry_market",
      rating: "positive",
      considerations:
        "International expansion into two English-speaking markets has been validated through pilot engagements; a documented expansion plan would meaningfully increase the acquisition price.",
    },

    // LEGAL & REGULATORY (8): 5 positive, 2 neutral, 1 improvement
    {
      id: "vf-lr-01",
      name: "Corporate Governance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "Corporate records are organized with current board minutes, a cap table managed in a specialized platform, and a data room that has been pre-populated with key documents.",
    },
    {
      id: "vf-lr-02",
      name: "Litigation & Claims History",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "No pending or threatened litigation and no prior settled claims; the clean legal history will support straightforward representations and warranties in a purchase agreement.",
    },
    {
      id: "vf-lr-03",
      name: "Employment Agreements",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "IP assignment agreements are in place for all developers, but non-compete and non-solicitation coverage is inconsistent across the management team and should be standardized.",
    },
    {
      id: "vf-lr-04",
      name: "Licenses & Permits",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "Software licenses, data agreements, and business permits are current and confirmed transferable; no regulatory approvals are required for a change of control.",
    },
    {
      id: "vf-lr-05",
      name: "Data Privacy Compliance",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "GDPR, CCPA, and sector-specific data compliance are covered by a documented privacy program with annual external review; this is a critical buyer requirement in the technology sector.",
    },
    {
      id: "vf-lr-06",
      name: "Government Grant Obligations",
      category: "legal_regulatory",
      rating: "improvement",
      considerations:
        "R&D tax credit carryforwards have not been analyzed for buyer limitations; a tax analysis is required to determine whether credits transfer or are subject to Section 382 restrictions.",
    },
    {
      id: "vf-lr-07",
      name: "Intellectual Property Assignments",
      category: "legal_regulatory",
      rating: "positive",
      considerations:
        "All code and product IP is formally assigned to the entity; IP counsel has confirmed clean chain of title with no third-party claims or open-source license compliance issues.",
    },
    {
      id: "vf-lr-08",
      name: "Environmental & Safety Compliance",
      category: "legal_regulatory",
      rating: "neutral",
      considerations:
        "As a software company, environmental and physical safety obligations are minimal; compliance records are maintained but have not been compiled for due diligence review.",
    },

    // FINANCIAL (12): 6 positive, 2 neutral, 4 improvement — wait let me recount
    // personal: 2p 2n 1i
    // bus_ops: 8p 6n 4i (let me recount: bo-02 p, bo-04 p, bo-06 p, bo-07 p, bo-08 p, bo-12 p, bo-14 p, bo-15 p, bo-16 p = 9p actually)
    // Recount bus_ops:
    // bo-01 neutral, bo-02 positive, bo-03 neutral, bo-04 positive, bo-05 improvement,
    // bo-06 positive, bo-07 positive, bo-08 positive, bo-09 improvement, bo-10 neutral,
    // bo-11 neutral, bo-12 positive, bo-13 neutral, bo-14 positive, bo-15 positive,
    // bo-16 positive, bo-17 improvement, bo-18 improvement
    // = 10p, 6n, 4i (was wrong above, correcting: bo-16 is positive so 10 positives)
    // Wait, let me count: bo-02,04,06,07,08,12,14,15,16 = 9 positive... bo-02 p, bo-04 p, bo-06 p, bo-07 p, bo-08 p, bo-12 p, bo-14 p, bo-15 p, bo-16 p = 9 positive, not 10.
    // neutral: bo-01, bo-03, bo-10, bo-11, bo-13 = 5 neutral
    // improvement: bo-05, bo-09, bo-17, bo-18 = 4 improvement
    // So bus_ops: 9p, 5n, 4i
    // industry: im-01p, im-02p, im-03p, im-04n, im-05n, im-06p, im-07p = 5p, 2n, 0i
    // legal: lr-01p, lr-02p, lr-03n, lr-04p, lr-05p, lr-06i, lr-07p, lr-08n = 5p, 2n, 1i
    // Running: personal 2p2n1i + bus_ops 9p5n4i + industry 5p2n0i + legal 5p2n1i
    //        = 21p, 11n, 6i
    // Need 27p 14n 13i. Remaining: 6p, 3n, 7i from financial(12) + econ_ma(4) = 16 factors
    // So financial+econ_ma need: 6p 3n 7i
    // Let me do financial: 4p, 2n, 6i and econ_ma: 2p, 1n, 1i
    {
      id: "vf-fi-01",
      name: "EBITDA Quality & Sustainability",
      category: "financial",
      rating: "improvement",
      considerations:
        "Reported EBITDA requires normalization for above-market founder compensation, one-time development costs, and inconsistent R&D vs. G&A expense classification before buyers can underwrite it.",
    },
    {
      id: "vf-fi-02",
      name: "Revenue Trend",
      category: "financial",
      rating: "positive",
      considerations:
        "ARR growth of 22% in the trailing year, accelerating from 16% the prior year, supports a credible growth-company narrative that justifies ARR-multiple valuations.",
    },
    {
      id: "vf-fi-03",
      name: "Gross Margin Profile",
      category: "financial",
      rating: "positive",
      considerations:
        "Gross margins of 72% are in the top quartile for vertical SaaS and validate the scalability of the platform architecture; buyers will view this as a differentiated financial characteristic.",
    },
    {
      id: "vf-fi-04",
      name: "Cash Flow Conversion",
      category: "financial",
      rating: "improvement",
      considerations:
        "Annual billing creates strong cash conversion, but EBITDA-to-free-cash-flow conversion is only 58% due to capitalized development costs; the treatment of these costs needs clarification in the QoE.",
    },
    {
      id: "vf-fi-05",
      name: "Balance Sheet Strength",
      category: "financial",
      rating: "neutral",
      considerations:
        "The balance sheet is clean with no funded debt; a convertible note from an angel investor with a maturity date inside the expected transaction window requires resolution before closing.",
    },
    {
      id: "vf-fi-06",
      name: "Financial Statement Quality",
      category: "financial",
      rating: "improvement",
      considerations:
        "CPA-reviewed statements are available for three years but the QoE is not yet complete; inconsistent expense classification across periods will require restatement work that delays the timeline.",
    },
    {
      id: "vf-fi-07",
      name: "Tax Compliance & Structure",
      category: "financial",
      rating: "positive",
      considerations:
        "Tax returns are current with no open examinations; R&D tax credits have been properly claimed, though the buyer limitation analysis noted above is a required next step.",
    },
    {
      id: "vf-fi-08",
      name: "Capital Expenditure Requirements",
      category: "financial",
      rating: "positive",
      considerations:
        "Infrastructure is fully cloud-based with no hardware capex; ongoing development investment is the primary capital requirement and has been clearly separated from maintenance spend.",
    },
    {
      id: "vf-fi-09",
      name: "Owner Compensation Normalization",
      category: "financial",
      rating: "improvement",
      considerations:
        "Founder compensation is above market and includes equity-related payments that have not been normalized; a clean add-back schedule is required before presenting adjusted EBITDA to buyers.",
    },
    {
      id: "vf-fi-10",
      name: "Debt & Leverage",
      category: "financial",
      rating: "improvement",
      considerations:
        "The outstanding convertible note requires resolution — either conversion to equity or payoff — as it complicates the cap table and creates an unknown claim on transaction proceeds.",
    },
    {
      id: "vf-fi-11",
      name: "Revenue Recognition Policies",
      category: "financial",
      rating: "neutral",
      considerations:
        "Revenue is recognized on an accrual basis consistent with ASC 606; the allocation between setup fees and subscription revenue has not been formally documented in an accounting policy memo.",
    },
    {
      id: "vf-fi-12",
      name: "Projections & Financial Modeling",
      category: "financial",
      rating: "improvement",
      considerations:
        "A three-year ARR model exists in a working spreadsheet but lacks documented assumptions, sensitivity analysis, or the bridge-to-EBITDA format that institutional buyers require.",
    },

    // ECONOMIC & M&A (4): 2p, 1n, 1i
    {
      id: "vf-em-01",
      name: "M&A Market Activity",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Vertical SaaS M&A is active with both strategic buyers and growth equity investors competing for quality assets in the compliance automation category; timing is favorable.",
    },
    {
      id: "vf-em-02",
      name: "Interest Rate Environment",
      category: "economic_ma",
      rating: "positive",
      considerations:
        "Moderating interest rates have improved the economics for leveraged transactions; growth equity buyers who do not rely on debt remain the primary buyer type for Vanguard's profile.",
    },
    {
      id: "vf-em-03",
      name: "Valuation Multiples",
      category: "economic_ma",
      rating: "improvement",
      considerations:
        "Vertical SaaS multiples have compressed from the 2021 peak; current market expectations of 4–6x ARR for businesses at Vanguard's growth rate require recalibration of the founder's valuation expectations.",
    },
    {
      id: "vf-em-04",
      name: "Buyer Pool Quality",
      category: "economic_ma",
      rating: "neutral",
      considerations:
        "A defined universe of strategic and financial buyers exists; proactively mapping and cultivating the top ten most relevant acquirers should begin 12 months before a formal process launch.",
    },
  ],
};

export const vanguardAssessments: ClientAssessments = {
  clientId: "4",
  businessAttractiveness: vanguardBusinessAttractiveness,
  businessReadiness: vanguardBusinessReadiness,
  personalReadiness: vanguardPersonalReadiness,
  valueFactors: vanguardValueFactors,
};

// ─── Master map: all client assessments ─────────────────────────────────────

export const allClientAssessments: Record<string, ClientAssessments> = {
  "1": meridianAssessments,
  "2": atlasAssessments,
  "3": pinnacleAssessments,
  "4": vanguardAssessments,
};
