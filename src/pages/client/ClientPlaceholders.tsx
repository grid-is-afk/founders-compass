import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  File,
  Paperclip,
  Upload,
  TrendingUp,
  BarChart3,
  User,
  Star,
  Download,
  Video,
  CalendarDays,
  CalendarPlus,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  Lock,
  Send,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useClientTasks } from "@/hooks/useTasks";
import {
  useClientDocuments,
  useClientStorage,
  useUploadDocuments,
  useDeleteDocument,
  type StagedFile,
} from "@/hooks/useDocuments";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { REQUIRED_DOCS } from "@/lib/documentConstants";
import { isAfter, subHours } from "date-fns";
import { useClientDeliverables } from "@/hooks/useDeliverables";
import { useClientAssessments } from "@/hooks/useAssessmentsApi";
import { adaptAssessments } from "@/lib/assessmentAdapter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Shared animation variant ────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

// ─── Shared icon maps (mirrors ClientDashboard) ───────────────────────────────

const statusIcon = {
  done: <CheckCircle2 className="w-4 h-4 text-primary" />,
  in_progress: <Clock className="w-4 h-4 text-accent" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground" />,
};

const docIcon = {
  pdf: <FileText className="w-3 h-3 text-destructive/70" />,
  spreadsheet: <FileSpreadsheet className="w-3 h-3 text-primary" />,
  document: <File className="w-3 h-3 text-accent" />,
};

// ─── 1. CLIENT QUESTIONNAIRES ─────────────────────────────────────────────────

