import { useState } from "react";
import { Plus, Users, Pencil, Trash2, Mail, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useStakeholders,
  useCreateStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  type Stakeholder,
} from "@/hooks/useStakeholders";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
}

const TIER_LABELS: Record<Stakeholder["tier"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  peripheral: "Peripheral",
};

const TIER_COLORS: Record<Stakeholder["tier"], string> = {
  primary: "border-primary/30 text-primary bg-primary/5",
  secondary: "border-amber-500/30 text-amber-700 bg-amber-50",
  peripheral: "text-muted-foreground border-border",
};

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
  onEdit: () => void;
  onDelete: () => void;
}

function StakeholderCard({ stakeholder: s, onEdit, onDelete }: CardProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
        {s.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{s.name}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TIER_COLORS[s.tier])}>
            {TIER_LABELS[s.tier]}
          </Badge>
        </div>
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
      </div>

      {/* Actions */}
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
    </div>
  );
}
