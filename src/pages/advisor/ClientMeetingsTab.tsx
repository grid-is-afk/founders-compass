import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, CalendarDays, Clock, CheckCircle2, FileText } from "lucide-react";
import { useCopilotContext } from "@/components/copilot/CopilotProvider";
import { MeetingRecapDialog } from "@/components/meetings/MeetingRecapDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useClientMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  type Meeting,
} from "@/hooks/useMeetingsApi";
import AgendaPanel from "@/components/meetings/AgendaPanel";
import CapturePanel from "@/components/meetings/CapturePanel";
import StakeholdersPanel from "@/components/stakeholders/StakeholdersPanel";
import { cn } from "@/lib/utils";

interface ClientRecord {
  id: string;
  name: string;
}

interface WorkspaceContext {
  client: ClientRecord;
}

const MEETING_TYPES = [
  "Quarterly Review",
  "Weekly Check-in",
  "Discovery Call",
  "Strategy Session",
  "Ad-hoc",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return new Date(dateStr) >= new Date();
}

function MeetingStatusBadge({ meeting }: { meeting: Meeting }) {
  if (meeting.processed_at) {
    return (
      <Badge variant="outline" className="text-xs border-green-600/40 text-green-700 bg-green-50">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Captured
      </Badge>
    );
  }
  if (meeting.agenda_status === "final") {
    return (
      <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">
        Agenda Ready
      </Badge>
    );
  }
  if (meeting.agenda_status === "draft") {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Draft Agenda
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      {meeting.status === "scheduled" ? "Scheduled" : meeting.status}
    </Badge>
  );
}

interface NewMeetingForm {
  type: string;
  date: string;
  notes: string;
}

export default function ClientMeetingsTab() {
  const { client } = useOutletContext<WorkspaceContext>();
  const { data: meetings = [], isLoading } = useClientMeetings(client.id);
  const createMeeting = useCreateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const { sendMessage, setIsOpen } = useCopilotContext();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [recapDialogOpen, setRecapDialogOpen] = useState(false);
  const [form, setForm] = useState<NewMeetingForm>({ type: "", date: "", notes: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"agenda" | "capture" | null>(null);

  const upcoming = (meetings as Meeting[]).filter((m) => isUpcoming(m.date));
  const past = (meetings as Meeting[]).filter((m) => !isUpcoming(m.date));

  function handleGenerateRecap(scope: string, selectedIds: string[]) {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    let targetMeetings: Meeting[];
    if (scope === "selected") {
      targetMeetings = past.filter((m) => selectedIds.includes(m.id));
    } else if (scope === "last_week") {
      targetMeetings = past.filter((m) => now - new Date(m.date ?? 0).getTime() <= oneWeek);
    } else if (scope === "last_month") {
      targetMeetings = past.filter((m) => now - new Date(m.date ?? 0).getTime() <= oneMonth);
    } else {
      targetMeetings = past;
    }

    const meetingList = targetMeetings
      .map((m) => `- ${m.type ?? "Meeting"} on ${m.date ? new Date(m.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "unknown date"}`)
      .join("\n");

    const scopeLabel = scope === "all"
      ? "all meetings"
      : scope === "last_week"
      ? "meetings from the past week"
      : scope === "last_month"
      ? "meetings from the past month"
      : `the following ${targetMeetings.length} meeting(s)`;

    setIsOpen(true);
    sendMessage(
      `Generate a meeting recap for ${client.name} covering ${scopeLabel}. Save it to the "Meeting Recaps" folder.\n\nMeetings to cover:\n${meetingList}\n\nFor each meeting include: key decisions made, action items with owners, open questions, and blockers. End with a forward-looking summary of what's coming next.`
    );
  }

  function handleExpand(id: string, section: "agenda" | "capture") {
    if (expandedId === id && expandedSection === section) {
      setExpandedId(null);
      setExpandedSection(null);
    } else {
      setExpandedId(id);
      setExpandedSection(section);
    }
  }

  async function handleCreate() {
    if (!form.type && !form.date) return;
    await createMeeting.mutateAsync({
      client_id: client.id,
      type: form.type || null,
      date: form.date || null,
      notes: form.notes || null,
      status: "scheduled",
    });
    setForm({ type: "", date: "", notes: "" });
    setShowNewDialog(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Loading meetings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Meetings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate agendas and capture notes for client meetings.
          </p>
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </Button>
      </div>

      {/* Upcoming */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Upcoming ({upcoming.length})
        </h3>

        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No upcoming meetings. Schedule one to generate a pre-meeting agenda.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                clientId={client.id}
                isExpanded={expandedId === meeting.id}
                expandedSection={expandedId === meeting.id ? expandedSection : null}
                onToggleSection={(section) => handleExpand(meeting.id, section)}
                onDelete={() =>
                  deleteMeeting.mutate({ id: meeting.id, clientId: client.id })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Past ({past.length})
            </h3>
            <button
              onClick={() => setRecapDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Recap
            </button>
          </div>
          <div className="space-y-3">
            {past.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                clientId={client.id}
                isExpanded={expandedId === meeting.id}
                expandedSection={expandedId === meeting.id ? expandedSection : null}
                onToggleSection={(section) => handleExpand(meeting.id, section)}
                onDelete={() =>
                  deleteMeeting.mutate({ id: meeting.id, clientId: client.id })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Stakeholders */}
      <section className="border-t border-border pt-6">
        <StakeholdersPanel clientId={client.id} />
      </section>

      {/* Meeting Recap Dialog */}
      <MeetingRecapDialog
        open={recapDialogOpen}
        onOpenChange={setRecapDialogOpen}
        meetings={past}
        clientName={client.name}
        onGenerate={handleGenerateRecap}
      />

      {/* New Meeting Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Meeting Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Pre-meeting notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMeeting.isPending || (!form.type && !form.date)}
            >
              {createMeeting.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MeetingCard
// ---------------------------------------------------------------------------

interface MeetingCardProps {
  meeting: Meeting;
  clientId: string;
  isExpanded: boolean;
  expandedSection: "agenda" | "capture" | null;
  onToggleSection: (section: "agenda" | "capture") => void;
  onDelete: () => void;
}

function MeetingCard({
  meeting,
  clientId,
  isExpanded,
  expandedSection,
  onToggleSection,
  onDelete,
}: MeetingCardProps) {
  const upcoming = isUpcoming(meeting.date);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        isExpanded && "ring-1 ring-primary/20"
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {meeting.type ?? "Meeting"}
            </span>
            <MeetingStatusBadge meeting={meeting} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(meeting.date)}
            {meeting.transcript_name && (
              <span className="ml-2 text-primary/80">
                · Transcript: {meeting.transcript_name}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Agenda button — for upcoming meetings */}
          {upcoming && (
            <Button
              variant={expandedSection === "agenda" && isExpanded ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onToggleSection("agenda")}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {meeting.agenda_status === "none" ? "Generate Agenda" : "View Agenda"}
            </Button>
          )}

          {/* Capture button — for past meetings */}
          {!upcoming && (
            <Button
              variant={expandedSection === "capture" && isExpanded ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onToggleSection("capture")}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {meeting.processed_at ? "View Capture" : "Capture Notes"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Expanded panels */}
      {isExpanded && expandedSection === "agenda" && (
        <div className="border-t border-border">
          <AgendaPanel meeting={meeting} clientId={clientId} />
        </div>
      )}
      {isExpanded && expandedSection === "capture" && (
        <div className="border-t border-border">
          <CapturePanel meeting={meeting} clientId={clientId} />
        </div>
      )}
    </div>
  );
}
