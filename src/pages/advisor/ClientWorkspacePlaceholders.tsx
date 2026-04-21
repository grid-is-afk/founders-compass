/**
 * Placeholder pages for the Protect, Grow, and Prove & Align tabs
 * inside the Client Workspace. These will be built in future phases.
 */

import { ShieldCheck, TrendingUp, BarChart3 } from "lucide-react";

function ComingSoonPanel({ icon: Icon, label, description }: {
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-display font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 border border-border/40 rounded-full px-3 py-1">
        Coming in a future phase
      </span>
    </div>
  );
}

export function ClientProtectPage() {
  return (
    <ComingSoonPanel
      icon={ShieldCheck}
      label="Protect"
      description="Risk analysis, protection instruments, and coverage gap review for this client."
    />
  );
}

export function ClientGrowPage() {
  return (
    <ComingSoonPanel
      icon={TrendingUp}
      label="Grow"
      description="Grow lane engagements, capital strategy, and customer capital analysis."
    />
  );
}

export function ClientProvePage() {
  return (
    <ComingSoonPanel
      icon={BarChart3}
      label="Prove & Align"
      description="Reports, quarterly reviews, and investor-facing materials for this client."
    />
  );
}