export const ClientQuestionnaires = () => {
  const { data: clients = [] } = useClients();
  const clientsArray = Array.isArray(clients) ? clients : [];
  const clientId = (clientsArray as any[])[0]?.id ?? "";
  const { data: rawAssessments = [] } = useClientAssessments(clientId);
  const assessmentsArray = Array.isArray(rawAssessments) ? rawAssessments : [];
  const adapted = adaptAssessments(assessmentsArray as any, clientId);
  const { businessAttractiveness, businessReadiness, personalReadiness, valueFactors } = adapted;

  // Compute scores from real assessment data
  function computeScore(assessment: typeof businessAttractiveness): { pct: number; total: number; max: number } {
    if (!assessment?.factors?.length) return { pct: 0, total: 0, max: 0 };
    const factors = assessment.factors;
    const total = factors.reduce((sum: number, f: any) => sum + (f.score ?? 0), 0);
    const max = factors.length * 6;
    return { pct: Math.round((total / max) * 100), total, max };
  }

  function computeVF(assessment: typeof valueFactors): { positive: number; neutral: number; improvement: number; total: number; pct: number } {
    if (!assessment?.factors?.length) return { positive: 0, neutral: 0, improvement: 0, total: 0, pct: 0 };
    const factors = assessment.factors;
    const positive = factors.filter((f: any) => f.rating === "positive").length;
    const neutral = factors.filter((f: any) => f.rating === "neutral").length;
    const improvement = factors.filter((f: any) => f.rating === "improvement" || f.rating === "needs_improvement").length;
    return { positive, neutral, improvement, total: factors.length, pct: Math.round((positive / factors.length) * 100) };
  }

  const baScore = computeScore(businessAttractiveness);
  const brScore = computeScore(businessReadiness);
  const prScore = computeScore(personalReadiness);
  const vfScore = computeVF(valueFactors);

  const assessments = [
    {
      id: "ba",
      title: "Business Attractiveness",
      icon: TrendingUp,
      hasData: !!businessAttractiveness,
      questionCount: businessAttractiveness?.factors.length ?? 25,
      completedDate: businessAttractiveness?.completedDate ?? null,
      scoreLabel: businessAttractiveness?.factors.length ? `${baScore.pct}%` : "0%",
      scoreValue: baScore.pct,
      scoreNote: businessAttractiveness?.factors.length ? `${baScore.total} / ${baScore.max} points` : "No assessment data yet",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "br",
      title: "Business Readiness",
      icon: BarChart3,
      hasData: !!businessReadiness,
      questionCount: businessReadiness?.factors.length ?? 22,
      completedDate: businessReadiness?.completedDate ?? null,
      scoreLabel: businessReadiness?.factors.length ? `${brScore.pct}%` : "0%",
      scoreValue: brScore.pct,
      scoreNote: businessReadiness?.factors.length ? `${brScore.total} / ${brScore.max} points` : "No assessment data yet",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      id: "pr",
      title: "Personal Readiness",
      icon: User,
      hasData: !!personalReadiness,
      questionCount: personalReadiness?.factors.length ?? 11,
      completedDate: personalReadiness?.completedDate ?? null,
      scoreLabel: personalReadiness?.factors.length ? `${prScore.pct}%` : "0%",
      scoreValue: prScore.pct,
      scoreNote: personalReadiness?.factors.length ? `${prScore.total} / ${prScore.max} points` : "No assessment data yet",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "vf",
      title: "54 Value Factors",
      icon: Star,
      hasData: !!valueFactors,
      questionCount: valueFactors?.factors.length ?? 54,
      completedDate: valueFactors?.completedDate ?? null,
      scoreLabel: valueFactors?.factors.length ? `${vfScore.positive} / ${vfScore.total} Positive` : "0 / 0 Positive",
      scoreValue: vfScore.pct,
      scoreNote: valueFactors?.factors.length
        ? `${vfScore.neutral} neutral · ${vfScore.improvement} need improvement`
        : "No assessment data yet",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const [selected, setSelected] = useState<string | null>(null);

  const getReviewData = (id: string) => {
    if (id === "ba") return businessAttractiveness?.factors ?? [];
    if (id === "br") return businessReadiness?.factors ?? [];
    if (id === "pr") return personalReadiness?.factors ?? [];
    if (id === "vf") return valueFactors?.factors ?? [];
    return [];
  };

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Your Assessments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          These assessments help your advisor evaluate your business's readiness and value
          across key dimensions.
        </p>
      </motion.div>

      {/* 2×2 assessment grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assessments.map((a, i) => {
          const Icon = a.icon;
          const isComplete = !!a.completedDate;
          return (
            <motion.div
              key={a.id}
              initial="hidden"
              animate="visible"
              custom={i + 1}
              variants={fadeUp}
              className="bg-card rounded-lg border border-border p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", a.bgColor)}>
                    <Icon className={cn("w-4 h-4", a.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.questionCount} questions
                    </p>
                  </div>
                </div>
                {!a.hasData ? (
                  <Badge variant="outline" className="text-[10px] font-semibold border-muted text-muted-foreground">
                    Not Started
                  </Badge>
                ) : isComplete ? (
                  <Badge variant="outline" className="text-[10px] font-semibold border-primary/40 text-primary bg-primary/5">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-300 text-amber-600 bg-amber-50">
                    In Progress
                  </Badge>
                )}
              </div>

              {isComplete && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <span className="text-xs font-semibold text-foreground">{a.scoreLabel}</span>
                  </div>
                  <Progress value={a.scoreValue} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">{a.scoreNote}</p>
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs mt-auto"
                    disabled={!a.hasData}
                    onClick={() => setSelected(a.id)}
                  >
                    Review Answers
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display font-semibold">
                      {a.title} — Review
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    {getReviewData(a.id).map((factor: any) => (
                      <div
                        key={factor.id}
                        className="rounded-md border border-border bg-muted/30 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{factor.name}</p>
                          {factor.score !== undefined && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {factor.score} / 6
                            </span>
                          )}
                          {factor.rating !== undefined && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] capitalize shrink-0",
                                factor.rating === "positive" && "border-primary/40 text-primary bg-primary/5",
                                factor.rating === "neutral" && "border-accent/40 text-accent bg-accent/5",
                                factor.rating === "improvement" && "border-destructive/40 text-destructive bg-destructive/5"
                              )}
                            >
                              {factor.rating}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {factor.considerations}
                        </p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          );
        })}
      </div>

      {/* Next assessment due */}
      <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp}>
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-display font-semibold text-foreground">
              Next Assessment Due
            </h2>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/40 border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Quarterly Review</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All four assessments will be refreshed at your next advisory session
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted shrink-0">
              Upcoming
            </Badge>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── 2. CLIENT UPLOADS ────────────────────────────────────────────────────────

const UPLOAD_CATEGORIES = ["Reports", "Financials", "Customer Capital", "Legal & Structure", "Governance"];
const MAX_CLIENT_BYTES = 50 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name: string): "pdf" | "spreadsheet" | "document" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["xlsx", "xls", "csv"].includes(ext)) return "spreadsheet";
  return "document";
}

