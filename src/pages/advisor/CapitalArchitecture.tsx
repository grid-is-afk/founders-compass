import StatCard from "@/components/dashboard/StatCard";
import { Shield, FileText, Landmark, GitBranch, Umbrella } from "lucide-react";

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
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-1">
          <Umbrella className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Risk Protection & Insurance Strategy</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Strategic insurance recommendations are surfaced by the Quarterback Copilot once capital architecture analysis is complete.</p>
        <div className="bg-muted/30 rounded-lg border border-border p-6 text-center">
          <Umbrella className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-display font-semibold text-foreground mb-1">No insurance opportunities identified yet</h4>
          <p className="text-sm text-muted-foreground">Recommendations will appear here once client data and capital architecture analysis are complete.</p>
        </div>
      </div>
    </div>
  );
};

export default CapitalArchitecture;
