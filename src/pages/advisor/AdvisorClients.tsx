import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientRow from "@/components/dashboard/ClientRow";
import { Lock, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface GeneratedCredentials {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  target,
  onClose,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
}) {
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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
// Main component
// ---------------------------------------------------------------------------

const AdvisorClients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();

  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    revenue: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!form.contact_email.trim()) {
      toast.error("Contact email is required — it will be used as the client's login");
      return;
    }

    try {
      const result = await createClient.mutateAsync({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim(),
        revenue: form.revenue.trim() || null,
      }) as any;

      setForm({ name: "", contact_name: "", contact_email: "", revenue: "" });
      setOpen(false);

      if (result?.generatedCredentials) {
        setCredentials(result.generatedCredentials);
      } else {
        toast.success(`Client "${form.name}" created`);
      }
    } catch {
      toast.error("Failed to create client");
    }
  };

  const handleCopyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard
      .writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
      .then(() => toast.success("Credentials copied to clipboard"))
      .catch(() => toast.error("Failed to copy — please copy manually"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all founder engagements</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Client
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading clients...
        </div>
      ) : (clients as any[]).length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first client to get started.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Client
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Readiness</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {(clients as any[]).map((c: any) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/advisor/clients/${c.id}`)}
                  className="group border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.contact_name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary">
                      {c.stage || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full gradient-olive"
                          style={{ width: `${c.capital_readiness ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{c.capital_readiness ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.revenue ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.updated_at
                      ? (() => {
                          const diff = Date.now() - new Date(c.updated_at).getTime();
                          const mins = Math.floor(diff / 60_000);
                          if (mins < 60) return `${mins}m ago`;
                          const hours = Math.floor(mins / 60);
                          if (hours < 24) return `${hours}h ago`;
                          return `${Math.floor(hours / 24)}d ago`;
                        })()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {(c.advisor_id === user?.id || user?.role === "admin") && (
                      <button
                        onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Client</DialogTitle>
            <DialogDescription>
              A login account will be created automatically using the contact email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Client Name *</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Acme Corp"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Contact Name</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Jane Smith"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Contact Email *
                <span className="ml-1 font-normal text-muted-foreground">(used as login)</span>
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. jane@acmecorp.com"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Revenue</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. $12.4M"
                value={form.revenue}
                onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createClient.isPending}>
              {createClient.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog — shown once after successful creation */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Client Account Created</DialogTitle>
            <DialogDescription>
              Share these login credentials with your client. The password is shown only once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Login Email</p>
                <p className="text-sm font-medium text-foreground font-mono select-all">
                  {credentials?.email}
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-1">Password</p>
                <p className="text-sm font-medium text-foreground font-mono select-all">
                  {credentials?.password}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3 flex-shrink-0" />
              <span>This password will not be shown again. Save it before closing.</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCopyCredentials}>
              Copy Credentials
            </Button>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default AdvisorClients;
