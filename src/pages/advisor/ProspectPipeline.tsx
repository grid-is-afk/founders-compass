import { useState } from "react";
import { motion } from "framer-motion";
import { useProspects, useCreateProspect, useUpdateProspect } from "@/hooks/useProspects";
import ProspectCard from "@/components/dashboard/ProspectCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar, TrendingUp, Users, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import type { ProspectStatus } from "@/lib/types/journey";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

interface Column {
  id: string;
  label: string;
  statuses: string[];
  accent: string;
}

const columns: Column[] = [
  {
    id: "intake",
    label: "Intake",
    statuses: ["intake", "new"],
    accent: "bg-muted text-muted-foreground",
  },
  {
    id: "discovery",
    label: "Discovery",
    statuses: ["discovery_scheduled", "discovery_complete"],
    accent: "bg-blue-500/10 text-blue-700",
  },
  {
    id: "fit_assessment",
    label: "Fit Assessment",
    statuses: ["fit_assessment", "not_fit", "fit"],
    accent: "bg-accent/10 text-accent",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    statuses: ["onboarding"],
    accent: "bg-emerald-500/10 text-emerald-700",
  },
];

const statusLabel: Record<string, string> = {
  intake: "Intake",
  new: "Intake",
  discovery_scheduled: "Discovery Scheduled",
  discovery_complete: "Discovery Complete",
  fit_assessment: "Fit Assessment",
  not_fit: "Not a Fit",
  fit: "Fit",
  onboarding: "Onboarding",
};

// Map a DB prospect row to the shape ProspectCard expects
function toProspectShape(row: any) {
  return {
    id: String(row.id),
    name: row.name,
    contact: row.contact ?? "—",
    company: row.company ?? "—",
    revenue: row.revenue ?? "—",
    source: row.source ?? "—",
    status: (row.status ?? "intake") as ProspectStatus,
    fitScore: row.fit_score ?? undefined,
    fitDecision: row.fit_decision ?? undefined,
    notes: row.notes ?? undefined,
    date: row.date
      ? new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
  };
}

// Pipeline flow: intake → discovery_scheduled → discovery_complete → fit_assessment → fit/not_fit → onboarding
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  intake: { status: "discovery_scheduled", label: "Schedule Discovery" },
  discovery_scheduled: { status: "discovery_complete", label: "Complete Discovery" },
  discovery_complete: { status: "fit_assessment", label: "Begin Fit Assessment" },
  fit_assessment: { status: "fit", label: "Mark as Fit" },
  fit: { status: "onboarding", label: "Begin Onboarding" },
};

