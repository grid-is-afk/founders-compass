import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, Pencil, Plus, AlertCircle } from "lucide-react";
import { useClient } from "@/hooks/useClients";
import { useClientIntake, useSaveIntake } from "@/hooks/useLicensee";
import {
  INTAKE_QUESTIONS,
  PILLARS,
  PILLAR_LABEL,
  QUESTIONS_BY_PILLAR,
  RISK_TAG_LABEL,
  type PillarKey,
  type RiskTag,
} from "@/lib/licenseeIntake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Answer {
  answer_value: string;
  risk_tag: RiskTag;
  notes: string;
}

type View = "snapshot" | "questions" | "review";

const TOTAL = INTAKE_QUESTIONS.length;
const INDEX_BY_KEY: Record<string, number> = Object.fromEntries(
  INTAKE_QUESTIONS.map((q, i) => [q.key, i])
);

const tagTone: Record<RiskTag, string> = {
  on_track: "border-primary bg-primary/10 text-primary",
  partial: "border-accent bg-accent/15 text-accent-foreground",
  gap: "border-destructive bg-destructive/10 text-destructive",
  na: "border-border bg-muted text-muted-foreground",
};

const LicenseeIntake = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: client } = useClient(id) as { data: { name?: string } | undefined };
  const { data: bundle } = useClientIntake(id);
  const saveIntake = useSaveIntake(id);

  const [view, setView] = useState<View>("snapshot");
  const [qIndex, setQIndex] = useState(0);
  const [snapshot, setSnapshot] = useState({
    cepa_name: "", firm_name: "", annual_revenue: "", num_owners: "",
    owner_ages: "", industry: "", exit_horizon: "", vam_phase: "",
  });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const qIndexRef = useRef(0);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  const advanceTimer = useRef<number | null>(null);
  const clearAdvance = () => {
    if (advanceTimer.current) { window.clearTimeout(advanceTimer.current); advanceTimer.current = null; }
  };
  useEffect(() => () => clearAdvance(), []);

  // Prefill + decide where to resume — only once, when the saved intake first loads.
  const initialized = useRef(false);
  useEffect(() => {
    if (!bundle || initialized.current) return;
    initialized.current = true;

    if (bundle.intake) {
      setSnapshot((s) => ({
        ...s,
        cepa_name: bundle.intake?.cepa_name ?? "",
        firm_name: bundle.intake?.firm_name ?? "",
        annual_revenue: bundle.intake?.annual_revenue ?? "",
        num_owners: bundle.intake?.num_owners != null ? String(bundle.intake.num_owners) : "",
        owner_ages: bundle.intake?.owner_ages ?? "",
        industry: bundle.intake?.industry ?? "",
        exit_horizon: bundle.intake?.exit_horizon ?? "",
        vam_phase: bundle.intake?.vam_phase ?? "",
      }));
    }
    const next: Record<string, Answer> = {};
    for (const r of bundle.responses ?? []) {
      next[r.question_key] = {
        answer_value: r.answer_value ?? "",
        risk_tag: (r.risk_tag ?? "na") as RiskTag,
        notes: r.notes ?? "",
      };
    }
    setAnswers(next);

    // Resume: jump to first unanswered question, or Review if all done.
    if (bundle.intake) {
      const firstUnanswered = INTAKE_QUESTIONS.findIndex((q) => !next[q.key]);
      if (firstUnanswered === -1) setView("review");
      else { setView("questions"); setQIndex(firstUnanswered); }
    }
  }, [bundle]);

  const answeredCount = Object.keys(answers).length;

  const buildResponses = () =>
    INTAKE_QUESTIONS.filter((q) => answers[q.key]).map((q) => ({
      pillar: q.pillar,
      question_key: q.key,
      answer_value: answers[q.key].answer_value,
      risk_tag: answers[q.key].risk_tag,
      notes: answers[q.key].notes || null,
    }));

  const payload = (status: "in_progress" | "complete") => ({
    ...snapshot,
    num_owners: snapshot.num_owners ? Number(snapshot.num_owners) : null,
    completed_date: new Date().toISOString().slice(0, 10),
    status,
    responses: buildResponses(),
  });

  const handleSaveDraft = async () => {
    setError(null);
    clearAdvance();
    try {
      await saveIntake.mutateAsync(payload("in_progress"));
      navigate(`/licensee/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const handleComplete = async () => {
    setError(null);
    if (answeredCount < TOTAL) {
      setError(`Please answer all ${TOTAL} questions (${answeredCount}/${TOTAL} done).`);
      return;
    }
    try {
      await saveIntake.mutateAsync(payload("complete"));
      navigate(`/licensee/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete.");
    }
  };

  // Select an answer → auto-advance to the next question (or Review at the end).
  const selectOption = (key: string, value: string, tag: RiskTag) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { answer_value: value, risk_tag: tag, notes: prev[key]?.notes ?? "" },
    }));
    clearAdvance();
    advanceTimer.current = window.setTimeout(() => {
      const i = qIndexRef.current;
      if (i < TOTAL - 1) setQIndex(i + 1);
      else setView("review");
    }, 280);
  };

  const setNote = (key: string, notes: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], notes } : { answer_value: "", risk_tag: "na", notes },
    }));
  };

  const goBackOne = () => {
    clearAdvance();
    if (qIndex > 0) setQIndex(qIndex - 1);
    else setView("snapshot");
  };

  const startQuestions = () => {
    const firstUnanswered = INTAKE_QUESTIONS.findIndex((q) => !answers[q.key]);
    setQIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    setView("questions");
  };

  // ───────────────────────── Snapshot ─────────────────────────
  if (view === "snapshot") {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink onClick={() => navigate(`/licensee/clients/${id}`)} label="Back to client" />
        <h1 className="text-2xl font-display font-semibold text-foreground">CEPA Intake</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          {client?.name ?? "Client"} · 4 pillars · {TOTAL} questions · ~5 min
        </p>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-1">Engagement snapshot</h2>
          <p className="text-xs text-muted-foreground mb-4">Quick context before the assessment. All optional.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CEPA name" value={snapshot.cepa_name} onChange={(v) => setSnapshot((s) => ({ ...s, cepa_name: v }))} />
            <Field label="CEPA firm" value={snapshot.firm_name} onChange={(v) => setSnapshot((s) => ({ ...s, firm_name: v }))} />
            <Field label="Annual revenue" value={snapshot.annual_revenue} onChange={(v) => setSnapshot((s) => ({ ...s, annual_revenue: v }))} />
            <Field label="# Owners" value={snapshot.num_owners} onChange={(v) => setSnapshot((s) => ({ ...s, num_owners: v }))} />
            <Field label="Owner ages" value={snapshot.owner_ages} onChange={(v) => setSnapshot((s) => ({ ...s, owner_ages: v }))} placeholder="e.g. 58, 62" />
            <Field label="Industry" value={snapshot.industry} onChange={(v) => setSnapshot((s) => ({ ...s, industry: v }))} />
            <Field label="Target exit horizon" value={snapshot.exit_horizon} onChange={(v) => setSnapshot((s) => ({ ...s, exit_horizon: v }))} placeholder="e.g. 3–5 years" />
            <Field label="VAM phase" value={snapshot.vam_phase} onChange={(v) => setSnapshot((s) => ({ ...s, vam_phase: v }))} placeholder="Discover / Prepare / Decide" />
          </div>
        </section>

        <div className="flex items-center justify-between mt-6">
          <button onClick={handleSaveDraft} disabled={saveIntake.isPending} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Save & exit
          </button>
          <Button onClick={startQuestions} size="lg">
            {answeredCount > 0 ? "Resume assessment" : "Start assessment"}
          </Button>
        </div>
      </div>
    );
  }

  // ───────────────────────── Review ─────────────────────────
  if (view === "review") {
    return (
      <div className="max-w-2xl mx-auto pb-28">
        <BackLink onClick={() => { setView("questions"); setQIndex(TOTAL - 1); }} label="Back to questions" />
        <h1 className="text-2xl font-display font-semibold text-foreground">Review</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          {answeredCount} of {TOTAL} answered{answeredCount < TOTAL ? " — finish the rest to complete" : " — looks good"}.
        </p>

        {PILLARS.map((pillar) => (
          <section key={pillar.key} className="mb-6">
            <h2 className="text-sm font-display font-semibold text-foreground mb-2">{pillar.label}</h2>
            <div className="space-y-2">
              {QUESTIONS_BY_PILLAR[pillar.key].map((q) => {
                const ans = answers[q.key];
                const noteOpen = openNotes.has(q.key);
                return (
                  <div key={q.key} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-foreground flex-1">{q.prompt}</p>
                      <button
                        onClick={() => { setView("questions"); setQIndex(INDEX_BY_KEY[q.key]); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    {ans ? (
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-md border ${tagTone[ans.risk_tag]}`}>
                        {RISK_TAG_LABEL[ans.risk_tag]} · {ans.answer_value}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs text-destructive font-medium">
                        <AlertCircle className="w-3 h-3" /> Not answered
                      </span>
                    )}
                    {noteOpen ? (
                      <Textarea
                        value={ans?.notes ?? ""}
                        onChange={(e) => setNote(q.key, e.target.value)}
                        placeholder="CEPA notes / evidence"
                        className="mt-2 text-sm min-h-[56px]"
                      />
                    ) : (
                      <button
                        onClick={() => setOpenNotes((p) => new Set(p).add(q.key))}
                        className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="w-3 h-3" /> {ans?.notes ? "Edit note" : "Add note"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {error && <p className="text-sm text-destructive font-medium mb-3">{error}</p>}

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-6 py-3">
            <button onClick={handleSaveDraft} disabled={saveIntake.isPending} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Save draft
            </button>
            <Button onClick={handleComplete} disabled={saveIntake.isPending || answeredCount < TOTAL}>
              {saveIntake.isPending ? "Saving…" : "Complete intake"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── Questions (one at a time) ─────────────────────────
  const q = INTAKE_QUESTIONS[qIndex];
  const currentPillar = q.pillar;
  const selected = answers[q.key]?.answer_value;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={goBackOne} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleSaveDraft} disabled={saveIntake.isPending} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Save & exit
        </button>
      </div>

      {/* Progress: pillar label, bar, position, pillar dots */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">{PILLAR_LABEL[currentPillar]}</span>
          <span className="text-xs text-muted-foreground">Question {qIndex + 1} of {TOTAL}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((qIndex + 1) / TOTAL) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {PILLARS.map((p) => {
            const done = QUESTIONS_BY_PILLAR[p.key].every((qq) => answers[qq.key]);
            const active = p.key === currentPillar;
            return (
              <span
                key={p.key}
                title={p.label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  active ? "bg-accent" : done ? "bg-primary/60" : "bg-muted"
                }`}
              />
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
        >
          <p className="text-lg font-display font-medium text-foreground leading-snug">{q.prompt}</p>
          <p className="text-sm text-muted-foreground italic mt-1.5">{q.helper}</p>

          <div className="mt-5 space-y-2.5">
            {q.options.map((opt) => {
              const isSel = selected === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => selectOption(q.key, opt.label, opt.tag)}
                  className={`w-full flex items-center gap-3 text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                    isSel ? tagTone[opt.tag] : "border-border bg-background hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full border flex-shrink-0 ${isSel ? "border-current" : "border-muted-foreground/40"}`}>
                    {isSel && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{RISK_TAG_LABEL[opt.tag]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Pick an answer to continue →</p>
            <button onClick={() => setView("review")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip to review
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const BackLink = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
    <ArrowLeft className="w-4 h-4" /> {label}
  </button>
);

const Field = ({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
  </div>
);

export default LicenseeIntake;