function isDocNew(uploadedAt: string): boolean {
  return isAfter(new Date(uploadedAt), subHours(new Date(), 48));
}

export const ClientUploads = () => {
  const { data: clients = [] } = useClients();
  const clientsArray = Array.isArray(clients) ? clients : [];
  const clientId = (clientsArray as any[])[0]?.id ?? "";

  const { data: rawDocs = [] } = useClientDocuments(clientId, 30_000);
  const { data: storage } = useClientStorage(clientId);
  const uploadMutation = useUploadDocuments();
  const deleteMutation = useDeleteDocument();

  const [pendingFiles, setPendingFiles] = useState<StagedFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevDocIdsRef = useRef<Set<string>>(new Set());
  const docNameMapRef = useRef<Map<string, string>>(new Map());

  const docs = Array.isArray(rawDocs) ? (rawDocs as any[]) : [];

  // Keep name map current (needed after a doc is removed and we need its name for the toast)
  docs.forEach((d: any) => docNameMapRef.current.set(d.id as string, d.name as string));

  // Detect documents removed by the advisor (poll-based)
  const currentDocIds = new Set(docs.map((d: any) => d.id as string));
  if (prevDocIdsRef.current.size > 0) {
    prevDocIdsRef.current.forEach((prevId) => {
      if (!currentDocIds.has(prevId)) {
        toast("A document was removed from your file", {
          description: docNameMapRef.current.get(prevId) ?? "Unknown file",
        });
      }
    });
  }
  prevDocIdsRef.current = currentDocIds;

  // Required docs checklist
  const uploadedCategories = new Set(docs.map((d: any) => d.category as string));
  const requiredStatus = REQUIRED_DOCS.map((r) => ({ ...r, uploaded: uploadedCategories.has(r.category) }));
  const requiredCount = requiredStatus.filter((r) => r.uploaded).length;

  const usedBytes = storage?.used_bytes ?? 0;
  const usedPct = Math.min((usedBytes / MAX_CLIENT_BYTES) * 100, 100);
  const isAtCap = usedBytes >= MAX_CLIENT_BYTES;
  const storageColor = usedPct >= 95 ? "bg-destructive" : usedPct >= 80 ? "bg-amber-500" : "bg-primary";

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isAtCap) return;
    const staged: StagedFile[] = Array.from(files).map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      file,
      category: "Reports",
    }));
    setPendingFiles((prev) => [...prev, ...staged]);
  };

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0 || !clientId) return;
    const progressMap: Record<string, number> = {};
    pendingFiles.forEach((pf) => { progressMap[pf.id] = 0; });
    setFileProgress(progressMap);

    try {
      const results = await uploadMutation.mutateAsync({
        clientId,
        stagedFiles: pendingFiles,
        uploadedByRole: "client",
        onProgress: (idx, pct) => {
          setFileProgress((prev) => ({ ...prev, [pendingFiles[idx].id]: pct }));
        },
      });
      toast(`${results.length} file${results.length > 1 ? "s" : ""} uploaded successfully`, {
        description: results.map((r) => r.name).join(", "),
      });
      setPendingFiles([]);
      setBulkCategory("");
      setFileProgress({});
    } catch (err: any) {
      toast("Upload failed", { description: err?.message ?? "An error occurred" });
      setFileProgress({});
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId || !clientId) return;
    const docId = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteMutation.mutateAsync({ id: docId, clientId });
      toast("Document removed");
    } catch {
      toast("Failed to delete document");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Document Uploads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Securely share documents with your advisor. All files are stored in your private data room.
        </p>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Storage bar */}
      <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Your storage</span>
          <span className={cn("text-xs font-medium", usedPct >= 95 ? "text-destructive" : usedPct >= 80 ? "text-amber-500" : "text-muted-foreground")}>
            {formatBytes(usedBytes)} of {formatBytes(MAX_CLIENT_BYTES)} used
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", storageColor)} style={{ width: `${usedPct}%` }} />
        </div>
      </motion.div>

      {/* Required documents checklist */}
      <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Required Documents</p>
            <Badge variant="outline" className="text-[10px]">
              {requiredCount} / {REQUIRED_DOCS.length}
            </Badge>
          </div>
          <div className="p-4 space-y-2.5">
            {requiredStatus.map((doc) => (
              <div key={doc.label} className="flex items-center gap-3">
                {doc.uploaded
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <span className={cn("text-xs", doc.uploaded ? "text-foreground" : "text-muted-foreground")}>
                  {doc.label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{doc.category}</span>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((requiredCount / REQUIRED_DOCS.length) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {requiredCount} of {REQUIRED_DOCS.length} required documents uploaded
            </p>
          </div>
        </div>
      </motion.div>

      {/* Upload zone or staging panel */}
      <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
        {isAtCap ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-medium text-destructive">Storage limit reached</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your advisor to free up space.</p>
          </div>
        ) : pendingFiles.length === 0 ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-10 flex flex-col items-center text-center transition-colors cursor-pointer group",
              dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30 hover:border-primary/30"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          >
            <div className={cn("w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 transition-colors", dragging ? "bg-primary/10" : "group-hover:bg-primary/10")}>
              <Upload className={cn("w-5 h-5 transition-colors", dragging ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {dragging ? "Drop files to upload" : "Drag files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: PDF, XLSX, DOCX, CSV, JPG, PNG — Max 25 MB per file
            </p>
            <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              Browse Files
            </Button>
          </div>
        ) : (
          /* Staging panel */
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a category for each file before confirming.
                </p>
              </div>
              <button
                className="text-xs text-primary hover:underline mt-0.5"
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                + Add more
              </button>
            </div>

            {pendingFiles.length > 1 && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/10">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Apply category to all:</span>
                <select
                  value={bulkCategory}
                  disabled={uploadMutation.isPending}
                  onChange={(e) => {
                    setBulkCategory(e.target.value);
                    setPendingFiles((prev) => prev.map((p) => ({ ...p, category: e.target.value })));
                  }}
                  className="rounded-md border border-input bg-background text-xs px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">— choose —</option>
                  {UPLOAD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="divide-y divide-border/60">
              {pendingFiles.map((pf) => {
                const prog = fileProgress[pf.id];
                const isUploading = prog !== undefined && prog < 100;
                return (
                  <div key={pf.id} className="flex items-center gap-3 px-4 py-3">
                    <span>{docIcon[getFileType(pf.file.name)]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pf.file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{formatBytes(pf.file.size)}</p>
                        {isUploading && (
                          <div className="flex items-center gap-1.5 flex-1">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{prog}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      value={pf.category}
                      disabled={uploadMutation.isPending}
                      onChange={(e) => setPendingFiles((prev) => prev.map((p) => p.id === pf.id ? { ...p, category: e.target.value } : p))}
                      className="rounded-md border border-input bg-background text-sm px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {UPLOAD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors ml-1 disabled:opacity-30"
                      disabled={uploadMutation.isPending}
                      onClick={() => setPendingFiles((prev) => prev.filter((p) => p.id !== pf.id))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/10">
              <Button
                size="sm"
                variant="ghost"
                disabled={uploadMutation.isPending}
                onClick={() => { setPendingFiles([]); setBulkCategory(""); setFileProgress({}); }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={uploadMutation.isPending} onClick={handleConfirmUpload}>
                {uploadMutation.isPending ? "Uploading…" : "Confirm Upload"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Uploaded documents table */}
      <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">
          Your Uploaded Documents
        </h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-5 py-2.5 border-b border-border bg-muted/30">
            {["Document Name", "Category", "Upload Date", "Size", "Status", ""].map((h) => (
              <p key={h} className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {h}
              </p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {docs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              docs.map((doc: any, i: number) => {
                const isNew = isDocNew(doc.uploaded_at);
                const dateLabel = doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                return (
                  <motion.div
                    key={doc.id}
                    initial="hidden"
                    animate="visible"
                    custom={i + 5}
                    variants={fadeUp}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 items-center px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{docIcon[doc.type ?? "document"]}</span>
                      <span className="text-sm text-foreground truncate">{doc.name}</span>
                      {isNew && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">NEW</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{doc.category ?? "Uploads"}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{dateLabel}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{doc.size ?? "—"}</span>
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap border-primary/40 text-primary bg-primary/5">
                      Uploaded
                    </Badge>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                      disabled={deleteMutation.isPending && pendingDeleteId === doc.id}
                      onClick={() => setPendingDeleteId(doc.id)}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── 3. CLIENT TASKS ──────────────────────────────────────────────────────────

const priorityBadge: Record<string, string> = {
  high: "border-destructive/40 text-destructive bg-destructive/5",
  medium: "border-accent/40 text-accent bg-accent/5",
  low: "border-muted text-muted-foreground",
};

export const ClientTasks = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const { data: clients = [] } = useClients();
  const clientsArray = Array.isArray(clients) ? clients : [];
  const clientId = (clientsArray as any[])[0]?.id ?? "";
  const { data: rawTasks = [] } = useClientTasks(clientId);
  const tasksArray = Array.isArray(rawTasks) ? rawTasks : [];

  const allTasks = (tasksArray as any[]).map((t) => ({
    id: t.id,
    title: t.title,
    status: (t.status ?? "todo") as "done" | "in_progress" | "todo",
    assignee: t.assignee ?? "Client",
    dueDate: t.due_date
      ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    priority: (t.priority ?? "medium") as "high" | "medium" | "low",
    subtasks: (t.subtasks ?? []) as Array<{ id: string; title: string; done: boolean }>,
    linkedDocs: [] as Array<{ name: string; type: "pdf" | "spreadsheet" | "document" }>,
  }));

  const clientTasks = allTasks.filter((t) => t.assignee === "Client" || t.assignee?.toLowerCase() === "client");
  const advisorTasks = allTasks.filter((t) => t.assignee !== "Client" && t.assignee?.toLowerCase() !== "client");

  const totalSubs = allTasks.reduce((a, t) => a + t.subtasks.length, 0);
  const doneSubs = allTasks.reduce((a, t) => a + t.subtasks.filter((s) => s.done).length, 0);
  const sprintPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  const renderTask = (task: typeof allTasks[number], muted = false) => {
    const isOpen = expanded[task.id];
    const subtasksDone = task.subtasks.filter((s) => s.done).length;
    return (
      <div key={task.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors",
            muted ? "hover:bg-muted/10 opacity-60" : "hover:bg-muted/30"
          )}
          onClick={() => toggle(task.id)}
        >
          {task.subtasks.length > 0 || task.linkedDocs.length > 0 ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          {statusIcon[task.status]}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm",
                task.status === "done"
                  ? "text-muted-foreground line-through"
                  : muted
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {task.title}
            </p>
            {task.subtasks.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {subtasksDone}/{task.subtasks.length} subtasks
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-[10px]", priorityBadge[task.priority])}>
            {task.priority}
          </Badge>
          {task.linkedDocs.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              <span className="text-[11px]">{task.linkedDocs.length}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">{task.dueDate}</span>
        </div>

        {isOpen && (
          <div className="bg-muted/20 px-5 pb-4 pt-1 ml-7 border-l-2 border-border space-y-3">
            {task.subtasks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                  Subtasks
                </p>
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2.5 pl-2">
                    {sub.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        sub.done ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {task.linkedDocs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                  Linked Documents
                </p>
                {task.linkedDocs.map((doc) => (
                  <div key={doc.name} className="flex items-center gap-2.5 pl-2">
                    {docIcon[doc.type]}
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Your Sprint Tasks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          90-Day Execution Sprint
        </p>
      </motion.div>

      {/* Sprint progress bar */}
      <motion.div
        initial="hidden"
        animate="visible"
        custom={1}
        variants={fadeUp}
        className="bg-card rounded-lg border border-border p-5 space-y-2"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Overall Sprint Progress</p>
          <span className="text-sm font-semibold text-primary">{sprintPct}%</span>
        </div>
        <Progress value={sprintPct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {doneSubs} of {totalSubs} subtasks complete across all sprint tasks
        </p>
      </motion.div>

      {/* Client tasks */}
      <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-display font-semibold text-foreground">Your Tasks</h2>
          <span className="text-xs text-muted-foreground">
            {clientTasks.filter((t) => t.status === "done").length}/{clientTasks.length} complete
          </span>
        </div>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {clientTasks.map((task) => renderTask(task, false))}
        </div>
      </motion.div>

      {/* Advisor tasks — read only */}
      <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-display font-semibold text-foreground">Advisor Tasks</h2>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
            Read-only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Your advisor is working on these items in parallel.
        </p>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {advisorTasks.map((task) => renderTask(task, true))}
        </div>
      </motion.div>
    </div>
  );
};

// ─── 4. CLIENT REPORTS ────────────────────────────────────────────────────────

const reportEngineIcon: Record<string, React.ReactNode> = {
  Performance: <BarChart3 className="w-4 h-4 text-primary" />,
  "Customer Capital": <TrendingUp className="w-4 h-4 text-accent" />,
  "Capital Architecture": <Star className="w-4 h-4 text-primary" />,
};

const reportTimeline: Array<{ title: string; date: string; engine: string }> = [];

const reportRequestTypes = [
  "Six Keys Scorecard Update",
  "Capital Architecture Summary",
  "Customer Capital Index",
  "90-Day Sprint Status Report",
  "Pain Point Analysis",
  "Board-Style Monthly Update",
];

export const ClientReports = () => {
  const { data: clients = [] } = useClients();
  const clientsArray = Array.isArray(clients) ? clients : [];
  const clientId = (clientsArray as any[])[0]?.id ?? "";
  const { data: rawDeliverables = [] } = useClientDeliverables(clientId);
  const deliverablesArray = Array.isArray(rawDeliverables) ? rawDeliverables : [];

  const allDeliverables = (deliverablesArray as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status ?? "pending",
    engine: d.engine ?? "Performance",
  }));

  const publishedReports = allDeliverables.filter((d) => d.status === "ready");
  const draftReports = allDeliverables.filter((d) => d.status !== "ready");
  const [requested, setRequested] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Your Reports</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Advisor-generated insights and deliverables published for your review.
            </p>
          </div>
          {/* Request a Report dialog */}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setRequested(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0" onClick={() => setDialogOpen(true)}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Request a Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display font-semibold">Request a Report</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Select the type of report you'd like your advisor to generate.
              </p>
              <div className="space-y-2 mt-2">
                {reportRequestTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setRequested(type)}
                    className={cn(
                      "w-full text-left rounded-md border px-4 py-3 text-sm transition-colors",
                      requested === type
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:bg-muted/40 text-foreground"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <Button
                className="w-full mt-2"
                disabled={!requested}
                onClick={() => {
                  if (!requested) return;
                  toast.success("Report requested", {
                    description: "Report requested — your advisor will be notified.",
                  });
                  setRequested(null);
                  setDialogOpen(false);
                }}
              >
                {requested ? `Request "${requested}"` : "Select a report type"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Published reports */}
      <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">
          Published Reports
        </h2>
        <div className="space-y-3">
          {publishedReports.map((report, i) => (
            <motion.div
              key={report.id}
              initial="hidden"
              animate="visible"
              custom={i + 2}
              variants={fadeUp}
              className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                {reportEngineIcon[report.engine] ?? (
                  <FileText className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Published by your advisor · {report.engine}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-primary/40 text-primary bg-primary/5 text-[10px] shrink-0"
              >
                Published
              </Badge>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => toast("Opening report", { description: report.title })}
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => toast("Downloading PDF", { description: report.title })}
                >
                  <Download className="w-3 h-3" />
                  PDF
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Draft / in-progress reports */}
      {draftReports.length > 0 && (
        <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">
            In Preparation
          </h2>
          <div className="space-y-3">
            {draftReports.map((report, i) => (
              <motion.div
                key={report.id}
                initial="hidden"
                animate="visible"
                custom={i + 5}
                variants={fadeUp}
                className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 opacity-70"
              >
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{report.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your advisor is preparing this report
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-accent/40 text-accent bg-accent/5 text-[10px] shrink-0"
                >
                  {report.status === "draft" ? "Draft" : "Needs Data"}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Report timeline */}
      <motion.div initial="hidden" animate="visible" custom={7} variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Report History</h2>
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="relative space-y-4 pl-4 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
            {reportTimeline.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className="absolute -left-3 top-1 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.engine} · {entry.date}
                  </p>
                </div>
                <span className="text-xs text-primary hover:underline cursor-pointer shrink-0">
                  View
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── 5. CLIENT MEETINGS ───────────────────────────────────────────────────────

const upcomingMeetings: Array<{ id: string; date: string; time: string; type: string; with: string; description: string; isNext: boolean; agenda: string[] }> = [];

const pastMeetings: Array<{ id: string; date: string; type: string; outcome: string; actions: string }> = [];

const meetingTypeColor: Record<string, string> = {
  "Quarterly Review": "border-primary/40 text-primary bg-primary/5",
  "Sprint Check-in": "border-accent/40 text-accent bg-accent/5",
  "Document Review": "border-muted text-muted-foreground",
  "Strategy Session": "border-primary/40 text-primary bg-primary/5",
};

export const ClientMeetings = () => {
  const nextMeeting = upcomingMeetings[0] ?? null;
  const futureMeetings = upcomingMeetings.slice(1);

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Meeting Cadence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Regular check-ins with your advisor to review progress and align on next steps.
        </p>
      </motion.div>

      {/* Next meeting — prominent card */}
      <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
        {nextMeeting ? (
        <div className="bg-card rounded-lg border border-primary/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Next Meeting
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                {nextMeeting.type}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {nextMeeting.date} · {nextMeeting.time}
              </p>
              <p className="text-sm text-muted-foreground">
                With: {nextMeeting.with} — Senior Advisor
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" disabled className="gap-1.5 opacity-50 cursor-not-allowed">
                <Video className="w-3.5 h-3.5" />
                Join Meeting
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarPlus className="w-3.5 h-3.5" />
                Add to Calendar
              </Button>
            </div>
          </div>

          {nextMeeting.agenda.length > 0 && (
            <div className="rounded-md bg-muted/40 border border-border px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Agenda
              </p>
              {nextMeeting.agenda.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  <p className="text-sm text-foreground">{item}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground mb-1">No meetings scheduled</h3>
            <p className="text-sm text-muted-foreground">Your advisor will schedule upcoming meetings here.</p>
          </div>
        )}
      </motion.div>

      {/* Upcoming meetings */}
      <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">
          Upcoming Meetings
        </h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {futureMeetings.map((meeting, i) => (
            <motion.div
              key={meeting.id}
              initial="hidden"
              animate="visible"
              custom={i + 3}
              variants={fadeUp}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{meeting.type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meeting.date} · {meeting.time} · with {meeting.with}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{meeting.description}</p>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0", meetingTypeColor[meeting.type] ?? "border-muted text-muted-foreground")}
              >
                {meeting.type}
              </Badge>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Past meetings */}
      <motion.div initial="hidden" animate="visible" custom={6} variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Past Meetings</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {pastMeetings.map((meeting, i) => (
            <motion.div
              key={meeting.id}
              initial="hidden"
              animate="visible"
              custom={i + 7}
              variants={fadeUp}
              className="px-5 py-4 space-y-2 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", meetingTypeColor[meeting.type] ?? "border-muted text-muted-foreground")}
                  >
                    {meeting.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{meeting.date}</span>
                </div>
                <button className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                  <MessageSquare className="w-3 h-3" />
                  View Notes
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{meeting.outcome}</p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span>{meeting.actions}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
