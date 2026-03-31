import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { QuarterPlan, Quarter } from "@/lib/types/journey";

// ---------------------------------------------------------------------------
// Phase color config
// ---------------------------------------------------------------------------
const phaseColors: Record<string, { stroke: string; bg: string; text: string; bar: string }> = {
  prove:          { stroke: "#5a7a5a", bg: "bg-primary/10",      text: "text-primary",      bar: "bg-primary" },
  protect:        { stroke: "#b8962e", bg: "bg-accent/10",       text: "text-accent",        bar: "bg-accent" },
  grow:           { stroke: "#059669", bg: "bg-emerald-500/10",   text: "text-emerald-600",   bar: "bg-emerald-600" },
  align:          { stroke: "#8a8a7a", bg: "bg-muted",            text: "text-muted-foreground", bar: "bg-muted-foreground" },
  align_quarterly:{ stroke: "#8a8a7a", bg: "bg-muted",            text: "text-muted-foreground", bar: "bg-muted-foreground" },
  diagnose:       { stroke: "#5a7a5a", bg: "bg-primary/10",      text: "text-primary",      bar: "bg-primary" },
  design_tfo:     { stroke: "#b8962e", bg: "bg-accent/10",       text: "text-accent",        bar: "bg-accent" },
  optionality:    { stroke: "#059669", bg: "bg-emerald-500/10",   text: "text-emerald-600",   bar: "bg-emerald-600" },
  align_annual:   { stroke: "#8a8a7a", bg: "bg-muted",            text: "text-muted-foreground", bar: "bg-muted-foreground" },
};

// ---------------------------------------------------------------------------
// SVG Ring — donut chart with 4 arc segments
// ---------------------------------------------------------------------------
interface RingSegment {
  label: string;
  phase: string;
  completion: number; // 0–1
}

const RING_SIZE = 160;
const STROKE_WIDTH = 22;
const R = (RING_SIZE - STROKE_WIDTH) / 2;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP_DEG = 4;
const GAP_FRAC = GAP_DEG / 360;

function polarToXY(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function describeArc(startDeg: number, endDeg: number) {
  const start = polarToXY(startDeg, R);
  const end = polarToXY(endDeg, R);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const RingViz = ({
  segments,
  quarterLabel,
}: {
  segments: RingSegment[];
  quarterLabel: string;
}) => {
  const segCount = segments.length;
  const gapTotal = GAP_FRAC * segCount;
  const segFrac = (1 - gapTotal) / segCount;

  let currentAngle = 0;

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="drop-shadow-sm"
    >
      {/* Background ring */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-muted/30"
      />

      {segments.map((seg, i) => {
        const startDeg = currentAngle * 360;
        const arcFrac = segFrac;
        const filledFrac = arcFrac * seg.completion;
        const endDeg = startDeg + arcFrac * 360;
        const filledEndDeg = startDeg + filledFrac * 360;

        currentAngle += arcFrac + GAP_FRAC;

        const colors = phaseColors[seg.phase] ?? phaseColors.align;

        return (
          <g key={seg.phase + i}>
            {/* Track arc */}
            <path
              d={describeArc(startDeg, endDeg - GAP_DEG / 2)}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="butt"
              opacity={0.15}
            />
            {/* Filled arc */}
            {filledFrac > 0.005 && (
              <path
                d={describeArc(startDeg, filledEndDeg)}
                fill="none"
                stroke={colors.stroke}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="butt"
                opacity={0.95}
              />
            )}
          </g>
        );
      })}

      {/* Center label */}
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-display fill-foreground"
        fontSize="22"
        fontWeight="600"
      >
        {quarterLabel}
      </text>
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground"
        fontSize="9"
        letterSpacing="0.1em"
      >
        ACTIVE
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Phase card strip
// ---------------------------------------------------------------------------
const PhaseCard = ({
  label,
  phase,
  completedTasks,
  totalTasks,
  status,
  onClick,
}: {
  label: string;
  phase: string;
  completedTasks: number;
  totalTasks: number;
  status: string;
  onClick?: () => void;
}) => {
  const colors = phaseColors[phase] ?? phaseColors.align;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border border-border p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm",
        colors.bg
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", colors.text)}>
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {completedTasks}/{totalTasks}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <div className="mt-1.5">
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
            status === "complete"
              ? "bg-emerald-500/10 text-emerald-600"
              : status === "in_progress"
              ? "bg-accent/15 text-accent"
              : "bg-muted text-muted-foreground"
          )}
        >
          {status === "in_progress" ? "In Progress" : status === "not_started" ? "Upcoming" : "Complete"}
        </span>
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface QuarterlyJourneyProps {
  quarterPlans: QuarterPlan[];
  activeQuarter?: number;
  onPhaseClick?: (phase: string) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const QuarterlyJourney = ({
  quarterPlans,
  activeQuarter = 2,
  onPhaseClick,
}: QuarterlyJourneyProps) => {
  const activeIndex = quarterPlans.findIndex(
    (q) => parseInt(q.quarter.replace("Q", "")) === activeQuarter
  );
  const defaultQuarter = activeIndex >= 0 ? quarterPlans[activeIndex].quarter : quarterPlans[0]?.quarter;
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(defaultQuarter as Quarter);

  const plan = quarterPlans.find((q) => q.quarter === selectedQuarter);
  if (!plan) return null;

  const ringSegments: RingSegment[] = plan.phases.map((p) => ({
    label: p.label,
    phase: p.phase,
    completion:
      p.totalTasks > 0 ? p.completedTasks / p.totalTasks : 0,
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      {/* Quarter tab selector */}
      <Tabs
        value={selectedQuarter}
        onValueChange={(v) => setSelectedQuarter(v as Quarter)}
      >
        <TabsList className="w-full grid grid-cols-4 bg-muted/60">
          {quarterPlans.map((qp) => (
            <TabsTrigger
              key={qp.quarter}
              value={qp.quarter}
              className={cn(
                "text-sm font-medium",
                qp.status === "active" && "data-[state=active]:gradient-gold data-[state=active]:text-accent-foreground"
              )}
            >
              <span>{qp.quarter}</span>
              {qp.status === "active" && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Quarter label + review date */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            {plan.quarter} {plan.year}
          </p>
          <p className="text-base font-display font-semibold text-foreground mt-0.5">{plan.label}</p>
        </div>
        {plan.reviewDate && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Review Date</p>
            <p className="text-xs font-medium text-foreground mt-0.5">{plan.reviewDate}</p>
          </div>
        )}
      </div>

      {/* Ring + phase cards */}
      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="flex-shrink-0">
          <RingViz segments={ringSegments} quarterLabel={plan.quarter} />
        </div>

        {/* Phase cards */}
        <div className="flex-1 flex gap-2.5 flex-wrap">
          {plan.phases.map((phase) => (
            <div key={phase.id} className="flex-1 min-w-[110px]">
              <PhaseCard
                label={phase.label}
                phase={phase.phase}
                completedTasks={phase.completedTasks}
                totalTasks={phase.totalTasks}
                status={phase.status}
                onClick={() => onPhaseClick?.(phase.phase)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuarterlyJourney;
