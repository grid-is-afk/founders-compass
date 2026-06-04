import { Construction } from "lucide-react";

/**
 * Generic "coming soon" page for licensee portal nav items that are part of the
 * full spec but out of scope for the V1 thin slice (Investor Share, Capital
 * Strategy, User Management, Prospects, etc.).
 */
const LicenseePlaceholder = ({ title }: { title: string }) => (
  <div className="max-w-3xl">
    <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
        <Construction className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-display font-semibold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        This area is coming soon. It's part of the full Advisor Portal roadmap and will be
        enabled in a later release.
      </p>
    </div>
  </div>
);

export default LicenseePlaceholder;
