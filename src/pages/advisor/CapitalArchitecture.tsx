import StatCard from "@/components/dashboard/StatCard";
import { Shield, FileText, Landmark, GitBranch, Umbrella, ExternalLink, CircleAlert, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const severityIcon: Record<string, React.ReactNode> = {
  critical: <CircleAlert className="w-3.5 h-3.5 text-destructive" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  info: <Info className="w-3.5 h-3.5 text-primary" />,
};

const severityBorder: Record<string, string> = {
  critical: "border-destructive/30",
  warning: "border-amber-500/30",
  info: "border-primary/30",
};

const capitalArchInsurance = [
  {
    id: "ins1",
    type: "Key Person Insurance",
    severity: "critical" as const,
    reason: "Founder dependency risk identified and no continuity funding mechanism documented.",
    benefit: "Provides liquidity and stability in the event of founder loss and strengthens investor confidence.",
    client: "Vanguard Tech Solutions",
  },
  {
    id: "ins2",
    type: "Buy-Sell Funding Insurance",
    severity: "warning" as const,
    reason: "Multi-owner entity with no funded buy-sell agreement. Ownership transfer risk in the event of partner departure or death.",
    benefit: "Ensures orderly ownership transition and protects remaining partners from capital strain.",
    client: "Atlas Manufacturing",
  },
  {
    id: "ins3",
    type: "Estate Planning — Life Insurance",
    severity: "warning" as const,
    reason: "Founder estate tax exposure estimated at $3.2M with no documented insurance strategy.",
    benefit: "Offsets estate tax liability and preserves business continuity for heirs.",
    client: "Meridian Industries",
  },
];

const CapitalArchitecture = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Capital Architecture</h1>
        <p className="text-muted-foreground mt-1 text-sm">Entity structure, tax optimization, and capital optionality — because complexity is not sophistication</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Structural Risk" value="Low" />
        <StatCard icon={FileText} label="Tax Opportunities" value="4" suffix=" found" />
        <StatCard icon={Landmark} label="Entity Score" value="76" suffix="/100" />
        <StatCard icon={GitBranch} label="Capital Options" value="3" suffix=" viable" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Entity Structure Overview</h3>
          <div className="space-y-3">
            {[
              { label: "Operating Entity", value: "S-Corp", note: "Consider C-Corp conversion for QSBS" },
              { label: "Holding Company", value: "Not established", note: "Recommended for asset protection" },
              { label: "Trust Structure", value: "Revocable trust only", note: "Explore GRAT for tax efficiency" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{item.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Capital Optionality</h3>
          <p className="text-xs text-muted-foreground mb-4">Most founders chase earnings. The Value Multiplier Framework™ amplifies the drivers of the multiple.</p>
          <div className="space-y-3">
            {[
              { option: "Minority Recapitalization", viability: 82, status: "Recommended" },
              { option: "Strategic Acquisition", viability: 65, status: "Viable" },
              { option: "ESOP", viability: 45, status: "Explore" },
              { option: "Full Exit / Sale", viability: 72, status: "Viable" },
            ].map((item) => (
              <div key={item.option} className="flex items-center gap-4 p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.option}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-gold" style={{ width: `${item.viability}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{item.viability}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insurance Strategy Insights */}
      {capitalArchInsurance.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <Umbrella className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Risk Protection & Insurance Strategy</h3>
            <Badge variant="secondary" className="text-[10px] ml-1">{capitalArchInsurance.length} opportunities</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Strategic insurance recommendations surfaced by the Quarterback Copilot based on capital architecture analysis.</p>
          <div className="space-y-3">
            {capitalArchInsurance.map((opp) => (
              <div key={opp.id} className={cn("p-4 rounded-md border", severityBorder[opp.severity])}>
                <div className="flex items-start gap-2.5">
                  {severityIcon[opp.severity]}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{opp.type}</p>
                      <span className="text-[10px] text-muted-foreground">{opp.client}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{opp.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Benefit:</span> {opp.benefit}</p>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        <ExternalLink className="w-3 h-3 mr-1" />Generate Referral
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalArchitecture;
