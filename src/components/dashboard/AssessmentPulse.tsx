import { TrendingUp, Shield, User, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { getScoreColor, getScoreTextColor } from "@/lib/assessmentUtils";
import { useAssessmentScores } from "@/hooks/useAssessmentScores";
import { useClientContext } from "@/hooks/useClientContext";
import { allClientAssessments } from "@/lib/assessmentMockData";

interface PulseSegmentProps {
  icon: React.ElementType;
  label: string;
  percentage: number;
  isComplete: boolean;
  isLast?: boolean;
}

const PulseSegment = ({ icon: Icon, label, percentage, isComplete, isLast }: PulseSegmentProps) => {
  const dotColor = getScoreColor(percentage);
  const textColor = getScoreTextColor(percentage);
  const barColor = getScoreColor(percentage);

  return (
    <div
      className={cn(
        "flex-1 px-4 py-1 flex flex-col gap-1",
        !isLast && "border-r border-border"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-display font-semibold leading-none", textColor)}>
          {percentage}%
        </span>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Completion badge */}
      <span className={cn("text-[10px] font-medium", isComplete ? "text-primary" : "text-muted-foreground")}>
        {isComplete ? "Complete" : "In Progress"}
      </span>
    </div>
  );
};

const AssessmentPulse = () => {
  const { selectedClientId, selectedClient } = useClientContext();
  const clientAssessments = allClientAssessments[selectedClientId] ?? allClientAssessments["1"];
  const { assessments, baScore, brScore, prScore, vfScore } = useAssessmentScores(clientAssessments);
  const { businessAttractiveness, businessReadiness, personalReadiness, valueFactors } = assessments;

  const displayBa = baScore;
  const displayBr = brScore;
  const displayPr = prScore;
  const displayVf = vfScore;

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="px-4 pt-3 pb-1 border-b border-border">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
          Assessment Pulse — {selectedClient.name}
        </span>
      </div>
      <div className="flex divide-x-0 py-3">
        <PulseSegment
          icon={TrendingUp}
          label="Business Attractiveness"
          percentage={displayBa}
          isComplete={!!businessAttractiveness?.completedDate}
        />
        <PulseSegment
          icon={Shield}
          label="Business Readiness"
          percentage={displayBr}
          isComplete={!!businessReadiness?.completedDate}
        />
        <PulseSegment
          icon={User}
          label="Personal Readiness"
          percentage={displayPr}
          isComplete={!!personalReadiness?.completedDate}
        />
        <PulseSegment
          icon={LayoutGrid}
          label="54 Value Factors"
          percentage={displayVf}
          isComplete={!!valueFactors?.completedDate}
          isLast
        />
      </div>
    </div>
  );
};

export default AssessmentPulse;
