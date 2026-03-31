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
import { insuranceOpportunities, insuranceReferralLog } from "@/lib/mockData";
import { severityIcon, severityStyle } from "@/lib/copilotStyles";

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
