import { useState, useRef } from "react";
import {
  FileText, Upload, FolderOpen, Search, Download,
  CheckCircle2, Circle, FileSpreadsheet, FileIcon,
  Eye, Zap, X, Trash2, Loader2, ChevronRight,
  LayoutGrid, List,
} from "lucide-react";
import { useAnalyzeDataRoom } from "@/hooks/useAnalyzeDataRoom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { REQUIRED_DOCS, DATA_ROOM_CATEGORIES } from "@/lib/documentConstants";
import {
  useClientDocuments,
  useClientStorage,
  useUploadDocuments,
  useDeleteDocument,
  useUpdateDocument,
  type StagedFile,
  type Document,
} from "@/hooks/useDocuments";
import { isAfter, subHours } from "date-fns";
import ShareInvestorPortal from "@/components/ShareInvestorPortal";
import { useClientContext } from "@/hooks/useClientContext";
import { SixKeysScoreGrid } from "@/components/clients/dashboard/SixKeysScoreGrid";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 800 * 1024 * 1024;

interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
}

const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  "Reports":           { bg: "bg-slate-100",  text: "text-slate-600", border: "border-slate-300" },
  "Financials":        { bg: "bg-slate-200",  text: "text-slate-700", border: "border-slate-400" },
  "Customer Capital":  { bg: "bg-blue-50",    text: "text-blue-700",  border: "border-blue-300"  },
  "Legal & Structure": { bg: "bg-slate-100",  text: "text-slate-600", border: "border-slate-400" },
  "Governance":        { bg: "bg-slate-200",  text: "text-slate-800", border: "border-slate-500" },
  "Meeting Notes":     { bg: "bg-blue-100",   text: "text-blue-800",  border: "border-blue-400"  },
  "Agreements":        { bg: "bg-slate-300",  text: "text-slate-800", border: "border-slate-600" },
  "Other":             { bg: "bg-slate-50",   text: "text-slate-500", border: "border-slate-200" },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  bg: "bg-slate-50",
  text: "text-slate-500",
  border: "border-slate-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDocNew(uploadedAt: string): boolean {
  return isAfter(new Date(uploadedAt), subHours(new Date(), 48));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FileTypeIcon = ({ type }: { type: "pdf" | "spreadsheet" | "document" }) => {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "spreadsheet") return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  return <FileIcon className="w-4 h-4 text-blue-500" />;
};

const LargeFileTypeIcon = ({ type }: { type: "pdf" | "spreadsheet" | "document" }) => {
  if (type === "pdf") return <FileText className="w-8 h-8 text-red-400" />;
  if (type === "spreadsheet") return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
  return <FileIcon className="w-8 h-8 text-blue-400" />;
};

// Client badge — shown inline next to a filename
const ClientBadge = () => (
  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-accent/10 text-accent border border-accent/20 shrink-0">
    Client
  </span>
);

// Category badge — used in search results
const CategoryBadge = ({ category }: { category: string }) => {
  const style = CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_STYLE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium border",
        style.bg, style.text, style.border
      )}
    >
      {category}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Document grid card (inside a folder, grid layout)
// ---------------------------------------------------------------------------

