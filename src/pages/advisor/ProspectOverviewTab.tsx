import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Building2,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateProspect } from "@/hooks/useProspects";
import { useCreateClient } from "@/hooks/useClients";
import type { ProspectShape } from "./ProspectWorkspace";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCOVERY_STATUSES = new Set([
  "discovery_scheduled",
  "discovery_complete",
  "fit",
  "onboarding",
]);

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  intake: { status: "fit_assessment", label: "Advance to Fit Assessment" },
  fit_assessment: { status: "discovery_scheduled", label: "Schedule Discovery" },
};

const SOURCE_LABEL: Record<string, string> = {
  Referral: "Referral",
  Other: "Other",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProspectOverviewTab() {
  const { prospect } = useOutletContext<{ prospect: ProspectShape }>();
  const navigate = useNavigate();
  const updateProspect = useUpdateProspect();
  const createClient = useCreateClient();

  // Enrollment form state
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [email, setEmail] = useState(() =>
    prospect.contact?.includes("@") ? prospect.contact : ""
  );
  const [entityType, setEntityType] = useState<"corp" | "llc">("corp");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const inDiscovery = DISCOVERY_STATUSES.has(prospect.status);
  const next = NEXT_STATUS[prospect.status];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdvance = async () => {
    if (!next) return;
    try {
      await updateProspect.mutateAsync({ id: prospect.id, status: next.status });
      toast.success("Prospect advanced", { description: `Moved to ${next.label}` });
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const handlePass = async () => {
    const isReferral = prospect.source.toLowerCase() === "referral";
    const newStatus = isReferral ? "nurture_call" : "kept_in_loop";
    try {
      await updateProspect.mutateAsync({
        id: prospect.id,
        status: newStatus,
        fit_decision: "no_fit",
      });
      toast.success(
        isReferral
          ? "Moved to Nurture Call — referral relationship preserved"
          : "Marked as Kept in Loop"
      );
      navigate("/advisor/prospects");
    } catch {
      toast.error("Failed to update prospect");
    }
  };

  const handleEnrollConfirm = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("A valid email address is required");
      return;
    }
    setIsEnrolling(true);
    try {
      const newClient = await createClient.mutateAsync({
        name: prospect.name,
        contact_name: prospect.contact,
        contact_email: email.trim(),
        revenue: prospect.revenue,
        source_prospect_id: prospect.id,
        entity_type: entityType,
        onboarded_at: new Date().toISOString(),
        q1_phase: "kickoff",
      });
      toast.success("Client enrolled — Q1 started", {
        description: `Portal login created for ${email.trim()}`,
      });
      navigate(`/advisor/clients/${(newClient as { id: string }).id}/dashboard`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed — try again";
      toast.error(msg);
    } finally {
      setIsEnrolling(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/40 border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Company
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{prospect.company}</p>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Revenue
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{prospect.revenue}</p>
        </div>
      </div>

      {/* Contact block */}
      <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Contact
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground">{prospect.contact}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Added {prospect.date}</span>
        </div>
      </div>

      {/* Source + fit badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-2 py-0">
          {SOURCE_LABEL[prospect.source] ?? prospect.source}
        </Badge>
        {prospect.fitDecision === "fit" && (
          <Badge className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Fit
          </Badge>
        )}
        {prospect.fitDecision === "no_fit" && (
          <Badge className="text-[10px] px-2 py-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
            <XCircle className="w-3 h-3 mr-1" />
            No Fit
          </Badge>
        )}
      </div>

      {/* Fit score bar */}
      {prospect.fitScore !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Fit Score</span>
            <span className="font-bold text-foreground">{prospect.fitScore}/100</span>
          </div>
          <Progress value={prospect.fitScore} className="h-2" />
        </div>
      )}

      {/* Notes */}
      {prospect.notes && (
        <div className="rounded-lg bg-muted/40 border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
            Notes
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{prospect.notes}</p>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Actions
        </p>

        {/* Advance button — for non-discovery, non-terminal stages */}
        {next && !inDiscovery && (
          <Button
            size="sm"
            onClick={handleAdvance}
            disabled={updateProspect.isPending}
            className="w-full sm:w-auto gap-1.5"
          >
            {updateProspect.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            {next.label}
          </Button>
        )}

        {/* Discovery-phase Win / Pass actions */}
        {inDiscovery && (
          <div className="space-y-2">
            {/* Win — Enroll inline form */}
            {!showEnrollForm ? (
              <Button
                size="sm"
                onClick={() => setShowEnrollForm(true)}
                className="w-full sm:w-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Win — Enroll as Client
              </Button>
            ) : (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Enroll as Client</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Client Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used for the client portal login. Shown once after enrollment.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Entity Type</label>
                  <Select
                    value={entityType}
                    onValueChange={(v) => setEntityType(v as "corp" | "llc")}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corp">Corporation</SelectItem>
                      <SelectItem value="llc">LLC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleEnrollConfirm}
                    disabled={isEnrolling}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  >
                    {isEnrolling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {isEnrolling ? "Enrolling..." : "Confirm Enrollment"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEnrollForm(false)}
                    disabled={isEnrolling}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Pass button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePass}
              disabled={updateProspect.isPending}
              className="w-full sm:w-auto gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Pass
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
