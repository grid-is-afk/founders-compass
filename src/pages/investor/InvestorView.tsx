import { Shield, FileText, Lock, Download, Search, FolderOpen, FileSpreadsheet, File, TrendingUp, Target, Users, BarChart3, CheckCircle2, AlertTriangle, Landmark, Umbrella } from "lucide-react";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const dataRoomDocuments = [
  { id: "dr1", name: "Capital Readiness Memo", category: "Reports", date: "Mar 5, 2026", size: "2.4 MB", type: "pdf" as const },
  { id: "dr2", name: "Institutional Performance Brief", category: "Reports", date: "Feb 28, 2026", size: "1.8 MB", type: "pdf" as const },
  { id: "dr3", name: "3-Year Adjusted P&L", category: "Financials", date: "Feb 20, 2026", size: "540 KB", type: "spreadsheet" as const },
  { id: "dr4", name: "Balance Sheet — Normalized", category: "Financials", date: "Feb 20, 2026", size: "480 KB", type: "spreadsheet" as const },
  { id: "dr5", name: "Customer Concentration Analysis", category: "Customer Capital", date: "Mar 1, 2026", size: "1.1 MB", type: "pdf" as const },
  { id: "dr6", name: "Revenue by Segment Breakdown", category: "Customer Capital", date: "Feb 25, 2026", size: "320 KB", type: "spreadsheet" as const },
  { id: "dr7", name: "Entity Structure Diagram", category: "Legal & Structure", date: "Feb 15, 2026", size: "890 KB", type: "pdf" as const },
  { id: "dr8", name: "Operating Agreement Summary", category: "Legal & Structure", date: "Jan 30, 2026", size: "1.5 MB", type: "document" as const },
  { id: "dr9", name: "Management Team Overview", category: "Governance", date: "Feb 10, 2026", size: "720 KB", type: "pdf" as const },
  { id: "dr10", name: "Six Keys Scorecard Export", category: "Reports", date: "Mar 3, 2026", size: "280 KB", type: "pdf" as const },
];

const investorRiskProtection = [
  { category: "Key Person Coverage", status: "Not Documented" as const, risk: "high" as const, recommendation: "Recommend key person policy with coverage equal to 3–5x EBITDA." },
  { category: "Buy-Sell Funding", status: "Unfunded" as const, risk: "high" as const, recommendation: "Cross-purchase or entity-purchase agreement should be insurance-funded." },
  { category: "Business Continuity", status: "Partial" as const, risk: "medium" as const, recommendation: "Current coverage does not address key customer concentration scenario." },
  { category: "Estate & Succession", status: "Under Review" as const, risk: "medium" as const, recommendation: "ILIT structure recommended to offset projected estate tax exposure." },
  { category: "Executive Retention", status: "Not in Place" as const, risk: "low" as const, recommendation: "Consider deferred compensation or split-dollar arrangement for key managers." },
];

/* ── Founders Office Analysis ── */
const foAnalysis = {
  company: "Portfolio Company",
  preparedFor: "Invited Partner",
  overallScore: 78,
  scoreLabel: "Strong",
  summary: "This company demonstrates institutional-quality fundamentals with notable strengths in revenue durability and execution discipline. Key areas for continued focus include founder dependency reduction and capital structure optimization.",
  dimensions: [
    { key: "Clarity", score: 85, label: "Strong", desc: "Clear value proposition with well-defined capital thesis and market positioning." },
    { key: "Alignment", score: 72, label: "Developing", desc: "Stakeholder alignment improving; board governance in process of institutionalization." },
    { key: "Structure", score: 68, label: "Developing", desc: "Entity structure functional but opportunities exist for tax-efficient restructuring." },
    { key: "Stewardship", score: 82, label: "Strong", desc: "Strong financial controls, clean reporting, and disciplined cash management." },
    { key: "Velocity", score: 80, label: "Strong", desc: "Consistent execution cadence with 90-day sprint discipline producing measurable outcomes." },
    { key: "Legacy", score: 74, label: "Developing", desc: "Founder dependency remains moderate; key-person transition plan in development." },
  ],
};

const capitalHighlights = [
  { label: "Revenue", value: "$14.2M ARR", trend: "+18% YoY", positive: true },
  { label: "EBITDA Margin", value: "22.4%", trend: "+3.1pp", positive: true },
  { label: "Customer Concentration", value: "24%", trend: "Top 3 clients", positive: false },
  { label: "Retention Rate", value: "94%", trend: "Net Revenue", positive: true },
];

