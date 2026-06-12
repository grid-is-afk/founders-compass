import { useState } from "react";
import { Mail, Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateClient } from "@/hooks/useClients";
import { useUpdateProspect } from "@/hooks/useProspects";

interface PrimaryEmailFieldProps {
  kind: "client" | "prospect";
  id: string;
  value: string | null | undefined;
}

/**
 * Inline editor for the dedicated `primary_email` — the founder's OWN email used
 * to auto-route their Otter call transcripts into this Data Room. Kept separate
 * from contact_email (which may be a shared licensee/handler address).
 */
export default function PrimaryEmailField({ kind, id, value }: PrimaryEmailFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const updateClient = useUpdateClient();
  const updateProspect = useUpdateProspect();
  const saving = updateClient.isPending || updateProspect.isPending;

  const save = async () => {
    const next = draft.trim();
    if (next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error("Enter a valid email address");
      return;
    }
    try {
      if (kind === "client") {
        await updateClient.mutateAsync({ id, primary_email: next || null });
      } else {
        await updateProspect.mutateAsync({ id, primary_email: next || null });
      }
      toast.success("Primary email saved");
      setEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Primary Email — Transcript Mapping
        </span>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(value ?? "");
                setEditing(false);
              }
            }}
            placeholder="founder@company.com"
            className="flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className={value ? "text-sm text-foreground" : "text-sm text-muted-foreground italic"}>
            {value || "Not set — transcripts won't auto-file"}
          </span>
          <button
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-snug">
        The founder's own email — used to auto-file their Otter call transcripts here. Separate from the
        billing/contact email.
      </p>
    </div>
  );
}
