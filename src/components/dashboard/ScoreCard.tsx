import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  score: number;
  description: string;
}

const ScoreCard = ({ label, score, description }: ScoreCardProps) => {
  const getColor = (s: number) => {
    if (s >= 80) return "text-primary bg-primary/10";
    if (s >= 60) return "text-accent bg-accent/15";
    return "text-destructive bg-destructive/10";
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{label}</p>
      <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-display font-bold mb-2", getColor(score))}>
        {score}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default ScoreCard;
