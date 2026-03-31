import { cn } from "@/lib/utils";
import { QualitativeRating } from "@/lib/types/assessments";
import { getQualitativeColor } from "@/lib/assessmentUtils";

interface ValueFactorPillProps {
  rating: QualitativeRating;
}

const ValueFactorPill = ({ rating }: ValueFactorPillProps) => {
  const { dot, container, text } = getQualitativeColor(rating);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap",
        container
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
      {text}
    </span>
  );
};

export default ValueFactorPill;
