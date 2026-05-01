import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Search, Plus, Building2, Mail, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { daysRemaining, countdownChipClass } from "@/lib/q1Utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientRow {
  id: string;
  advisor_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  revenue: string | null;
  stage: string | null;
  entity_type: "corp" | "llc" | null;
  q1_phase: string | null;
  onboarded_at: string | null;
  capital_readiness: number;
  source_prospect_id: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Q1_PHASE_LABELS: Record<string, string> = {
  kickoff: "Project Kickoff",
  prove: "Prove",
  diagnose: "Diagnose",
  design_tfo: "Design TFO",
  design_outside: "Design (outside TFO)",
  review: "Review & Wrap",
};

function entityBadgeClass(type: string | null): string {
  if (type === "corp") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (type === "llc") return "bg-violet-500/10 text-violet-700 border-violet-500/20";
  return "bg-muted text-muted-foreground";
}

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
};

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  target: { id: string; name: string } | null;
  onClose: () => void;
}

function DeleteConfirmDialog({ target, onClose }: DeleteConfirmDialogProps) {
  const deleteClient = useDeleteClient();

  const handleConfirm = async () => {
    if (!target) return;
    try {
      await deleteClient.mutateAsync(target.id);
      toast.success(`"${target.name}" removed`);
      onClose();
    } catch {
      toast.error("Failed to delete client");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Delete {target?.name}?</DialogTitle>
          <DialogDescription>
            This will permanently remove the client and all their data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteClient.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteClient.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Client Dialog
// ---------------------------------------------------------------------------

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
}

function AddClientDialog({ open, onClose }: AddClientDialogProps) {
  const createClient = useCreateClient();
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    revenue: "",
    entity_type: "" as "corp" | "llc" | "",
  });
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!form.contact_email.trim()) {
      toast.error("Contact email is required");
      return;
    }
    // FIX-8: Validate email format before submitting.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contact_email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      const result = await createClient.mutateAsync({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim(),
        revenue: form.revenue.trim() || null,
        entity_type: form.entity_type || null,
        onboarded_at: new Date().toISOString(),
        q1_phase: "kickoff",
      });
      if (result.generatedCredentials) {
        setCredentials(result.generatedCredentials);
      } else {
        toast.success(`Client "${form.name}" added`);
        handleClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add client";
      toast.error(msg);
    }
  };

  const handleClose = () => {
    setForm({ name: "", contact_name: "", contact_email: "", revenue: "", entity_type: "" });
    setCredentials(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Client</DialogTitle>
          <DialogDescription>
            {credentials
              ? "Client created. Share these login credentials with them."
              : "Enter client details. A portal login will be generated automatically."}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Client Portal Credentials
              </p>
              <div className="space-y-1">
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Email: </span>
                  <strong>{credentials.email}</strong>
                </p>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Password: </span>
                  <strong className="font-mono">{credentials.password}</strong>
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                These credentials are shown once. Share securely with your client.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {(
                [
                  { label: "Client / Company Name *", key: "name", placeholder: "e.g. Acme Corp" },
                  { label: "Contact Name", key: "contact_name", placeholder: "e.g. Jane Smith" },
                  { label: "Contact Email *", key: "contact_email", placeholder: "jane@acme.com" },
                  { label: "Revenue", key: "revenue", placeholder: "e.g. $5M" },
                ] as { label: string; key: keyof typeof form; placeholder: string }[]
              ).map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{label}</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Entity Type</label>
                <Select
                  value={form.entity_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, entity_type: v as "corp" | "llc" }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corp">Corporation (Corp)</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createClient.isPending}>
                {createClient.isPending ? "Creating..." : "Add Client"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ClientListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rawClients = [], isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const clients = (rawClients as ClientRow[]).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.contact_email ?? "").toLowerCase().includes(q) ||
      (c.contact_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage client workspaces and Q1 Discover journeys
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search clients by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first client to start their Q1 Discover journey.
          </p>
          <Button onClick={() => setAddOpen(true)}>Add Client</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client, i) => {
            const days = daysRemaining(client.onboarded_at);
            const phaseLabel = Q1_PHASE_LABELS[client.q1_phase ?? "kickoff"] ?? "Kickoff";

            return (
              <motion.div
                key={client.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                onClick={() => navigate(`/advisor/clients/${client.id}`)}
                className="group rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left — client info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{client.name}</p>
                      {client.contact_email && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {client.contact_email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {client.entity_type && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              entityBadgeClass(client.entity_type)
                            )}
                          >
                            {client.entity_type.toUpperCase()}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 bg-muted/40 text-muted-foreground"
                        >
                          {phaseLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right — metrics */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Countdown chip */}
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        countdownChipClass(days)
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {days === null
                        ? "No start date"
                        : days <= 0
                        ? "Q1 Complete"
                        : `${days}d remaining`}
                    </div>

                    {/* Capital readiness */}
                    <div className="w-32 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Capital Readiness</span>
                        <span className="font-semibold text-foreground">
                          {client.capital_readiness ?? 0}%
                        </span>
                      </div>
                      <Progress value={client.capital_readiness ?? 0} className="h-1" />
                    </div>

                    {/* Delete — only own clients or admin */}
                    {(client.advisor_id === user?.id || user?.role === "admin") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteTarget({ id: client.id, name: client.name })}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddClientDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <DeleteConfirmDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