const publishedReports = [
  { title: "Founders Office Capital Readiness Memo", date: "Mar 5, 2026", pages: 18, category: "Analysis" },
  { title: "Institutional Performance Brief", date: "Feb 28, 2026", pages: 12, category: "Performance" },
  { title: "Customer Capital Defense Summary", date: "Feb 20, 2026", pages: 8, category: "Risk" },
  { title: "Capital Architecture Overview", date: "Feb 15, 2026", pages: 10, category: "Structure" },
  { title: "90-Day Execution Plan", date: "Feb 10, 2026", pages: 6, category: "Execution" },
];

const categories = ["All", ...Array.from(new Set(dataRoomDocuments.map(d => d.category)))];

const docTypeIcon: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-destructive/70" />,
  spreadsheet: <FileSpreadsheet className="w-4 h-4 text-primary" />,
  document: <File className="w-4 h-4 text-accent" />,
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 65) return "text-amber-500";
  return "text-destructive";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 65) return "bg-amber-500/10";
  return "bg-destructive/10";
}

const InvestorView = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchParams] = useSearchParams();
  const recipientName = searchParams.get("to") || "Invited Partner";

  const filteredDocs = useMemo(() => {
    return dataRoomDocuments.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground font-display">F</span>
            </div>
            <div>
              <span className="font-display text-lg font-semibold text-foreground">The Founders Office</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Secure Partner Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
              <Lock className="w-3 h-3" />
              <span>Secure share · Expires in 14 days</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Company Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">Confidential — Prepared for {recipientName}</p>
            <h1 className="text-3xl font-display font-semibold text-foreground">{foAnalysis.company}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Curated capital readiness materials prepared by The Founders Office advisory team</p>
          </div>
          <div className={cn("text-center px-5 py-3 rounded-lg border border-border", scoreBg(foAnalysis.overallScore))}>
            <p className={cn("text-3xl font-display font-bold", scoreColor(foAnalysis.overallScore))}>{foAnalysis.overallScore}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mt-0.5">Capital Readiness</p>
          </div>
        </div>

        {/* ── Founders Office Analysis ── */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-display font-semibold text-foreground">Founders Office Analysis</h2>
            </div>
            <p className="text-xs text-muted-foreground">Six Keys of Capital™ Assessment</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{foAnalysis.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {foAnalysis.dimensions.map(d => (
                <div key={d.key} className="p-4 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{d.key}</span>
                    <span className={cn("text-lg font-display font-bold", scoreColor(d.score))}>{d.score}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted mb-2">
                    <div className={cn("h-full rounded-full", d.score >= 80 ? "bg-emerald-500" : d.score >= 65 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${d.score}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capital Highlights */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Capital Highlights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {capitalHighlights.map(h => (
              <div key={h.label} className="bg-card rounded-lg border border-border p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{h.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{h.value}</p>
                <p className={cn("text-xs mt-1 font-medium", h.positive ? "text-emerald-500" : "text-amber-500")}>{h.trend}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Published Reports */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Published Reports</h2>
          <div className="space-y-2">
            {publishedReports.map((r) => (
              <div key={r.title} className="bg-card rounded-lg border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.date} · {r.pages} pages · {r.category}</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-primary hover:underline flex-shrink-0">
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Room */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Data Room</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{dataRoomDocuments.length} files</span>
          </div>

          {/* Search & Filters */}
          <div className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Document List */}
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No documents match your search</div>
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    {docTypeIcon[doc.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} · {doc.date} · {doc.size}</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs text-primary hover:underline flex-shrink-0">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">{filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Risk Protection & Continuity Structures */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Umbrella className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-display font-semibold text-foreground">Risk Protection & Continuity Structures</h2>
            </div>
            <p className="text-xs text-muted-foreground">Insurance and risk mitigation assessment as part of institutional diligence</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {investorRiskProtection.map((item) => (
                <div key={item.category} className={cn(
                  "p-4 rounded-lg border",
                  item.risk === "high" ? "border-destructive/30 bg-destructive/5" : item.risk === "medium" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30"
                )}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {item.risk === "high" ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> : item.risk === "medium" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">{item.category}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      item.risk === "high" ? "bg-destructive/15 text-destructive" : item.risk === "medium" ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"
                    )}>{item.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5.5">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="p-5 rounded-lg bg-muted/50 border border-border">
          <div className="flex flex-col items-center gap-2 text-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">All downloads are watermarked with recipient identity. Access is logged and monitored.</p>
            <p className="text-[10px] text-muted-foreground/60">This portal was prepared by The Founders Office. Unauthorized distribution is prohibited.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvestorView;
