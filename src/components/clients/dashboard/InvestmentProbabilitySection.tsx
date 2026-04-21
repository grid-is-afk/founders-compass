import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { BarChart3, Loader2, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useClientIpdMetrics, type IpdAxisPoint } from "@/hooks/useClientIpdMetrics";
import { useAnalyzeDataRoom } from "@/hooks/useAnalyzeDataRoom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvestmentProbabilitySectionProps {
  clientId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RadarPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
        {label}
      </p>
      <div className="w-full aspect-square max-w-[180px] border-2 border-dashed border-border/40 rounded-full flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
      </div>
    </div>
  );
}

function IpdRadarChart({ axes, label }: { axes: IpdAxisPoint[]; label: string }) {
  const data = axes.map((a) => ({ subject: a.axis, value: a.value }));
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
        {label}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          />
          <Radar
            name={label}
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LastAnalyzed({ timestamp }: { timestamp: string | null }) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " at "
    + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
      <Clock className="w-3 h-3" />
      Last analyzed {formatted}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InvestmentProbabilitySection({ clientId }: InvestmentProbabilitySectionProps) {
  const { data: record, isLoading } = useClientIpdMetrics(clientId || null);
  const { mutate, isPending, progress } = useAnalyzeDataRoom(clientId);

  function handleAnalyze() {
    mutate({
      onSuccess: (result) => {
        const sections = result.updated.length > 0 ? result.updated.join(", ") : "dashboard";
        toast("Dashboard updated from Data Room", {
          description: `Updated: ${sections} (${result.documentsAnalyzed}/${result.totalDocuments} docs analyzed)`,
        });
      },
      onError: (msg) => toast(msg),
    });
  }

  function progressLabel(): string {
    if (!progress) return "Reading all documents…";
    if (progress.stage === "synthesizing") return "Synthesizing results…";
    if (progress.stage === "analyzing") return `Analyzing batch…`;
    if (progress.fileName)
      return `Reading file ${progress.current} of ${progress.total}: ${progress.fileName}`;
    return "Starting…";
  }

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted/30 animate-pulse" />;
  }

  const hasData = record && record.generated_from_data_room;

  if (!hasData) {
    return (
      <div className="space-y-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Investment Probability Dashboard
        </span>

        <div className="rounded-lg border border-dashed border-border/60 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <RadarPlaceholder label="Persuasiveness of Problem" />
            <RadarPlaceholder label="Confidence in Solution" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Upload financial statements, contracts, and business documents to the Data Room, then click Analyze with QB.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button
              size="sm"
              className="gap-2 max-w-sm"
              onClick={handleAnalyze}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Zap className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">
                {isPending ? progressLabel() : "Analyze with QB"}
              </span>
            </Button>
            <LastAnalyzed timestamp={record?.last_generated_at ?? null} />
          </div>
        </div>
      </div>
    );
  }

  const combinedIndex = record.combined_index ? parseFloat(record.combined_index) : null;
  const label = record.probability_label ?? "—";

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Investment Probability Dashboard
      </span>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {record.problem_axes && record.problem_axes.length > 0 ? (
            <IpdRadarChart axes={record.problem_axes} label="Persuasiveness of Problem" />
          ) : (
            <RadarPlaceholder label="Persuasiveness of Problem" />
          )}
          {record.solution_axes && record.solution_axes.length > 0 ? (
            <IpdRadarChart axes={record.solution_axes} label="Confidence in Solution" />
          ) : (
            <RadarPlaceholder label="Confidence in Solution" />
          )}
        </div>

        {combinedIndex !== null && (
          <div className="rounded-lg bg-muted/30 border border-border p-3 text-center space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Combined Index
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {combinedIndex.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        )}
        <LastAnalyzed timestamp={record.last_generated_at} />
      </div>
    </div>
  );
}