interface DocCardProps {
  doc: Document;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const DocumentCard = ({ doc, onView, onDownload, onDelete }: DocCardProps) => {
  const dateLabel = formatDate(doc.uploaded_at);
  const isNew = doc.uploaded_at ? isDocNew(doc.uploaded_at) : false;

  return (
    <div className="group rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 transition-colors flex flex-col gap-3 p-4">
      {/* Icon + new badge */}
      <div className="flex items-start justify-between">
        <LargeFileTypeIcon type={doc.type ?? "document"} />
        {isNew && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">
            NEW
          </span>
        )}
      </div>

      {/* Filename */}
      <div className="space-y-0.5 flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 break-words">
          {doc.name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {doc.uploaded_by_role === "client" && <ClientBadge />}
          <span className="text-[10px] text-muted-foreground">{doc.size ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/60">
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={onView}
        >
          <Eye className="w-3 h-3" />
          <span>View</span>
        </button>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={onDownload}
        >
          <Download className="w-3 h-3" />
          <span>Download</span>
        </button>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Folder grid card
// ---------------------------------------------------------------------------

interface FolderCardProps {
  category: string;
  docs: Document[];
  onClick: () => void;
}

const FolderCard = ({ category, docs, onClick }: FolderCardProps) => {
  const isEmpty = docs.length === 0;
  const hasClientDocs = docs.some((d) => d.uploaded_by_role === "client");

  const lastUpdatedMs = docs
    .map((d) => (d.uploaded_at ? new Date(d.uploaded_at).getTime() : 0))
    .filter((t) => t > 0);
  const lastUpdated =
    lastUpdatedMs.length > 0
      ? formatDate(new Date(Math.max(...lastUpdatedMs)).toISOString())
      : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-colors cursor-pointer p-5 text-left flex flex-col gap-3 w-full",
        isEmpty && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <FolderOpen className="w-8 h-8 text-primary/70 shrink-0" />
        {hasClientDocs && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-accent/10 text-accent border border-accent/20 mt-0.5 shrink-0">
            From Client
          </span>
        )}
      </div>

      <div className="space-y-0.5 flex-1">
        <p className="text-sm font-semibold text-foreground">{category}</p>
        <p className="text-xs text-muted-foreground">
          {isEmpty ? "No documents" : `${docs.length} document${docs.length === 1 ? "" : "s"}`}
        </p>
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground">Last updated {lastUpdated}</p>
        )}
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Document table row (inside a folder, list layout)
// ---------------------------------------------------------------------------

interface DocRowProps {
  doc: Document;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const DocumentTableRow = ({ doc, onView, onDownload, onDelete }: DocRowProps) => {
  const dateLabel = formatDate(doc.uploaded_at);
  const isNew = doc.uploaded_at ? isDocNew(doc.uploaded_at) : false;
  const categoryName = doc.category ?? "Other";
  const catStyle = CATEGORY_COLORS[categoryName] ?? DEFAULT_CATEGORY_STYLE;

  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors border-l-2",
        catStyle.border
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <FileTypeIcon type={doc.type ?? "document"} />
          <span className="text-foreground font-medium text-xs">{doc.name}</span>
          {isNew && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">
              NEW
            </span>
          )}
          {doc.uploaded_by_role === "client" && <ClientBadge />}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border",
            doc.uploaded_by_role === "client"
              ? "bg-accent/10 text-accent border-accent/20"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {doc.uploaded_by_role === "client" ? "Client" : "Advisor"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{dateLabel}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{doc.size ?? "—"}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onView}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onDownload}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AdvisorDataRoom = ({
  clientOverride,
}: {
  clientOverride?: { id: string; name: string };
} = {}) => {
  const { selectedClient: ctxClient } = useClientContext();
  const selectedClient = clientOverride ?? ctxClient;
  const clientId = selectedClient?.id ?? "";

  // Live API data — poll every 30s so advisors see client uploads promptly
  const { data: docs = [], previousData: prevDocs } = useClientDocuments(
    clientId,
    30_000
  ) as any;
  const { data: storage } = useClientStorage(clientId);
  const uploadMutation = useUploadDocuments();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();
  const {
    mutate: analyzeDataRoom,
    isPending: isAnalyzing,
    progress: analyzeProgress,
  } = useAnalyzeDataRoom(clientId);

  // ── Upload & staging state ──────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<StagedFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── Browsing state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [folderView, setFolderView] = useState<string | null>(null); // null = folder grid
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  // ── Dialog state ────────────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    category: string;
    date: string;
    file_url: string | null;
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editSubfolder, setEditSubfolder] = useState("");

  // ── Toast when new client uploads arrive ────────────────────────────────
  const prevCountRef = useRef<number>(0);
  const prevClientDocs = (prevDocs ?? []) as Document[];
  const currentClientDocs = (docs as Document[]).filter(
    (d) => d.uploaded_by_role === "client"
  );
  if (
    prevCountRef.current > 0 &&
    currentClientDocs.length > prevCountRef.current
  ) {
    const newest = currentClientDocs[0];
    toast(`New document from ${selectedClient?.name}`, {
      description: newest?.name,
    });
  }
  prevCountRef.current = currentClientDocs.length;

  // ── Derived data ────────────────────────────────────────────────────────
  const allDocs = docs as Document[];

  // Build folder map: category → docs
  const folderMap = new Map<string, Document[]>();
  for (const cat of DATA_ROOM_CATEGORIES) {
    folderMap.set(cat, []);
  }
  const uncategorized: Document[] = [];
  for (const doc of allDocs) {
    const cat = doc.category?.trim() ?? "";
    if (!cat || !DATA_ROOM_CATEGORIES.includes(cat as (typeof DATA_ROOM_CATEGORIES)[number])) {
      uncategorized.push(doc);
    } else {
      folderMap.get(cat)!.push(doc);
    }
  }
  if (uncategorized.length > 0) {
    folderMap.set("Uncategorized", uncategorized);
  }

  // Docs in the current folder (when inside a folder)
  const currentFolderDocs: Document[] =
    folderView !== null ? (folderMap.get(folderView) ?? []) : [];

  // Search result: flat list across all docs
  const searchResults: Document[] =
    search.trim().length > 0
      ? allDocs.filter((d) =>
          d.name.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  const usedBytes = storage?.used_bytes ?? 0;
  const usedPct = Math.min((usedBytes / MAX_BYTES) * 100, 100);
  const storageColor =
    usedPct >= 95
      ? "bg-destructive"
      : usedPct >= 80
      ? "bg-amber-500"
      : "bg-primary";

  const lastUpdatedDates = allDocs
    .map((d) => (d.uploaded_at ? new Date(d.uploaded_at).getTime() : 0))
    .filter((t) => t > 0);
  const lastUpdated =
    lastUpdatedDates.length > 0
      ? formatDate(new Date(Math.max(...lastUpdatedDates)).toISOString())
      : "—";

  const uploadedCategories = new Set(allDocs.map((d) => d.category));
  const requiredStatus = REQUIRED_DOCS.map((r) => ({
    ...r,
    uploaded: uploadedCategories.has(r.category),
  }));
  const requiredCount = requiredStatus.filter((r) => r.uploaded).length;

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleAnalyzeDataRoom() {
    analyzeDataRoom({
      onSuccess: (result: { updated: string[]; documentsAnalyzed: number; totalDocuments: number }) => {
        const sections =
          result.updated.length > 0 ? result.updated.join(", ") : "dashboard";
        toast("Dashboard updated from Data Room", {
          description: `Updated: ${sections} (${result.documentsAnalyzed}/${result.totalDocuments} docs analyzed)`,
        });
      },
      onError: (msg: string) => toast(msg),
    });
  }

  const getFileType = (name: string): "pdf" | "spreadsheet" | "document" => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return "pdf";
    if (["xlsx", "xls", "csv"].includes(ext)) return "spreadsheet";
    return "document";
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const staged: StagedFile[] = Array.from(files).map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      file,
      // Default to the current folder category so dropped files land in the right place
      category: folderView ?? "Reports",
    }));
    setPendingFiles((prev) => [...prev, ...staged]);
  };

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0 || !clientId) return;
    const progressMap: Record<string, number> = {};
    pendingFiles.forEach((pf) => {
      progressMap[pf.id] = 0;
    });
    setFileProgress(progressMap);

    try {
      const results = await uploadMutation.mutateAsync({
        clientId,
        stagedFiles: pendingFiles,
        uploadedByRole: "advisor",
        onProgress: (idx, pct) => {
          setFileProgress((prev) => ({
            ...prev,
            [pendingFiles[idx].id]: pct,
          }));
        },
      });
      toast(
        `${results.length} file${results.length > 1 ? "s" : ""} added to Data Room`,
        { description: results.map((r) => r.name).join(", ") }
      );
      setPendingFiles([]);
      setBulkCategory("");
      setFileProgress({});
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred";
      toast("Upload failed", { description: message });
      setFileProgress({});
    }
  };

  const handleDownload = (doc: { name: string; file_url: string | null }) => {
    if (doc.file_url) {
      const a = document.createElement("a");
      a.href = doc.file_url;
      a.download = doc.name;
      a.click();
    } else {
      toast("File not available for download");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const docId = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteMutation.mutateAsync({ id: docId, clientId });
      toast("Document removed");
    } catch {
      toast("Failed to delete document");
    }
  };

  const openPreview = (doc: Document) => {
    setPreviewDoc({
      name: doc.name,
      category: doc.category ?? "Other",
      date: formatDate(doc.uploaded_at),
      file_url: doc.file_url,
    });
  };

  // ── No-client guard ─────────────────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">No client selected</p>
        <p className="text-xs text-muted-foreground">
          Select a client from the top bar to view their Data Room.
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Data Room
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {selectedClient.name} — upload and manage capital readiness materials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAnalyzeDataRoom}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate max-w-[200px]">
              {isAnalyzing && analyzeProgress?.stage === "reading" && analyzeProgress.fileName
                ? `File ${analyzeProgress.current} of ${analyzeProgress.total}`
                : isAnalyzing && analyzeProgress?.stage === "synthesizing"
                ? "Synthesizing…"
                : isAnalyzing
                ? "Analyzing…"
                : "Analyze with QB"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload className="w-3.5 h-3.5" />
            {showUpload ? "Hide Upload" : "Upload Files"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Upload Folder
          </Button>
          <ShareInvestorPortal clientName={selectedClient?.name} />
        </div>
      </div>

      {/* ── Hidden file inputs ── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...({
          webkitdirectory: "true",
          multiple: true,
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* ── Upload zone — toggleable ── */}
      {showUpload &&
        (pendingFiles.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <Upload
              className={cn(
                "w-8 h-8 mx-auto mb-3",
                dragging ? "text-primary" : "text-muted-foreground"
              )}
            />
            <p className="text-sm font-medium text-foreground mb-1">
              {dragging
                ? "Drop files to upload"
                : "Drag files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              PDF, Excel, Word, PowerPoint, JPG, PNG — up to 25 MB per file
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pendingFiles.length} file
                  {pendingFiles.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a category for each file — this determines where it
                  appears in the Data Room.
                </p>
              </div>
              <button
                className="text-xs text-primary hover:underline mt-0.5"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add more
              </button>
            </div>

            {pendingFiles.length > 1 && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/10">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Apply category to all:
                </span>
                <select
                  value={bulkCategory}
                  onChange={(e) => {
                    setBulkCategory(e.target.value);
                    setPendingFiles((prev) =>
                      prev.map((p) => ({ ...p, category: e.target.value }))
                    );
                  }}
                  className="rounded-md border border-input bg-background text-xs px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— choose —</option>
                  {DATA_ROOM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="divide-y divide-border/60">
              {pendingFiles.map((pf) => {
                const prog = fileProgress[pf.id];
                const isUploading = prog !== undefined && prog < 100;
                return (
                  <div key={pf.id} className="flex items-center gap-3 px-4 py-3">
                    <FileTypeIcon type={getFileType(pf.file.name)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {pf.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(pf.file.size)}
                        </p>
                        {isUploading && (
                          <div className="flex items-center gap-1.5 flex-1">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {prog}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      value={pf.category}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((p) =>
                            p.id === pf.id
                              ? { ...p, category: e.target.value }
                              : p
                          )
                        )
                      }
                      disabled={uploadMutation.isPending}
                      className="rounded-md border border-input bg-background text-sm px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {DATA_ROOM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Subfolder (optional)"
                      value={pf.subfolder ?? ""}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((p) => p.id === pf.id ? { ...p, subfolder: e.target.value } : p)
                        )
                      }
                      disabled={uploadMutation.isPending}
                      className="rounded-md border border-input bg-background text-sm px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 w-36"
                    />
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors ml-1 disabled:opacity-30"
                      disabled={uploadMutation.isPending}
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter((p) => p.id !== pf.id)
                        )
                      }
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
                onClick={() => {
                  setPendingFiles([]);
                  setBulkCategory("");
                  setFileProgress({});
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={uploadMutation.isPending}
                onClick={handleConfirmUpload}
              >
                {uploadMutation.isPending ? "Uploading…" : "Add files to Data Room"}
              </Button>
            </div>
          </div>
        ))}

      {/* ── Storage usage bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Storage</span>
          <span
            className={cn(
              "text-xs font-medium",
              usedPct >= 95
                ? "text-destructive"
                : usedPct >= 80
                ? "text-amber-500"
                : "text-muted-foreground"
            )}
          >
            {formatBytes(usedBytes)} of {formatBytes(MAX_BYTES)} used
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", storageColor)}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      {/* ── Six Keys of Capital ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Six Keys of Capital
        </p>
        <SixKeysScoreGrid clientId={clientId} />
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Documents", value: String(allDocs.length) },
          { label: "From Client", value: String(currentClientDocs.length) },
          { label: "Last Updated", value: lastUpdated },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card rounded-lg border border-border px-5 py-3"
          >
            <p className="text-xl font-bold font-display text-foreground">
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Required documents checklist ── */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Required Documents
          </p>
          <Badge variant="outline" className="text-[10px]">
            {requiredCount} / {REQUIRED_DOCS.length}
          </Badge>
        </div>
        <div className="p-4 space-y-2.5">
          {requiredStatus.map((doc) => (
            <div key={doc.label} className="flex items-center gap-3">
              {doc.uploaded ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs",
                  doc.uploaded ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {doc.label}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {doc.category}
              </span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${
                  REQUIRED_DOCS.length > 0
                    ? Math.round((requiredCount / REQUIRED_DOCS.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {requiredCount} of {REQUIRED_DOCS.length} required documents uploaded
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── BROWSING AREA ── */}
      {search.trim().length > 0 ? (
        /* ── Search results: flat list across all folders ── */
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Search results
            </p>
            <span className="text-xs text-muted-foreground">
              {searchResults.length} document
              {searchResults.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Folder
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Uploaded by
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Size
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-xs text-muted-foreground"
                    >
                      No documents match your search
                    </td>
                  </tr>
                ) : (
                  searchResults.map((doc) => {
                    const dateLabel = formatDate(doc.uploaded_at);
                    const categoryName = doc.category ?? "Uncategorized";
                    const catStyle =
                      CATEGORY_COLORS[categoryName] ?? DEFAULT_CATEGORY_STYLE;
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors border-l-2",
                          catStyle.border
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <FileTypeIcon type={doc.type ?? "document"} />
                            <span className="text-foreground font-medium text-xs">
                              {doc.name}
                            </span>
                            {doc.uploaded_by_role === "client" && (
                              <ClientBadge />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <CategoryBadge category={categoryName} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border",
                              doc.uploaded_by_role === "client"
                                ? "bg-accent/10 text-accent border-accent/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {doc.uploaded_by_role === "client"
                              ? "Client"
                              : "Advisor"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {dateLabel}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.size ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              onClick={() => openPreview(doc)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => setPendingDeleteId(doc.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : folderView === null ? (
        /* ── View 1: Folder grid ── */
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Folders
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from(folderMap.entries()).map(([category, catDocs]) => (
              <FolderCard
                key={category}
                category={category}
                docs={catDocs}
                onClick={() => setFolderView(category)}
              />
            ))}
          </div>
          {allDocs.length === 0 && (
            <div className="mt-6 flex flex-col items-center justify-center py-12 text-center gap-2">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
                No documents yet
              </p>
              <p className="text-xs text-muted-foreground">
                Upload files above to get started.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── View 2: Inside a folder ── */
        <div className="space-y-4">
          {/* Breadcrumb + layout toggle */}
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => setFolderView(null)}
              >
                Data Room
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{folderView}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({currentFolderDocs.length} doc
                {currentFolderDocs.length !== 1 ? "s" : ""})
              </span>
            </nav>

            {/* Layout toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              <button
                onClick={() => setLayout("grid")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                  layout === "grid"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setLayout("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                  layout === "list"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>

          {/* Empty folder state */}
          {currentFolderDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2 rounded-xl border border-dashed border-border">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
                This folder is empty
              </p>
              <p className="text-xs text-muted-foreground">
                Upload files and assign them to{" "}
                <span className="font-medium">{folderView}</span> to see them
                here.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-2"
                onClick={() => {
                  setShowUpload(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Files
              </Button>
            </div>
          )}

          {/* Documents — grouped by subfolder */}
          {currentFolderDocs.length > 0 && (() => {
            const noSub: Document[] = [];
            const subMap = new Map<string, Document[]>();
            for (const doc of currentFolderDocs) {
              const sf = doc.subfolder?.trim() || "";
              if (!sf) { noSub.push(doc); }
              else {
                if (!subMap.has(sf)) subMap.set(sf, []);
                subMap.get(sf)!.push(doc);
              }
            }
            return (
              <div className="space-y-6">
                {noSub.length > 0 && (
                  layout === "grid"
                    ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {noSub.map((doc) => (
                          <DocumentCard key={doc.id} doc={doc} onView={() => openPreview(doc)} onDownload={() => handleDownload(doc)} onDelete={() => setPendingDeleteId(doc.id)} />
                        ))}
                      </div>
                    : <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <div className="max-h-[520px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10"><tr className="border-b border-border bg-muted/40"><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Uploaded by</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Size</th><th className="px-4 py-3" /></tr></thead>
                            <tbody>{noSub.map((doc) => <DocumentTableRow key={doc.id} doc={doc} onView={() => openPreview(doc)} onDownload={() => handleDownload(doc)} onDelete={() => setPendingDeleteId(doc.id)} />)}</tbody>
                          </table>
                        </div>
                      </div>
                )}
                {Array.from(subMap.entries()).map(([sf, sfDocs]) => (
                  <div key={sf}>
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{sf}</span>
                      <span className="text-xs text-muted-foreground">({sfDocs.length} doc{sfDocs.length !== 1 ? "s" : ""})</span>
                    </div>
                    {layout === "grid"
                      ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {sfDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} onView={() => openPreview(doc)} onDownload={() => handleDownload(doc)} onDelete={() => setPendingDeleteId(doc.id)} />)}
                        </div>
                      : <div className="bg-card rounded-lg border border-border overflow-hidden">
                          <div className="max-h-[520px] overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10"><tr className="border-b border-border bg-muted/40"><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Uploaded by</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th><th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Size</th><th className="px-4 py-3" /></tr></thead>
                              <tbody>{sfDocs.map((doc) => <DocumentTableRow key={doc.id} doc={doc} onView={() => openPreview(doc)} onDownload={() => handleDownload(doc)} onDelete={() => setPendingDeleteId(doc.id)} />)}</tbody>
                            </table>
                          </div>
                        </div>
                    }
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Document preview dialog ── */}
      <Dialog
        open={!!previewDoc}
        onOpenChange={(v) => !v && setPreviewDoc(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              {previewDoc?.name}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.category} · Uploaded {previewDoc?.date}
            </DialogDescription>
          </DialogHeader>
          {previewDoc &&
            (() => {
              const ext =
                previewDoc.name.split(".").pop()?.toLowerCase() ?? "";
              const url = previewDoc.file_url;
              if (!url) {
                return (
                  <div className="rounded-lg bg-muted/40 border border-border p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
                    <FileText className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground text-center">
                      Preview unavailable for this file type. Download to view.
                    </p>
                  </div>
                );
              }
              if (ext === "pdf") {
                return (
                  <iframe
                    src={url}
                    className="w-full h-[500px] rounded border border-border"
                    title={previewDoc.name}
                  />
                );
              }
              if (["jpg", "jpeg", "png"].includes(ext)) {
                return (
                  <img
                    src={url}
                    alt={previewDoc.name}
                    className="max-h-[500px] w-full object-contain rounded"
                  />
                );
              }
              return (
                <div className="rounded-lg bg-muted/40 border border-border p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
                  <FileText className="w-12 h-12 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground text-center">
                    Preview unavailable for this file type. Download to view.
                  </p>
                </div>
              );
            })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewDoc) handleDownload(previewDoc);
                setPreviewDoc(null);
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit subfolder dialog ── */}
      <Dialog open={editingDoc !== null} onOpenChange={(o) => { if (!o) setEditingDoc(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to Subfolder</DialogTitle>
            <DialogDescription>Assign this file to a subfolder within <strong>{editingDoc?.category ?? "this folder"}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input
              type="text"
              placeholder="Subfolder name (leave blank to remove)"
              value={editSubfolder}
              onChange={(e) => setEditSubfolder(e.target.value)}
              className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingDoc(null)}>Cancel</Button>
            <Button size="sm" onClick={async () => {
              if (!editingDoc) return;
              try {
                await updateMutation.mutateAsync({ id: editingDoc.id, subfolder: editSubfolder });
                toast("Subfolder updated");
                setEditingDoc(null);
              } catch { toast("Failed to update subfolder"); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this document? This action cannot
              be undone.
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
