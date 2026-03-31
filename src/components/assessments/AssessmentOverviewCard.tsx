import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import CategoryBreakdownBar, { CategorySegment } from "./CategoryBreakdownBar";
import { getScoreTextColor } from "@/lib/assessmentUtils";

interface AssessmentOverviewCardProps {
  icon: LucideIcon;
  title: string;
  scorePercentage: number;
  completedDate: string | null;
  factorCount: number;
  lastModified: string;
  categories: CategorySegment[];
  maxLabel?: string;
}

const AssessmentOverviewCard = ({
  icon: Icon,
  title,
  scorePercentage,
  completedDate,
  factorCount,
  lastModified,
  categories,
  maxLabel,
}: AssessmentOverviewCardProps) => {
  const textColor = getScoreTextColor(scorePercentage);

  return (
    <div className="bg-card rounded-lg border border-border p-5 shadow-card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground leading-tight">
              {title}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{factorCount} factors</p>
          </div>
        </div>
        {completedDate ? (
          <Badge variant="outline" className="text-[10px] font-medium text-primary border-primary/30 bg-primary/5">
            Complete
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
            Pending
          </Badge>
        )}
      </div>

      {/* Score */}
      <div className="flex flex-col items-center py-4">
        <span className={cn("text-4xl font-display font-semibold tabular-nums", textColor)}>
          {scorePercentage}%
        </span>
        {maxLabel && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{maxLabel}</span>
        )}
      </div>

      {/* Category breakdown */}
      {categories.length > 0 ? (
        <CategoryBreakdownBar categories={categories} />
      ) : (
        <p className="text-[10px] text-muted-foreground text-center py-2">Single-category assessment</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {completedDate ? `Completed ${completedDate}` : "Not started"}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Modified {lastModified}
        </span>
      </div>
    </div>
  );
};

export default AssessmentOverviewCard;
