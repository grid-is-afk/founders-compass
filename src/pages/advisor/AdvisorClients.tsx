import { useState } from "react";
import ClientRow from "@/components/dashboard/ClientRow";
import { Plus, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { toast } from "sonner";

const AdvisorClients = () => {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();

  const [open, setOpen] = useState(false);
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
    try {
      await createClient.mutateAsync({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        revenue: form.revenue.trim() || null,
      });
      toast.success(`Client "${form.name}" created`);
      setForm({ name: "", contact_name: "", contact_email: "", revenue: "" });
      setOpen(false);
    } catch {
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Client Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all founder engagements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Client
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any) => <ClientRow key={c.id} client={c} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Client</DialogTitle>
            <DialogDescription>Enter the client details to create a new engagement.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Client Name *</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Meridian Industries"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Contact Name</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Sarah Chen"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Contact Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. sarah@meridian.com"
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
    </div>
  );
};

export default AdvisorClients;
