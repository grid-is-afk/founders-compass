import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCategoryLabel, computeScoredPercentage, getScoreTextColor } from "@/lib/assessmentUtils";
import FactorScoreBadge from "./FactorScoreBadge";
import ValueFactorPill from "./ValueFactorPill";
import { ScoredRating, QualitativeRating } from "@/lib/types/assessments";

// A generic factor that can represent any assessment type
export interface DisplayFactor {
  id: string;
  name: string;
  category?: string;
  score?: ScoredRating;
  rating?: QualitativeRating;
  considerations: string;
}

interface AssessmentFactorTableProps {
  factors: DisplayFactor[];
  mode: "scored" | "qualitative";
  /** If true, renders all factors in a single flat list (no accordion groups) */
  flat?: boolean;
}

const AssessmentFactorTable = ({ factors, mode, flat }: AssessmentFactorTableProps) => {
  if (flat) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[38%]">
                Factor
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[22%]">
                {mode === "scored" ? "Score" : "Rating"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Advisory Considerations
              </th>
            </tr>
          </thead>
          <tbody>
            {factors.map((factor, i) => (
              <FactorRow key={factor.id} factor={factor} mode={mode} isLast={i === factors.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Group by category
  const grouped = new Map<string, DisplayFactor[]>();
  for (const f of factors) {
    const cat = f.category ?? "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(f);
  }

  const defaultOpen = Array.from(grouped.keys());

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
      {Array.from(grouped.entries()).map(([category, catFactors]) => {
        const avgScore =
          mode === "scored" && catFactors.every((f) => f.score !== undefined)
            ? computeScoredPercentage(
                catFactors.map((f) => ({ score: f.score as ScoredRating }))
              )
            : null;

        const positiveCount =
          mode === "qualitative"
            ? catFactors.filter((f) => f.rating === "positive").length
            : null;

        const textColor = avgScore !== null ? getScoreTextColor(avgScore) : "";

        return (
          <AccordionItem
            key={category}
            value={category}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1 mr-2">
                <span className="text-sm font-display font-semibold text-foreground">
                  {getCategoryLabel(category)}
                </span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {catFactors.length} factor{catFactors.length !== 1 ? "s" : ""}
                </span>
                {avgScore !== null && (
                  <span className={cn("text-xs font-semibold ml-auto mr-2", textColor)}>
                    {avgScore}%
                  </span>
                )}
                {positiveCount !== null && (
                  <span className="text-xs font-semibold text-primary ml-auto mr-2">
                    {positiveCount}/{catFactors.length} positive
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-[36%]">
                      Factor
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-[22%]">
                      {mode === "scored" ? "Score" : "Rating"}
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      Advisory Considerations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catFactors.map((factor, i) => (
                    <FactorRow
                      key={factor.id}
                      factor={factor}
                      mode={mode}
                      isLast={i === catFactors.length - 1}
                    />
                  ))}
                </tbody>
              </table>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

interface FactorRowProps {
  factor: DisplayFactor;
  mode: "scored" | "qualitative";
  isLast: boolean;
}

const FactorRow = ({ factor, mode, isLast }: FactorRowProps) => (
  <tr className={cn("align-top", !isLast && "border-b border-border")}>
    <td className="px-4 py-3">
      <span className="text-sm font-medium text-foreground">{factor.name}</span>
    </td>
    <td className="px-4 py-3">
      {mode === "scored" && factor.score !== undefined ? (
        <FactorScoreBadge score={factor.score} />
      ) : mode === "qualitative" && factor.rating !== undefined ? (
        <ValueFactorPill rating={factor.rating} />
      ) : null}
    </td>
    <td className="px-4 py-3">
      <p className="text-xs text-muted-foreground leading-relaxed">{factor.considerations}</p>
    </td>
  </tr>
);

export default AssessmentFactorTable;
