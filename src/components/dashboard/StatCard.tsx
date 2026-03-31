import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  onClick?: () => void;
  sourceLabel?: string;
}

const StatCard = ({ icon: Icon, label, value, suffix, onClick, sourceLabel }: StatCardProps) => {
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-5 shadow-card transition-shadow",
        onClick && "cursor-pointer hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
      )}
      onClick={onClick}
      {...interactiveProps}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-3xl font-display font-semibold text-foreground">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {sourceLabel && (
        <p className="text-[10px] text-muted-foreground mt-1">{sourceLabel}</p>
      )}
    </div>
  );
};

export default StatCard;
