import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MessagesSquare,
  RefreshCw,
  Mail,
  Video,
  Phone,
  Users,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import {
  useClientDigests,
  useGenerateDigest,
  type CommChannel,
  type CommDigest,
  type DigestSentiment,
  type DigestTopic,
  type GenerateDigestInput,
} from "@/hooks/useCommDigest";

// ----- channel + sentiment display config (brand tokens) ----------------------

const CHANNEL_META: Record<
  CommChannel,
  { label: string; icon: typeof Mail; chip: string }
> = {
  meeting: { label: "Meeting", icon: Users, chip: "bg-primary/10 text-primary border-primary/20" },
  gmail: { label: "Email", icon: Mail, chip: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
  zoom: { label: "Zoom", icon: Video, chip: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  whatsapp: { label: "WhatsApp", icon: Phone, chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
};

const SENTIMENT_META: Record<DigestSentiment, { label: string; chip: string }> = {
  positive: { label: "Positive", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  neutral: { label: "Neutral", chip: "bg-muted text-muted-foreground border-border" },
  negative: { label: "Needs attention", chip: "bg-destructive/10 text-destructive border-destructive/20" },
  mixed: { label: "Mixed", chip: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
};

// ----- date-range presets -----------------------------------------------------

type RangeKey = "week" | "month" | "quarter";
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "week", label: "Last week", days: 7 },
  { key: "month", label: "Last month", days: 30 },
  { key: "quarter", label: "Last 90 days", days: 90 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Map a preset to the generate payload. 'week' uses the server's range shortcut. */
function rangePayload(key: RangeKey): GenerateDigestInput {
  if (key === "week") return { range: "week" };
  const days = RANGES.find((r) => r.key === key)!.days;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return { periodStart: toDateStr(start), periodEnd: toDateStr(end) };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ----- presentational pieces ---------------------------------------------------

function TopicCard({ topic }: { topic: DigestTopic }) {
  const sentiment = SENTIMENT_META[topic.sentiment] ?? SENTIMENT_META.neutral;
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-foreground leading-snug">{topic.topic}</h3>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0",
            sentiment.chip
          )}
        >
          {sentiment.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{topic.summary}</p>
      {topic.channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topic.channels.map((ch) => {
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            return (
              <span
                key={ch}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                  meta.chip
                )}
              >
                <Icon className="w-3 h-3" />
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----- page --------------------------------------------------------------------

export default function CommunicationsDigest() {
  const { user } = useAuth();

  // TFO-only — the client role never reaches this view (server also enforces 403).
  if (user?.role === "client") {
    return <Navigate to="/client" replace />;
  }

  const { data: clients = [] } = useClients() as { data: { id: string; name: string }[] };
  const [clientId, setClientId] = useState<string>("");
  const [range, setRange] = useState<RangeKey>("month");

  const { data: digests = [], isLoading } = useClientDigests(clientId || null);
  const generate = useGenerateDigest(clientId || null);

  const latest: CommDigest | undefined = digests[0];
  const pendingChannels = useMemo(() => generate.data?.channelsPending ?? [], [generate.data]);

  async function handleGenerate() {
    if (!clientId) {
      toast.info("Select a client first.");
      return;
    }
    try {
      const result = await generate.mutateAsync(rangePayload(range));
      const n = result.digest.topics.length;
      if (result.digest.event_count === 0) {
        toast.info("No communications found in this period.");
      } else {
        toast.success(`Digest generated — ${n} topic${n !== 1 ? "s" : ""} from ${result.digest.event_count} communication${result.digest.event_count !== 1 ? "s" : ""}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Digest generation failed.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Communications Digest</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All of a client's communications, synthesized by topic across every channel
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generate.isPending || !clientId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn("w-4 h-4", generate.isPending && "animate-spin")} />
          {generate.isPending ? "Generating..." : "Generate digest"}
        </button>
      </div>

      {/* Controls: client + date range */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border border-input overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending-channel notice — sets expectations while integrations are blocked */}
      {pendingChannels.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Inbox className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Synthesizing from connected channels only. Not yet connected:{" "}
            {pendingChannels.map((c) => CHANNEL_META[c]?.label ?? c).join(", ")}.
          </span>
        </div>
      )}

      {/* Body */}
      {!clientId ? (
        <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center">
          <MessagesSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Select a client to begin</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Choose a client and a time window, then generate a topic-organized digest of their communications.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-card rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          Loading digests…
        </div>
      ) : !latest ? (
        <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center">
          <MessagesSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No digest yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Generate a digest to synthesize this client's communications into topics — decisions, risks,
            and commitments grouped across channels.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Digest meta strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Period: <span className="text-foreground">{formatDate(latest.period_start)} – {formatDate(latest.period_end)}</span>
            </span>
            <span>
              {latest.event_count} communication{latest.event_count !== 1 ? "s" : ""}
            </span>
            <span>Generated {formatDate(latest.generated_at)}</span>
            {digests.length > 1 && <span>{digests.length} digests on record</span>}
          </div>

          {latest.topics.length === 0 ? (
            <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium text-foreground">No communications in this period</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try a wider time window, or check that meetings have captured notes.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {latest.topics.map((topic, i) => (
                <TopicCard key={`${topic.topic}-${i}`} topic={topic} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
