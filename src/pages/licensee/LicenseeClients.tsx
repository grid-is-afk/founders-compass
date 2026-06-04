import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, ArrowRight, Building2 } from "lucide-react";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ClientRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  revenue: string | null;
  stage: string | null;
}

const stageTone = (stage: string | null): string => {
  switch (stage) {
    case "Assessment Complete":
      return "bg-primary/10 text-primary";
    case "Assessment In Progress":
      return "bg-accent/15 text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const LicenseeClients = () => {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients() as { data: ClientRow[]; isLoading: boolean };
  const createClient = useCreateClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [revenue, setRevenue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName(""); setContactName(""); setContactEmail(""); setRevenue(""); setError(null);
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) { setError("Business name is required."); return; }
    try {
      const created = await createClient.mutateAsync({
        name: name.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        revenue: revenue.trim() || null,
        stage: "Intake Pending",
      });
      setOpen(false);
      resetForm();
      if (created?.id) navigate(`/licensee/clients/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create client.");
    }
  };

  const completeCount = clients.filter((c) => c.stage === "Assessment Complete").length;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Active Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} client{clients.length === 1 ? "" : "s"} · {completeCount} assessment{completeCount === 1 ? "" : "s"} complete
          </p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-2">No clients yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Add your first business-owner client to run the 4-pillar exit-readiness intake.
          </p>
          <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/licensee/clients/${c.id}`)}
              className="group text-left rounded-xl border border-border bg-card p-5 hover:shadow-card-hover hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-display font-semibold text-foreground truncate">{c.name}</h3>
              {c.contact_name && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.contact_name}</p>
              )}
              <span className={`inline-block mt-3 text-[11px] font-medium px-2 py-0.5 rounded-full ${stageTone(c.stage)}`}>
                {c.stage ?? "Intake Pending"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Add Client dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Business name *</Label>
              <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Manufacturing LLC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="owner-name">Owner / founder</Label>
                <Input id="owner-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-email">Owner email</Label>
                <Input id="owner-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revenue">Annual revenue</Label>
              <Input id="revenue" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="e.g. $10M" />
            </div>
            <p className="text-xs text-muted-foreground">
              No founder login is created — you complete the intake on the client's behalf.
            </p>
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createClient.isPending}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createClient.isPending}>
              {createClient.isPending ? "Adding…" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LicenseeClients;
