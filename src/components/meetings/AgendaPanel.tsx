import { useState } from "react";
import { Sparkles, Edit3, Lock, Download, Info, Loader2, Plus, X, ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  useGenerateAgenda,
  useUpdateMeeting,
  type Meeting,
  type AgendaSection,
  type AgendaItem,
} from "@/hooks/useMeetingsApi";
import { useStakeholders, type Stakeholder, TIER_COLORS, SENTIMENT_CONFIG } from "@/hooks/useStakeholders";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useUserTimezone } from "@/lib/datetime";

interface Props {
  meeting: Meeting;
  clientId: string;
}

// Normalize saved agenda — handles both old string[] and new AgendaItem[] formats
function parseAgenda(raw: string | null): AgendaSection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ title: string; items: Array<string | AgendaItem> }>;
    return parsed.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        typeof item === "string" ? { text: item } : item
      ),
    }));
  } catch {
    return [];
  }
}

export default function AgendaPanel({ meeting, clientId }: Props) {
  const generateAgenda = useGenerateAgenda();
  const updateMeeting = useUpdateMeeting();
  const userTimezone = useUserTimezone();
  const { data: stakeholders = [] } = useStakeholders(clientId);
  const [downloading, setDownloading] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const [sections, setSections] = useState<AgendaSection[]>(() =>
    parseAgenda(meeting.agenda)
  );
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const isFinal = meeting.agenda_status === "final";
  const hasDraft = sections.length > 0;

  async function handleGenerate() {
    const result = await generateAgenda.mutateAsync({ meetingId: meeting.id, clientId });
    setSections(result.sections as AgendaSection[]);
  }

  function handleEditSection(idx: number) {
    setEditingSection(idx);
    setEditValue(sections[idx].items.map((i) => i.text).join("\n"));
  }

  function handleSaveSection(idx: number) {
    const updated = [...sections];
    updated[idx] = {
      ...updated[idx],
      // Preserve source on existing items; strip it when text changes (manual edit)
      items: editValue
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text, i) => ({
          text,
          source: sections[idx].items[i]?.text === text ? sections[idx].items[i]?.source : undefined,
        })),
    };
    setSections(updated);
    setEditingSection(null);
    persistAgenda(updated, meeting.agenda_status === "final" ? "final" : "draft");
  }

  function handleAddItem(sectionIdx: number) {
    const updated = [...sections];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: [...updated[sectionIdx].items, { text: "New item" }],
    };
    setSections(updated);
    setEditingSection(sectionIdx);
    setEditValue(updated[sectionIdx].items.map((i) => i.text).join("\n"));
  }

  function handleRemoveItem(sectionIdx: number, itemIdx: number) {
    const updated = [...sections];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.filter((_, i) => i !== itemIdx),
    };
    setSections(updated);
    persistAgenda(updated, meeting.agenda_status === "final" ? "final" : "draft");
  }

  async function persistAgenda(s: AgendaSection[], status: string) {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      clientId,
      agenda: JSON.stringify(s),
      agenda_status: status,
    });
  }

  async function handleMarkFinal() {
    await persistAgenda(sections, "final");
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await apiFetch(`/meetings/${meeting.id}/agenda.docx`, {
        headers: { "X-User-Timezone": userTimezone },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(body.error || `Server returned ${res.status}`);
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `agenda-${meeting.id}.docx`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Could not download agenda", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Notice */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Agenda generation is currently manual.{" "}
          <span className="italic">Google Calendar integration will enable automatic 24h prep triggers.</span>
        </span>
      </div>

      {/* Generate button */}
      {!hasDraft && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No agenda yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              QB will pull tasks, overdue items, risk alerts, quarterly plan progress, and methodology phase to build a 5-section draft.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generateAgenda.isPending} className="gap-2">
            {generateAgenda.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate Agenda with QB</>
            )}
          </Button>
        </div>
      )}

      {/* Agenda sections */}
      {hasDraft && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isFinal ? "Final Agenda" : "Draft Agenda"}
              </span>
              {isFinal && <Lock className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div className="flex items-center gap-2">
              {isFinal && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setRegenerateConfirmOpen(true)}
                    disabled={generateAgenda.isPending}
                  >
                    {generateAgenda.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    {generateAgenda.isPending ? "Regenerating…" : "Regenerate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {downloading ? "Preparing…" : "Download"}
                  </Button>
                </>
              )}
              {!isFinal && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleGenerate}
                    disabled={generateAgenda.isPending}
                  >
                    {generateAgenda.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generateAgenda.isPending ? "Regenerating…" : "Regenerate"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleMarkFinal}
                    disabled={updateMeeting.isPending}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Mark Final
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    {sIdx + 1}. {section.title}
                  </h4>
                  {!isFinal && editingSection !== sIdx && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-muted-foreground h-6 px-2"
                      onClick={() => handleEditSection(sIdx)}
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </Button>
                  )}
                </div>

                {editingSection === sIdx ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-sm min-h-[80px] font-mono text-xs"
                      placeholder="One item per line..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="text-xs" onClick={() => handleSaveSection(sIdx)}>
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditingSection(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {section.items.map((item, iIdx) => (
                      <AgendaItemRow
                        key={iIdx}
                        item={item}
                        isFinal={isFinal}
                        stakeholders={stakeholders as Stakeholder[]}
                        onRemove={() => handleRemoveItem(sIdx, iIdx)}
                      />
                    ))}
                    {!isFinal && (
                      <li>
                        <button
                          onClick={() => handleAddItem(sIdx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add item
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {isFinal && (
            <p className="text-xs text-muted-foreground italic">
              Agenda is locked. Regenerate to make changes.
            </p>
          )}
        </>
      )}

      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate this agenda?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the locked agenda with a new draft built from the
              latest tasks, risks, and methodology phase. The current locked
              version will be overwritten and you'll need to Mark Final again
              to re-lock and snapshot it to the Data Room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setRegenerateConfirmOpen(false);
                await handleGenerate();
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgendaItemRow — single item with expandable context pack + stakeholder chips
// ---------------------------------------------------------------------------

function AgendaItemRow({
  item,
  isFinal,
  stakeholders,
  onRemove,
}: {
  item: AgendaItem;
  isFinal: boolean;
  stakeholders: Stakeholder[];
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const chipNames = item.stakeholders ?? [];
  const visibleChips = chipNames.slice(0, 2);
  const overflowCount = chipNames.length - visibleChips.length;
  const overflowNames = chipNames.slice(2);

  return (
    <li className="group">
      <div className="flex items-start gap-2 text-sm text-foreground">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Item text + inline chips on sm+, stacked on mobile */}
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline">
            <span>{item.text}</span>

            {chipNames.length > 0 && (
              <TooltipProvider>
                <span className="inline-flex flex-wrap gap-1 sm:ml-1.5 align-middle">
                  {visibleChips.map((name) => {
                    const match = stakeholders.find(
                      (sh) => sh.name.toLowerCase() === name.toLowerCase()
                    );
                    const tierColor = match ? TIER_COLORS[match.tier] : "border-border text-muted-foreground bg-muted";
                    const sentimentLabel = match?.current_sentiment
                      ? SENTIMENT_CONFIG[match.current_sentiment].label
                      : null;
                    const tooltipText = [
                      match?.name ?? name,
                      match?.role,
                      sentimentLabel,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <Tooltip key={name} delayDuration={400}>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium border cursor-default",
                              tierColor
                            )}
                          >
                            {name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{tooltipText}</TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {overflowCount > 0 && (
                    <Tooltip delayDuration={400}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium border border-border text-muted-foreground bg-muted cursor-default">
                          +{overflowCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {overflowNames.join(", ")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </TooltipProvider>
            )}
          </div>

          {/* Context pack toggle */}
          {item.source && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors",
                expanded
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")}
              />
              Context
            </button>
          )}

          {expanded && item.source && (
            <p className="mt-1 text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 border-l-2 border-primary/30">
              {item.source}
            </p>
          )}
        </div>

        {!isFinal && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0 mt-0.5"
            aria-label="Remove item"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
