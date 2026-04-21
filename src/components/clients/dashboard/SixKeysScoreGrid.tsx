import { Lock } from "lucide-react";
import { useClientSixKeys } from "@/hooks/useClientSixKeys";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SixKeyDef {
  key: "clarity" | "alignment" | "structure" | "stewardship" | "velocity" | "legacy";
  label: string;
  description: string;
}

interface SixKeysScoreGridProps {
  clientId: string;
}

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const SIX_KEYS: SixKeyDef[] = [
  {
    key: "clarity",
    label: "Clarity",
    description: "Strategic vision and capital narrative definition",
  },
  {
    key: "alignment",
    label: "Alignment",
    description: "Mutual verification of intent, data, and outcomes",
  },
  {
    key: "structure",
    label: "Structure",
    description: "Capital stack simplicity and enforceability",
  },
  {
    key: "stewardship",
    label: "Stewardship",
    description: "Governance integrity and daily discipline",
  },
  {
    key: "velocity",
    label: "Velocity",
    description: "Pace matched to data and governance capacity",
  },
  {
    key: "legacy",
    label: "Legacy",
    description: "Organization endurance beyond the founder",
  },
];

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SixKeysScoreGrid({ clientId }: SixKeysScoreGridProps) {
  const { data: record, isLoading } = useClientSixKeys(clientId || null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {SIX_KEYS.map((k) => (
          <div key={k.key} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {SIX_KEYS.map((keyDef) => {
        const score = record?.[keyDef.key] ?? null;
        const hasScore = score !== null;

        return (
          <div
            key={keyDef.key}
            className={cn(
              "rounded-lg border p-3 space-y-1.5 transition-colors",
              hasScore
                ? "bg-card border-border"
                : "bg-muted/10 border-border/40"
            )}
          >
            {hasScore ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{keyDef.label}</span>
                  <span className={cn("text-xl font-bold tabular-nums", scoreColor(score))}>
                    {score}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      score >= 70
                        ? "bg-emerald-500"
                        : score >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {keyDef.description}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-16 gap-1.5 text-center">
                <Lock className="w-4 h-4 text-muted-foreground/40" />
                <span className="text-xs font-semibold text-muted-foreground/50">
                  {keyDef.label}
                </span>
                <span className="text-[9px] text-muted-foreground/40">
                  Awaiting assessment
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
