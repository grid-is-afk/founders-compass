import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isPast, parseISO } from "date-fns";
import {
  ArrowLeft, ClipboardList, Sparkles, Plus, Circle, Clock, CheckCircle2,
  AlertTriangle, Network, Mail, ListChecks,
} from "lucide-react";
import { useClient } from "@/hooks/useClients";
import { useClientIntake } from "@/hooks/useLicensee";
import { useClientReferrals } from "@/hooks/useLicensee";
import { useClientCommitments, useCreateTask, useUpdateTask, type ClientTask, type TaskStatus } from "@/hooks/useTasks";
import {
  INTAKE_QUESTIONS, PILLAR_LABEL, RISK_BAND_LABEL,
  type PillarKey, type RiskBand,
} from "@/lib/licenseeIntake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const bandColor: Record<RiskBand, { text: string; bar: string; chip: string }> = {
  high: { text: "text-destructive", bar: "bg-destructive", chip: "bg-destructive/10 text-destructive" },
  average: { text: "text-accent-foreground", bar: "bg-accent", chip: "bg-accent/15 text-accent-foreground" },
  low: { text: "text-primary", bar: "bg-primary", chip: "bg-primary/10 text-primary" },
};

interface Priority {
  pillar: PillarKey;
  prompt: string;
  answer: string;
  severity: "high" | "medium";
}

const LicenseeClientView = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: client } = useClient(id) as { data: { name?: string; contact_name?: string } | undefined };
  const { data: bundle } = useClientIntake(id);
  const { data: referrals = [] } = useClientReferrals(id);
  const { data: tasks = [] } = useClientCommitments(id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [newTask, setNewTask] = useState("");

  const intake = bundle?.intake ?? null;
  const responses = bundle?.responses ?? [];
  const scores = intake?.pillar_scores ?? null;

  // QB-AI priority actions — derived from the flagged (Gap/Partial) intake answers,
  // mirroring the "Flagged items (TFO priorities)" surfaced in the CEPA output.
  const priorities = useMemo<Priority[]>(() => {
    const promptByKey = new Map(INTAKE_QUESTIONS.map((q) => [q.key, q.prompt]));
    return responses
      .filter((r) => r.risk_tag === "gap" || r.risk_tag === "partial")
      .map((r) => ({
        pillar: r.pillar,
        prompt: promptByKey.get(r.question_key) ?? r.question_key,
        answer: r.answer_value ?? "",
        severity: (r.risk_tag === "gap" ? "high" : "medium") as "high" | "medium",
      }))
      .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  }, [responses]);

  // Action tracker rollup
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter(
      (t) => t.status !== "done" && t.due_date && isPast(parseISO(t.due_date))
    ).length;
    const critical = tasks.filter(
      (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high")
    ).length;
    return { total, completed, overdue, critical };
  }, [tasks]);

  const cycleStatus = (t: ClientTask) => {
    const next: Record<TaskStatus, TaskStatus> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
      blocked: "todo",
    };
    updateTask.mutate({ id: t.id, clientId: id, status: next[t.status] });
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    createTask.mutate(
      { client_id: id, title: newTask.trim(), status: "todo", priority: "medium", owner_type: "tfo" },
      { onSuccess: () => setNewTask("") }
    );
  };

  const statusIcon = (s: TaskStatus) => {
    if (s === "done") return <CheckCircle2 className="w-4 h-4 text-primary" />;
    if (s === "in_progress") return <Clock className="w-4 h-4 text-accent-foreground" />;
    if (s === "blocked") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => navigate("/licensee/clients")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All clients
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">{client?.name ?? "Client"}</h1>
          {client?.contact_name && <p className="text-sm text-muted-foreground mt-1">{client.contact_name}</p>}
        </div>
        <Button onClick={() => navigate(`/licensee/clients/${id}/intake`)} className="gap-2">
          <ClipboardList className="w-4 h-4" />
          {intake ? "Edit Intake" : "Begin Intake"}
        </Button>
      </div>

      {!intake ? (
        <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-2">No assessment yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Run the 4-pillar exit-readiness intake to generate this client's readiness scores and priority actions.
          </p>
          <Button onClick={() => navigate(`/licensee/clients/${id}/intake`)} className="gap-2">
            <ClipboardList className="w-4 h-4" /> Begin Intake
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pillar cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["entity", "ip", "capital", "exit"] as PillarKey[]).map((p) => {
                const sc = scores?.[p];
                const band = sc?.band ?? "high";
                const tone = bandColor[band];
                return (
                  <div key={p} className="rounded-xl border border-border bg-card p-4 border-l-4" style={{ borderLeftColor: "currentColor" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{PILLAR_LABEL[p]}</p>
                    <p className={`text-2xl font-display font-bold mt-1 ${tone.text}`}>{sc?.pct ?? 0}%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{RISK_BAND_LABEL[band]}</p>
                    <div className="h-1 rounded-full bg-muted overflow-hidden mt-2">
                      <div className={`h-full ${tone.bar}`} style={{ width: `${sc?.pct ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action tracker */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 font-display font-semibold text-foreground">
                  <ListChecks className="w-4 h-4 text-primary" /> Action Tracker
                </h2>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <Stat label="Total" value={taskStats.total} />
                <Stat label="Completed" value={taskStats.completed} tone="text-primary" />
                <Stat label="Overdue" value={taskStats.overdue} tone="text-accent-foreground" />
                <Stat label="Critical" value={taskStats.critical} tone="text-destructive" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Add an action…"
                  className="h-9 text-sm"
                />
                <Button size="sm" onClick={handleAddTask} disabled={createTask.isPending} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              <div className="space-y-1.5">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No actions yet.</p>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <button onClick={() => cycleStatus(t)} title="Cycle status">{statusIcon(t.status)}</button>
                      <span className={`flex-1 text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.title}
                      </span>
                      {(t.priority === "high" || t.priority === "urgent") && t.status !== "done" && (
                        <span className="text-[10px] font-semibold uppercase text-destructive">{t.priority}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Quarterback AI priority actions */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display font-semibold text-foreground mb-1">
                <Sparkles className="w-4 h-4 text-accent" /> Quarterback AI — Priority Actions
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Flagged from the intake's Gap & Partial answers.
              </p>
              {priorities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gaps flagged — strong readiness across pillars.</p>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
                  {priorities.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.severity === "high" ? "bg-destructive" : "bg-accent"}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{PILLAR_LABEL[p.pillar]}</p>
                        <p className="text-sm text-foreground leading-snug">{p.prompt}</p>
                        {p.answer && <p className="text-xs text-muted-foreground mt-0.5 italic">{p.answer}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referral status */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 font-display font-semibold text-foreground">
                  <Network className="w-4 h-4 text-primary" /> Referral Status
                </h2>
                <Button size="sm" variant="outline" onClick={() => navigate(`/licensee/referral-hub?client=${id}`)}>
                  Request
                </Button>
              </div>
              {referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No referrals requested yet.</p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {r.partner_name ?? (r.pillar ? PILLAR_LABEL[r.pillar] : "Specialist")}
                        </p>
                        {r.partner_specialty && <p className="text-xs text-muted-foreground truncate">{r.partner_specialty}</p>}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact TFO */}
            <a
              href="mailto:ops@thefoundersoffice.com?subject=Support%20request"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Mail className="w-4 h-4" /> Contact The Founder's Office
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) => (
  <div className="rounded-lg border border-border bg-background p-3 text-center">
    <p className={`text-xl font-display font-bold ${tone}`}>{value}</p>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
  </div>
);

export default LicenseeClientView;
