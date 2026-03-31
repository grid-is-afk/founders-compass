import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar } from "lucide-react";
import type { Prospect } from "@/lib/types/journey";

interface ProspectCardProps {
  prospect: Prospect;
}

const sourceBadgeColor = (source: string) => {
  switch (source.toLowerCase()) {
    case "referral":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "website":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "conference":
      return "bg-violet-500/10 text-violet-700 border-violet-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ProspectCard = ({ prospect }: ProspectCardProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{prospect.name}</p>
          <p className="text-xs text-muted-foreground truncate">{prospect.contact}</p>
        </div>
        <Badge
          variant="outline"
          className={cn("text-[10px] font-medium px-1.5 py-0 flex-shrink-0", sourceBadgeColor(prospect.source))}
        >
          {prospect.source}
        </Badge>
      </div>

      {/* Company + Revenue */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{prospect.company}</span>
        </div>
        <span className="font-medium text-foreground">{prospect.revenue}</span>
      </div>

      {/* Fit Score */}
      {prospect.fitScore !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fit Score</span>
            <span className="text-xs font-semibold text-foreground">{prospect.fitScore}</span>
          </div>
          <Progress value={prospect.fitScore} className="h-1.5" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{prospect.date}</span>
        </div>

        {prospect.fitDecision === "fit" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/20">
            Fit
          </span>
        )}
        {prospect.fitDecision === "no_fit" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold border border-destructive/20">
            No Fit
          </span>
        )}
      </div>

      {/* Notes */}
      {prospect.notes && (
        <p className="text-[11px] text-muted-foreground italic leading-snug">{prospect.notes}</p>
      )}
    </div>
  );
};

export default ProspectCard;
