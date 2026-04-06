import { Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

const insuranceOpportunities = [
  {
    id: "ins1",
    type: "Key Person Insurance",
    severity: "critical" as const,
    reason: "Founder dependency risk identified and no continuity funding mechanism documented.",
    benefit: "Provides liquidity and stability in the event of founder loss and strengthens investor confidence.",
    action: "Refer to insurance specialist to evaluate appropriate coverage.",
    client: "Vanguard Tech Solutions",
    engine: "Capital Architecture",
  },
  {
    id: "ins2",
    type: "Buy-Sell Funding Insurance",
    severity: "warning" as const,
    reason: "Multi-owner entity with no funded buy-sell agreement. Ownership transfer risk in the event of partner departure or death.",
    benefit: "Ensures orderly ownership transition and protects remaining partners from capital strain.",
    action: "Schedule buy-sell funding analysis with insurance partner.",
    client: "Atlas Manufacturing",
    engine: "Capital Architecture",
  },
  {
    id: "ins3",
    type: "Estate Planning — Life Insurance",
    severity: "warning" as const,
    reason: "Founder estate tax exposure estimated at $3.2M with no documented insurance strategy.",
    benefit: "Offsets estate tax liability and preserves business continuity for heirs.",
    action: "Engage estate planning specialist to model ILIT structure.",
    client: "Meridian Industries",
    engine: "Capital Architecture",
  },
  {
    id: "ins4",
    type: "Executive Benefit Structure",
    severity: "info" as const,
    reason: "Key executives lack retention incentives beyond standard compensation. Turnover risk identified.",
    benefit: "Deferred compensation and split-dollar arrangements improve retention and reduce successor risk.",
    action: "Evaluate executive benefit design with compensation specialist.",
    client: "Pinnacle Services Group",
    engine: "Performance & Execution",
  },
  {
    id: "ins5",
    type: "Business Continuity Insurance",
    severity: "warning" as const,
    reason: "Revenue concentration exceeds 30% in top 3 customers with no business interruption strategy documented.",
    benefit: "Protects cash flow in the event of key customer loss or market disruption.",
    action: "Review business continuity insurance options with carrier.",
    client: "Atlas Manufacturing",
    engine: "Customer Capital Defense",
  },
];

const insuranceReferralLog = [
  { id: "ref1", client: "Vanguard Tech Solutions", type: "Key Person Insurance", partner: "Meridian Risk Advisors", date: "Feb 28, 2026", status: "pending" as const },
  { id: "ref2", client: "Meridian Industries", type: "Estate Planning — Life Insurance", partner: "Legacy Planning Group", date: "Mar 1, 2026", status: "in_progress" as const },
];

const InsuranceTab = () => {
  return (
    <div className="space-y-3">
      {insuranceOpportunities.map((opp) => (
        <div key={opp.id} className={cn("p-4 rounded-md border", severityStyle[opp.severity])}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2">
              {severityIcon[opp.severity]}
              <div>
                <p className="text-sm font-semibold text-foreground">{opp.type}</p>
                <p className="text-[10px] text-muted-foreground">
                  {opp.client} · {opp.engine}
                </p>
              </div>
            </div>
          </div>
          <div className="ml-6 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {opp.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Strategic Benefit:</span> {opp.benefit}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Action:</span> {opp.action}
            </p>
          </div>
          <div className="ml-6 mt-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <ExternalLink className="w-3 h-3 mr-1" />Generate Referral
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Insurance Referral</DialogTitle>
                  <DialogDescription>
                    Create a referral for {opp.type} — {opp.client}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-md bg-muted/50 border border-border space-y-2">
                    <p className="text-sm font-medium text-foreground">{opp.type}</p>
                    <p className="text-xs text-muted-foreground">{opp.reason}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Referral Partner</label>
                    <input
                      type="text"
                      placeholder="Enter insurance partner name or firm..."
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Notes</label>
                    <textarea
                      placeholder="Additional context for the referral..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm">
                    Save to CRM
                  </Button>
                  <Button size="sm">
                    <Send className="w-3 h-3 mr-1.5" />Send Referral
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}

      {/* Referral Log */}
      {insuranceReferralLog.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
            Recent Referrals
          </p>
          {insuranceReferralLog.map((ref) => (
            <div key={ref.id} className="flex items-center justify-between py-2 text-xs">
              <div>
                <p className="font-medium text-foreground">{ref.type}</p>
                <p className="text-muted-foreground">
                  {ref.client} → {ref.partner}
                </p>
              </div>
              <Badge
                variant={ref.status === "in_progress" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {ref.status === "in_progress" ? "In Progress" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsuranceTab;
