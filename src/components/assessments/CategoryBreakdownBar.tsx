import { cn } from "@/lib/utils";

export interface CategorySegment {
  name: string;
  score: number;
  maxScore: number;
  color?: string;
}

interface CategoryBreakdownBarProps {
  categories: CategorySegment[];
}

const DEFAULT_COLORS = [
  "bg-primary",
  "bg-accent",
  "bg-primary/60",
  "bg-accent/70",
  "bg-primary/40",
  "bg-accent/50",
];

const CategoryBreakdownBar = ({ categories }: CategoryBreakdownBarProps) => {
  const totalMax = categories.reduce((s, c) => s + c.maxScore, 0);

  if (totalMax === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Segmented bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-muted">
        {categories.map((cat, i) => {
          const widthPct = (cat.maxScore / totalMax) * 100;
          const fillPct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
          const color = cat.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div
              key={cat.name}
              className="relative bg-muted overflow-hidden"
              style={{ width: `${widthPct}%` }}
              title={`${cat.name}: ${cat.score}/${cat.maxScore}`}
            >
              <div
                className={cn("absolute inset-y-0 left-0 transition-all duration-500", color)}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {categories.map((cat, i) => {
          const color = cat.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;

          return (
            <div key={cat.name} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", color)} />
              <span className="text-xs text-muted-foreground">
                {cat.name} <span className="font-medium text-foreground">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBreakdownBar;
