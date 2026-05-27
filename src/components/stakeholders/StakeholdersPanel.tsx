import { useState } from "react";
import { Plus, Users, Pencil, Trash2, Mail, Briefcase, ChevronDown, Loader2, MessageSquarePlus, NotebookPen } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  useStakeholders,
  useCreateStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  useStakeholderSignals,
  useCreateStakeholderSignal,
  useUpdateStakeholderSentiment,
  SENTIMENT_CONFIG,
  TIER_COLORS,
  type Stakeholder,
  type Sentiment,
} from "@/hooks/useStakeholders";
import SignalTimelineItem from "@/components/stakeholders/SignalTimelineItem";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
}

const SENTIMENT_CYCLE: Array<Sentiment | null> = [
  null, "positive", "neutral", "negative", "at_risk",
];

// ---------------------------------------------------------------------------
// Tier labels (colors come from the shared TIER_COLORS token in the hook)
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<Stakeholder["tier"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  peripheral: "Peripheral",
};

// ---------------------------------------------------------------------------
// StakeholderForm
// ---------------------------------------------------------------------------

interface StakeholderForm {
  name: string;
  role: string;
  email: string;
  notes: string;
  tier: Stakeholder["tier"];
}

const EMPTY_FORM: StakeholderForm = {
  name: "",
  role: "",
  email: "",
  notes: "",
  tier: "primary",
};

// ---------------------------------------------------------------------------
// StakeholdersPanel (root)
// ---------------------------------------------------------------------------