const ProspectDetailDialog = ({
  prospect,
  onClose,
  onAdvance,
  onMarkNotFit,
  isPending,
}: {
  prospect: ReturnType<typeof toProspectShape> | null;
  onClose: () => void;
  onAdvance: (id: string, newStatus: string) => void;
  onMarkNotFit: (id: string) => void;
  isPending: boolean;
}) => {
  if (!prospect) return null;
  const next = NEXT_STATUS[prospect.status];
  const showNotFitButton = ["fit_assessment", "discovery_complete"].includes(prospect.status);
  const isTerminal = ["not_fit", "onboarding"].includes(prospect.status);

  return (
    <Dialog open={!!prospect} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{prospect.name}</DialogTitle>
          <DialogDescription>{prospect.contact} · {prospect.company}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {statusLabel[prospect.status] ?? prospect.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {prospect.source}
            </Badge>
            {prospect.fitDecision === "fit" && (
              <Badge className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Fit
              </Badge>
            )}
            {prospect.fitDecision === "no_fit" && (
              <Badge className="text-[10px] px-2 py-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                <XCircle className="w-3 h-3 mr-1" /> No Fit
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Company</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{prospect.company}</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Revenue</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{prospect.revenue}</p>
            </div>
          </div>

          {prospect.fitScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Fit Score</span>
                <span className="font-bold text-foreground">{prospect.fitScore}/100</span>
              </div>
              <Progress value={prospect.fitScore} className="h-2" />
            </div>
          )}

          <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Contact</p>
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{prospect.contact}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Added {prospect.date}</span>
            </div>
          </div>

          {prospect.notes && (
            <div className="rounded-lg bg-muted/20 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{prospect.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {showNotFitButton && (
            <Button
              variant="destructive"
              onClick={() => onMarkNotFit(prospect.id)}
              disabled={isPending}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" /> Not a Fit
            </Button>
          )}
          {next && !isTerminal && (
            <Button
              onClick={() => onAdvance(prospect.id, next.status)}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? "Updating..." : next.label}
            </Button>
          )}
          {isTerminal && (
            <span className="text-xs text-muted-foreground italic px-2">
              {prospect.status === "onboarding" ? "Prospect is being onboarded" : "Prospect marked as not a fit"}
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddProspectDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const createProspect = useCreateProspect();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    company: "",
    revenue: "",
    source: "",
    notes: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Prospect name is required");
      return;
    }
    try {
      await createProspect.mutateAsync({
        name: form.name.trim(),
        contact: form.contact.trim() || null,
        company: form.company.trim() || null,
        revenue: form.revenue.trim() || null,
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
        status: "intake",
      });
      toast.success(`Prospect "${form.name}" added`);
      setForm({ name: "", contact: "", company: "", revenue: "", source: "", notes: "" });
      onClose();
    } catch {
      toast.error("Failed to add prospect");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Prospect</DialogTitle>
          <DialogDescription>Enter prospect details to add them to the pipeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {[
            { label: "Name *", key: "name", placeholder: "e.g. John Smith" },
            { label: "Contact", key: "contact", placeholder: "e.g. john@company.com" },
            { label: "Company", key: "company", placeholder: "e.g. Acme Corp" },
            { label: "Revenue", key: "revenue", placeholder: "e.g. $5M" },
            { label: "Source", key: "source", placeholder: "e.g. Referral" },
            { label: "Notes", key: "notes", placeholder: "Optional notes..." },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-foreground">{label}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createProspect.isPending}>
            {createProspect.isPending ? "Adding..." : "Add Prospect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProspectPipeline = () => {
  const { data: rawProspects = [], isLoading } = useProspects();
  const updateProspect = useUpdateProspect();
  const [selectedProspect, setSelectedProspect] = useState<ReturnType<typeof toProspectShape> | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const handleAdvance = async (id: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { id, status: newStatus };
      if (newStatus === "fit") updates.fit_decision = "fit";
      await updateProspect.mutateAsync(updates);
      toast.success("Prospect updated", {
        description: `Status changed to ${statusLabel[newStatus] || newStatus}.`,
      });
      setSelectedProspect(null);
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const handleMarkNotFit = async (id: string) => {
    try {
      await updateProspect.mutateAsync({ id, status: "not_fit", fit_decision: "no_fit" });
      toast.success("Prospect marked as Not a Fit");
      setSelectedProspect(null);
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const prospects = (rawProspects as any[]).map(toProspectShape);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Prospect Pipeline</h1>
            <p className="text-muted-foreground mt-1 text-sm">Pre-client fit assessment and onboarding funnel</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />Add Prospect
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Loading prospects...</div>
      ) : (
        /* Kanban board */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col, colIdx) => {
            const colProspects = prospects.filter((p) => col.statuses.includes(p.status));
            return (
              <motion.div
                key={col.id}
                custom={colIdx}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${col.accent}`}>
                    {colProspects.length}
                  </Badge>
                </div>

                <div className="rounded-lg bg-muted/30 border border-dashed border-border min-h-[120px] p-2 space-y-2">
                  {colProspects.length === 0 && (
                    <div className="flex items-center justify-center h-16">
                      <span className="text-xs text-muted-foreground/50">No prospects</span>
                    </div>
                  )}
                  {colProspects.map((prospect) => (
                    <div key={prospect.id} onClick={() => setSelectedProspect(prospect)}>
                      <ProspectCard prospect={prospect as any} />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {prospects.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first prospect to start the pipeline.</p>
          <Button onClick={() => setAddOpen(true)}>Add Prospect</Button>
        </div>
      )}

      <ProspectDetailDialog
        prospect={selectedProspect}
        onClose={() => setSelectedProspect(null)}
        onAdvance={handleAdvance}
        onMarkNotFit={handleMarkNotFit}
        isPending={updateProspect.isPending}
      />
      <AddProspectDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default ProspectPipeline;
