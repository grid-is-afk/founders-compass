import TranscriptInboxPanel from "@/components/integrations/TranscriptInboxPanel";

export default function TranscriptInboxPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Transcript Inbox</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Otter call transcripts that couldn't be auto-matched to a client or prospect by primary email.
          Assign each one to file it into the right Data Room, then attach it to a meeting from the Meetings tab.
        </p>
      </div>
      <TranscriptInboxPanel />
    </div>
  );
}
