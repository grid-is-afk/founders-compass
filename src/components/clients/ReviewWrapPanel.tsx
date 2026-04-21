import { CheckCircle2 } from "lucide-react";

export function ReviewWrapPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Review & Wrap</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Final review of all Q1 deliverables and sign-off.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="font-display font-semibold text-foreground">Q1 Discover — Final Phase</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          All diagnostic and design work is complete. Use this phase to review deliverables with the
          client, collect sign-offs, and prepare the transition to Q2.
        </p>
      </div>
    </div>
  );
}