export default function StakeholdersPanel({ clientId }: Props) {
  const { data: stakeholders = [], isLoading } = useStakeholders(clientId);
  const create = useCreateStakeholder();
  const update = useUpdateStakeholder();
  const remove = useDeleteStakeholder();

  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState<StakeholderForm>(EMPTY_FORM);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(s: Stakeholder) {
    setEditTarget(s);
    setForm({
      name: s.name,
      role: s.role ?? "",
      email: s.email ?? "",
      notes: s.notes ?? "",
      tier: s.tier,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    if (editTarget) {
      await update.mutateAsync({
        id: editTarget.id,
        clientId,
        name: form.name,
        role: form.role || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
        tier: form.tier,
      });
    } else {
      await create.mutateAsync({
        client_id: clientId,
        name: form.name,
        role: form.role || null,
        email: form.email || null,
        notes: form.notes || null,
        tier: form.tier,
      });
    }

    setShowDialog(false);
    setForm(EMPTY_FORM);
    setEditTarget(null);
  }

  const grouped = {
    primary: (stakeholders as Stakeholder[]).filter((s) => s.tier === "primary"),
    secondary: (stakeholders as Stakeholder[]).filter((s) => s.tier === "secondary"),
    peripheral: (stakeholders as Stakeholder[]).filter((s) => s.tier === "peripheral"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        Loading stakeholders...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Key Stakeholders
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            People involved in this engagement. QB references these in agendas and responses.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          Add Person
        </Button>
      </div>

      {(stakeholders as Stakeholder[]).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No stakeholders yet. Add key contacts and QB will reference them in meeting agendas and responses.
        </div>
      ) : (
        <div className="space-y-4">
          {(["primary", "secondary", "peripheral"] as const).map((tier) => {
            if (grouped[tier].length === 0) return null;
            return (
              <div key={tier}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {TIER_LABELS[tier]}
                </p>
                <div className="grid gap-2">
                  {grouped[tier].map((s) => (
                    <StakeholderCard
                      key={s.id}
                      stakeholder={s}
                      clientId={clientId}
                      onEdit={() => openEdit(s)}
                      onDelete={() => remove.mutate({ id: s.id, clientId })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Stakeholder" : "Add Stakeholder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role / Title</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="CEO, CFO, Legal..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(v) => setForm((f) => ({ ...f, tier: v as Stakeholder["tier"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="peripheral">Peripheral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Communication preferences, topics they care about, context..."
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StakeholderCard
// ---------------------------------------------------------------------------

interface CardProps {
  stakeholder: Stakeholder;
  clientId: string;
  onEdit: () => void;
  onDelete: () => void;
}

function StakeholderCard({ stakeholder: s, clientId, onEdit, onDelete }: CardProps) {
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  // Live-announce sentiment changes for screen readers
  const [sentimentAnnouncement, setSentimentAnnouncement] = useState("");

  const updateSentiment = useUpdateStakeholderSentiment();

  const { data: signals = [], isLoading: signalsLoading, isError: signalsError } =
    useStakeholderSignals(s.id, { limit: 6, enabled: signalsOpen });

  async function cycleSentiment() {
    const current = s.current_sentiment ?? null;
    const idx = SENTIMENT_CYCLE.indexOf(current);
    const next = SENTIMENT_CYCLE[(idx + 1) % SENTIMENT_CYCLE.length];
    try {
      await updateSentiment.mutateAsync({
        id: s.id,
        clientId,
        stakeholderId: s.id,
        sentiment: next,
      });
      const label = next ? SENTIMENT_CONFIG[next].label : "not set";
      setSentimentAnnouncement(`Sentiment updated to ${label}`);
    } catch {
      toast.error("Could not update sentiment — please try again");
    }
  }

  const sentimentValue = s.current_sentiment ?? null;
  const sentimentCfg = sentimentValue ? SENTIMENT_CONFIG[sentimentValue] : null;

  // Count badge color when signals contain at_risk
  const hasAtRisk = signals.some((sig) => sig.sentiment === "at_risk");
  const visibleSignals = signals.slice(0, 5);
  const signalCount = signals.length;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
        {s.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name row: name + tier badge + sentiment pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{s.name}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TIER_COLORS[s.tier])}>
            {TIER_LABELS[s.tier]}
          </Badge>

          {/* Sentiment pill — cycles through states on click */}
          <SentimentPill
            value={sentimentValue}
            config={sentimentCfg}
            isLoading={updateSentiment.isPending}
            onCycle={cycleSentiment}
            stakeholderName={s.name}
          />
        </div>

        {/* Live region for screen reader announcements */}
        <span aria-live="polite" className="sr-only">{sentimentAnnouncement}</span>

        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {s.role && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {s.role}
            </span>
          )}
          {s.email && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {s.email}
            </span>
          )}
        </div>

        {s.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.notes}</p>
        )}

        {/* ── Signals section ── */}
        <Collapsible open={signalsOpen} onOpenChange={setSignalsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1.5"
              aria-expanded={signalsOpen}
              aria-controls={`signals-${s.id}`}
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  signalsOpen && "rotate-180"
                )}
              />
              {signalCount > 0 ? (
                <>
                  Signals
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0 text-[10px] font-semibold",
                      hasAtRisk
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {signalCount}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Signals</span>
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div
              id={`signals-${s.id}`}
              role="region"
              aria-label={`Signals for ${s.name}`}
              className="bg-muted/30 rounded-md px-2 py-2 mt-1 space-y-1.5 border border-border/60"
            >
              {signalsLoading && (
                <div className="space-y-2 py-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-3 bg-muted rounded animate-pulse w-full" />
                  ))}
                </div>
              )}

              {signalsError && !signalsLoading && (
                <p className="text-xs text-destructive">Could not load signals.</p>
              )}

              {!signalsLoading && !signalsError && signals.length === 0 && (
                <div className="flex flex-col items-center py-3 gap-1">
                  <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground italic text-center">
                    No signals yet — log your first observation.
                  </p>
                </div>
              )}

              {!signalsLoading && !signalsError && visibleSignals.map((signal) => (
                <SignalTimelineItem
                  key={signal.id}
                  signal={signal}
                />
              ))}

              {signalCount > 5 && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Showing 5 of {signalCount} signals
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Log observation CTA — always visible below signals trigger */}
        <button
          onClick={() => setLogDialogOpen(true)}
          className="flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary transition-colors mt-1"
          aria-label={`Log observation for ${s.name}`}
        >
          <Plus className="w-3 h-3" />
          Log observation
        </button>
      </div>

      {/* Actions — visible on group hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit stakeholder"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete stakeholder"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log observation dialog */}
      <LogObservationDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        stakeholder={s}
        clientId={clientId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SentimentPill — interactive cycling button per Surface 1
// ---------------------------------------------------------------------------

interface SentimentPillProps {
  value: Sentiment | null;
  config: (typeof SENTIMENT_CONFIG)[Sentiment] | null;
  isLoading: boolean;
  onCycle: () => void;
  stakeholderName: string;
}

function SentimentPill({ value, config, isLoading, onCycle, stakeholderName }: SentimentPillProps) {
  const ariaLabel = value
    ? `Sentiment: ${config?.label ?? value}. Click to cycle.`
    : `Not set. Click to set sentiment for ${stakeholderName}.`;

  const tooltipText = value
    ? `Click to update — current: ${config?.label ?? value}`
    : "Click to set sentiment";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {/* Outer wrapper ensures 44×44 touch target; pill is visually compact inside */}
          <span className="inline-flex min-w-[44px] min-h-[44px] items-center justify-center">
            <motion.button
              onClick={onCycle}
              disabled={isLoading}
              aria-label={ariaLabel}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "inline-flex items-center rounded-full text-[10px] px-1.5 py-0 border font-medium cursor-pointer transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                isLoading && "pointer-events-none opacity-60",
                value && config
                  ? config.container
                  : "border-dashed border-border text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              ) : value && config ? (
                <>
                  <span className={cn("w-1.5 h-1.5 rounded-full inline-block mr-1 flex-shrink-0", config.dot)} />
                  {config.label}
                </>
              ) : (
                <span>Set sentiment</span>
              )}
            </motion.button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// LogObservationDialog — Surface 4
// ---------------------------------------------------------------------------

interface LogObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholder: Stakeholder;
  clientId: string;
}

function LogObservationDialog({
  open,
  onOpenChange,
  stakeholder,
  clientId,
}: LogObservationDialogProps) {
  const [text, setText] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const createSignal = useCreateStakeholderSignal();
  const updateSentiment = useUpdateStakeholderSentiment();

  function handleClose() {
    setText("");
    setSelectedSentiment(null);
    onOpenChange(false);
  }

  async function handleSave() {
    if (!text.trim()) return;

    try {
      // Fire the observation note and an optional sentiment update as separate calls.
      // Writing them independently keeps signal_type='manual_note' for the note
      // and lets the backend own the sentiment history row (via PATCH /stakeholders/:id).
      if (selectedSentiment) {
        await Promise.all([
          createSignal.mutateAsync({
            stakeholderId: stakeholder.id,
            clientId,
            signal_type: "manual_note",
            value: text.trim(),
          }),
          updateSentiment.mutateAsync({
            id: stakeholder.id,
            clientId,
            stakeholderId: stakeholder.id,
            sentiment: selectedSentiment,
          }),
        ]);
      } else {
        await createSignal.mutateAsync({
          stakeholderId: stakeholder.id,
          clientId,
          signal_type: "manual_note",
          value: text.trim(),
        });
      }

      toast.success("Observation logged", { duration: 2000 });
      handleClose();
    } catch {
      toast.error("Could not save — please try again");
    }
  }

  const isSaving = createSignal.isPending || updateSentiment.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Log Observation for {stakeholder.name}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Your private note — QB uses this to track relationship health.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Observation *</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Seemed distracted during the Q3 discussion, may need a follow-up one-on-one."
              className="text-sm min-h-[80px] resize-none"
              disabled={isSaving}
            />
          </div>

          {/* Sentiment selector — visual pills, not radios */}
          <div role="radiogroup" aria-label="Update sentiment (optional)">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Update sentiment?{" "}
              <span className="font-normal">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SENTIMENT_CONFIG) as Sentiment[]).map((s) => {
                const cfg = SENTIMENT_CONFIG[s];
                const isSelected = selectedSentiment === s;
                return (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedSentiment(isSelected ? null : s)}
                    disabled={isSaving}
                    className={cn(
                      "inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 border font-medium cursor-pointer transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                      isSelected
                        ? cfg.container
                        : "border-border text-muted-foreground hover:border-border hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full inline-block mr-1 flex-shrink-0",
                        isSelected ? cfg.dot : "bg-muted-foreground/40"
                      )}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!text.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                <NotebookPen className="w-3.5 h-3.5 mr-1" />
                Save Observation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
