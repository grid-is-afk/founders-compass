import { useState } from "react";
import { Inbox, FileText, Loader2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  useOtterInbox,
  useAssignTranscript,
  type OtterInboxItem,
} from "@/hooks/useOtterInbox";
import { useClients } from "@/hooks/useClients";
import { useProspects } from "@/hooks/useProspects";

function AssignDialog({
  item,
  open,
  onOpenChange,
}: {
  item: OtterInboxItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [target, setTarget] = useState<"client" | "prospect">("client");
  const [targetId, setTargetId] = useState("");
  const { data: clients = [] } = useClients();
  const { data: prospects = [] } = useProspects();
  const assign = useAssignTranscript();

  const options =
    target === "client"
      ? (clients as Array<{ id: string; name: string }>)
      : (prospects as Array<{ id: string; name: string }>);

  const handleAssign = async () => {
    if (!item || !targetId) return;
    try {
      await assign.mutateAsync({ id: item.id, target, targetId });
      toast.success("Transcript filed", {
        description: `Saved to the ${target}'s Data Room.`,
      });
      onOpenChange(false);
      setTargetId("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign transcript");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign transcript</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted/40 border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {item?.title ?? "Otter transcript"}
            </p>
            {item?.participants?.length ? (
              <p className="text-xs text-muted-foreground mt-1">
                {item.participants.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">File into</label>
            <Select
              value={target}
              onValueChange={(v) => {
                setTarget(v as "client" | "prospect");
                setTargetId("");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">A client's Data Room</SelectItem>
                <SelectItem value="prospect">A prospect's Data Room</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground capitalize">{target}</label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={`Select a ${target}…`} />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">None available</div>
                ) : (
                  options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!targetId || assign.isPending} className="gap-1.5">
            {assign.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            File transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TranscriptInboxPanel({
  hideWhenEmpty = false,
}: {
  hideWhenEmpty?: boolean;
}) {
  const { data: items = [], isLoading } = useOtterInbox();
  const [active, setActive] = useState<OtterInboxItem | null>(null);

  if (hideWhenEmpty && !isLoading && items.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Inbox className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-display font-semibold text-foreground">
          Unassigned Transcripts
        </h2>
        {items.length > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {items.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No transcripts waiting. Otter calls that match a client or prospect by primary email file
            automatically.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title ?? "Otter transcript"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {item.participants?.length ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.participants.join(", ")}</span>
                    </span>
                  ) : null}
                  <span className="flex-shrink-0">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActive(item)} className="flex-shrink-0">
                Assign
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AssignDialog
        item={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
      />
    </div>
  );
}
