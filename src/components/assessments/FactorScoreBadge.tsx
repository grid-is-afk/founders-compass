import { cn } from "@/lib/utils";
import { ScoredRating } from "@/lib/types/assessments";
import { getRatingBgColor } from "@/lib/assessmentUtils";

interface FactorScoreBadgeProps {
  score: ScoredRating;
}

const FactorScoreBadge = ({ score }: FactorScoreBadgeProps) => {
  const filledColor = getRatingBgColor(score);

  return (
    <div className="flex items-center gap-1" aria-label={`Score: ${score} out of 6`}>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors",
            i < score ? filledColor : "bg-border"
          )}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">{score}/6</span>
    </div>
  );
};

export default FactorScoreBadge;
