import { Archive, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArchivedClients, useRestoreClient } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useState } from "react";

function RestoreConfirmDialog({
  target,
  onClose,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const restoreClient = useRestoreClient();

  const handleConfirm = async () => {
    if (!target) return;
    try {
      await restoreClient.mutateAsync(target.id);
      toast.success(`"${target.name}" restored to Active Clients`);
      onClose();
    } catch {
      toast.error("Failed to restore client");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Restore {target?.name}?</DialogTitle>
          <DialogDescription>
            This client will be moved back to your Active Clients list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={restoreClient.isPending}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {restoreClient.isPending ? "Restoring..." : "Restore Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ArchivedClients = () => {
  const { user } = useAuth();
  const { data: clients = [], isLoading } = useArchivedClients();
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Archived Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Clients removed from your active portfolio — data is preserved
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading archived clients...
        </div>
      ) : (clients as any[]).length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Archive className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No archived clients</h3>
          <p className="text-sm text-muted-foreground">
            Clients you archive will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Archived</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {(clients as any[]).map((c: any) => (
                <tr
                  key={c.id}
                  className="group border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.contact_name ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                      {c.stage || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.revenue ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.updated_at
                      ? (() => {
                          const diff = Date.now() - new Date(c.updated_at).getTime();
                          const days = Math.floor(diff / 86_400_000);
                          if (days < 1) return "Today";
                          if (days === 1) return "Yesterday";
                          return `${days}d ago`;
                        })()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {(c.advisor_id === user?.id || user?.role === "admin") && (
                      <button
                        onClick={() => setRestoreTarget({ id: c.id, name: c.name })}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RestoreConfirmDialog target={restoreTarget} onClose={() => setRestoreTarget(null)} />
    </div>
  );
};

export default ArchivedClients;
