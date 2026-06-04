import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useClient } from "@/hooks/useClients";
import { useClientIntake, useSaveIntake } from "@/hooks/useLicensee";
import {
  INTAKE_QUESTIONS,
  PILLARS,
  QUESTIONS_BY_PILLAR,
  RISK_TAG_LABEL,
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

  const [snapshot, setSnapshot] = useState({
    cepa_name: "",
    firm_name: "",
    annual_revenue: "",
    num_owners: "",
    owner_ages: "",
    industry: "",
    exit_horizon: "",
    vam_phase: "",
  });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string | null>(null);

  // Prefill from any saved intake
  useEffect(() => {
    if (!bundle) return;
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
    if (bundle.responses?.length) {
      const next: Record<string, Answer> = {};
      for (const r of bundle.responses) {
        next[r.question_key] = {
          answer_value: r.answer_value ?? "",
          risk_tag: (r.risk_tag ?? "na") as RiskTag,
          notes: r.notes ?? "",
        };
      }
      setAnswers(next);
    }
  }, [bundle]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = INTAKE_QUESTIONS.length;

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
    try {
      await saveIntake.mutateAsync(payload("in_progress"));
      navigate(`/licensee/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const handleComplete = async () => {
    setError(null);
    if (answeredCount < totalCount) {
      setError(`Please answer all ${totalCount} questions before completing (${answeredCount}/${totalCount} done).`);
      return;
    }
    try {
      await saveIntake.mutateAsync(payload("complete"));
      navigate(`/licensee/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete.");
    }
  };

  const selectOption = (key: string, value: string, tag: RiskTag) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { answer_value: value, risk_tag: tag, notes: prev[key]?.notes ?? "" },
    }));
  };

  const setNote = (key: string, notes: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: prev[key]
        ? { ...prev[key], notes }
        : { answer_value: "", risk_tag: "na", notes },
    }));
  };

  const progress = useMemo(() => Math.round((answeredCount / totalCount) * 100), [answeredCount, totalCount]);

  return (
    <div className="max-w-3xl pb-24">
      <button
        onClick={() => navigate(`/licensee/clients/${id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to client
      </button>

      <h1 className="text-2xl font-display font-semibold text-foreground">CEPA Intake</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {client?.name ?? "Client"} · 4 pillars · {totalCount} questions
      </p>

      {/* Progress bar */}
      <div className="mt-4 mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{answeredCount} / {totalCount} answered</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Engagement snapshot */}
      <section className="rounded-xl border border-border bg-card p-5 mb-8">
        <h2 className="font-display font-semibold text-foreground mb-4">Engagement snapshot</h2>
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

      {/* Pillars */}
      {PILLARS.map((pillar) => (
        <section key={pillar.key} className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">{pillar.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{pillar.blurb}</p>
          </div>

          <div className="space-y-5">
            {QUESTIONS_BY_PILLAR[pillar.key].map((q, idx) => {
              const ans = answers[q.key];
              return (
                <div key={q.key} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm font-medium text-foreground">
                    {idx + 1}. {q.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{q.helper}</p>

                  <div className="mt-3 space-y-2">
                    {q.options.map((opt) => {
                      const selected = ans?.answer_value === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => selectOption(q.key, opt.label, opt.tag)}
                          className={`w-full flex items-center gap-3 text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selected
                              ? tagTone[opt.tag]
                              : "border-border bg-background hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          <span className={`flex items-center justify-center w-4 h-4 rounded-full border flex-shrink-0 ${selected ? "border-current" : "border-muted-foreground/40"}`}>
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                          <span className="flex-1">{opt.label}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            {RISK_TAG_LABEL[opt.tag]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <Textarea
                    value={ans?.notes ?? ""}
                    onChange={(e) => setNote(q.key, e.target.value)}
                    placeholder="CEPA notes / evidence (optional)"
                    className="mt-3 text-sm min-h-[60px]"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {error && <p className="text-sm text-destructive font-medium mb-4">{error}</p>}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-8 py-3">
          <span className="text-xs text-muted-foreground">{answeredCount} / {totalCount} answered</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saveIntake.isPending}>
              Save draft
            </Button>
            <Button onClick={handleComplete} disabled={saveIntake.isPending}>
              {saveIntake.isPending ? "Saving…" : "Complete intake"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
  </div>
);

export default LicenseeIntake;
