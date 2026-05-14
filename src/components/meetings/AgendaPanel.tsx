import { useState } from "react";
import { Sparkles, Edit3, Lock, Download, Info, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateAgenda, useUpdateMeeting, type Meeting, type AgendaSection } from "@/hooks/useMeetingsApi";
import { cn } from "@/lib/utils";

interface Props {
  meeting: Meeting;
  clientId: string;
}

function parseAgenda(raw: string | null): AgendaSection[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AgendaSection[];
  } catch {
    return [];
  }
}

export default function AgendaPanel({ meeting, clientId }: Props) {
  const generateAgenda = useGenerateAgenda();
  const updateMeeting = useUpdateMeeting();

  const [sections, setSections] = useState<AgendaSection[]>(() =>
    parseAgenda(meeting.agenda)
  );
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const isFinal = meeting.agenda_status === "final";
  const hasDraft = sections.length > 0;

  async function handleGenerate() {
    const result = await generateAgenda.mutateAsync({
      meetingId: meeting.id,
      clientId,
    });
    setSections(result.sections as AgendaSection[]);
  }

  function handleEditSection(idx: number) {
    setEditingSection(idx);
    setEditValue(sections[idx].items.join("\n"));
  }

  function handleSaveSection(idx: number) {
    const updated = [...sections];
    updated[idx] = {
      ...updated[idx],
      items: editValue
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
    setSections(updated);
    setEditingSection(null);
    persistAgenda(updated, meeting.agenda_status === "final" ? "final" : "draft");
  }

  function handleAddItem(sectionIdx: number) {
    const updated = [...sections];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: [...updated[sectionIdx].items, "New item"],
    };
    setSections(updated);
    setEditingSection(sectionIdx);
    setEditValue(updated[sectionIdx].items.join("\n"));
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

  function handleDownload() {
    const lines: string[] = [`Meeting Agenda — ${meeting.type ?? "Meeting"}`, ""];
    for (const section of sections) {
      lines.push(`## ${section.title}`);
      for (const item of section.items) {
        lines.push(`• ${item}`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-${meeting.type?.replace(/\s+/g, "-").toLowerCase() ?? "meeting"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
              QB will pull tasks, overdue items, risk alerts, and prior notes to build a draft.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateAgenda.isPending}
            className="gap-2"
          >
            {generateAgenda.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Agenda with QB
              </>
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
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
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
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerate
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
                  <ul className="space-y-1">
                    {section.items.map((item, iIdx) => (
                      <li
                        key={iIdx}
                        className={cn(
                          "flex items-start gap-2 text-sm text-foreground group",
                        )}
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="flex-1">{item}</span>
                        {!isFinal && (
                          <button
                            onClick={() => handleRemoveItem(sIdx, iIdx)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            aria-label="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
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
              Agenda is locked. To make changes, contact the advisor.
            </p>
          )}
        </>
      )}
    </div>
  );
}
