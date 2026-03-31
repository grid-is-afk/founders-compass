import { CircleAlert, AlertTriangle, Info, Shield, TrendingUp, Target } from "lucide-react";

export const urgencyStyle = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/15 text-accent-foreground border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
};

export const severityIcon = {
  critical: <CircleAlert className="w-4 h-4 text-destructive" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-primary" />,
};

export const severityStyle = {
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  info: "border-primary/30 bg-primary/5",
};

export const deliverableStatusLabel = {
  ready: { label: "Ready to Generate", style: "bg-emerald-500/15 text-emerald-700" },
  draft: { label: "Draft Available", style: "bg-primary/15 text-primary" },
  needs_data: { label: "Needs Data", style: "bg-muted text-muted-foreground" },
};

export const engineIcon: Record<string, JSX.Element> = {
  "Capital Architecture": <Shield className="w-4 h-4" />,
  "Customer Capital Defense": <TrendingUp className="w-4 h-4" />,
  "Performance & Execution": <Target className="w-4 h-4" />,
};
