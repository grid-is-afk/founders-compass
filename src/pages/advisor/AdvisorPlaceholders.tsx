import { useState, useRef } from "react";
import {
  FileText, Upload, FolderOpen, Search, Filter, Download,
  CheckCircle2, Clock, Circle, AlertCircle, FileSpreadsheet,
  FileIcon, CheckSquare, ChevronDown, ChevronRight,
  Share2, Eye, ExternalLink, Zap, Edit3, Lock,
  Send, Globe, Users, XCircle,
} from "lucide-react";
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
import { useClientDocuments } from "@/hooks/useDocuments";
import { useClientTasks } from "@/hooks/useTasks";
import { useClientDeliverables } from "@/hooks/useDeliverables";
import ShareInvestorPortal from "@/components/ShareInvestorPortal";
import { useClientContext } from "@/hooks/useClientContext";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const FileTypeIcon = ({ type }: { type: "pdf" | "spreadsheet" | "document" }) => {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "spreadsheet") return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  return <FileIcon className="w-4 h-4 text-blue-500" />;
};

// ---------------------------------------------------------------------------
// AdvisorUploads — Financial Uploads
// ---------------------------------------------------------------------------

const requiredDocs = [
  { label: "Tax Returns — 2022", uploaded: true },
  { label: "Tax Returns — 2023", uploaded: true },
  { label: "Tax Returns — 2024", uploaded: false },
  { label: "Operating Agreements", uploaded: true },
  { label: "Financial Statements (3 years)", uploaded: true },
  { label: "Customer Revenue Data", uploaded: false },
];

export const AdvisorUploads = () => {
  const { selectedClient } = useClientContext();
  const { data: apiDocs = [] } = useClientDocuments(selectedClient.id);
  const [dragging, setDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string; name: string; category: string; date: string; size: string; type: "pdf" | "spreadsheet" | "document";
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (name: string): "pdf" | "spreadsheet" | "document" => {
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return "spreadsheet";
    return "document";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newDocs = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: file.name,
      category: "Uploads",
      date: now,
      size: formatFileSize(file.size),
      type: getFileType(file.name),
    }));
    setUploadedFiles((prev) => [...newDocs, ...prev]);
    toast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`, {
      description: Array.from(files).map((f) => f.name).join(", "),
    });
  };

  const apiDocsMapped = (apiDocs as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "Uploads",
    date: d.uploaded_at
      ? new Date(d.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    size: d.size ?? "—",
    type: (d.type ?? "document") as "pdf" | "spreadsheet" | "document",
  }));
  const allDocs = [...uploadedFiles, ...apiDocsMapped];
  const uploadedCount = requiredDocs.filter((d) => d.uploaded).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Financial Uploads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage document uploads for {selectedClient.name}
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Upload zone + document table */}
        <div className="col-span-2 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
              dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">Accepts PDF, XLSX, DOCX — up to 50 MB per file</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse Files
            </Button>
          </div>

          {/* Document table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40">
              <p className="text-sm font-semibold text-foreground">Uploaded Documents</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Size</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {allDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileTypeIcon type={doc.type} />
                        <span className="text-foreground font-medium text-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{doc.category}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{doc.date}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{doc.size}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toast("Downloading", { description: doc.name })}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Required checklist */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Required Documents</p>
              <Badge variant="outline" className="text-[10px]">{uploadedCount}/{requiredDocs.length}</Badge>
            </div>
            <div className="p-4 space-y-3">
              {requiredDocs.map((doc) => (
                <div key={doc.label} className="flex items-center gap-3">
                  {doc.uploaded ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn("text-xs", doc.uploaded ? "text-foreground" : "text-muted-foreground")}>
                    {doc.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(uploadedCount / requiredDocs.length) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {uploadedCount} of {requiredDocs.length} required documents uploaded
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AdvisorDataRoom — Data Room
// ---------------------------------------------------------------------------

const categories = ["All", "Reports", "Financials", "Customer Capital", "Legal & Structure", "Governance"];

export const AdvisorDataRoom = () => {
  const { selectedClient } = useClientContext();
  const { data: apiDocs = [] } = useClientDocuments(selectedClient.id);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; category: string; date: string; size: string; type: "pdf" | "spreadsheet" | "document" }>>([]);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; category: string; date: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (name: string): "pdf" | "spreadsheet" | "document" => {
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return "spreadsheet";
    return "document";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newDocs = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: file.name,
      category: "Uploads",
      date: now,
      size: formatFileSize(file.size),
      type: getFileType(file.name),
    }));
    setUploadedFiles((prev) => [...newDocs, ...prev]);
    toast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`, {
      description: Array.from(files).map((f) => f.name).join(", "),
    });
  };

  const apiDocsMapped2 = (apiDocs as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "Uploads",
    date: d.uploaded_at
      ? new Date(d.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    size: d.size ?? "—",
    type: (d.type ?? "document") as "pdf" | "spreadsheet" | "document",
  }));
  const allDocs = [...uploadedFiles, ...apiDocsMapped2];

  const filtered = allDocs.filter((doc) => {
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalSize = "9.0 MB";
  const lastUpdated = "Mar 5, 2026";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Data Room</h1>
          <p className="text-muted-foreground mt-1 text-sm">{selectedClient.name} — upload and manage capital readiness materials</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowUpload(!showUpload)}>
            <Upload className="w-3.5 h-3.5" />{showUpload ? "Hide Upload" : "Upload Files"}
          </Button>
          <ShareInvestorPortal />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Upload zone — toggleable */}
      {showUpload && (
        <div
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className={cn("w-8 h-8 mx-auto mb-3", dragging ? "text-primary" : "text-muted-foreground")} />
          <p className="text-sm font-medium text-foreground mb-1">
            {dragging ? "Drop files to upload" : "Drag files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">PDF, Excel, Word — up to 50MB per file</p>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Browse Files
          </Button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Documents", value: String(allDocs.length) },
          { label: "Total Size", value: totalSize },
          { label: "Last Updated", value: lastUpdated },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border px-5 py-3">
            <p className="text-xl font-bold font-display text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-input hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Size</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  No documents match your filters
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileTypeIcon type={doc.type} />
                      <span className="text-foreground font-medium text-xs">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] px-2 py-0">{doc.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{doc.date}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{doc.size}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setPreviewDoc({ name: doc.name, category: doc.category, date: doc.date })}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toast("Downloading", { description: doc.name })}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Document preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(v) => !v && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              {previewDoc?.name}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.category} · Uploaded {previewDoc?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/40 border border-border p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center">
              Document preview for <span className="font-medium text-foreground">{previewDoc?.name}</span>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              This document is stored securely in the {selectedClient.name} data room and is available for download or sharing.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            <Button onClick={() => { toast("Downloading", { description: previewDoc?.name }); setPreviewDoc(null); }} className="gap-2">
              <Download className="w-4 h-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AdvisorSprints — Sprint Planning
// ---------------------------------------------------------------------------

type TaskStatus = "done" | "in_progress" | "todo";

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string }> = {
  done: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    label: "Done",
    color: "text-emerald-600",
  },
  in_progress: {
    icon: <Clock className="w-4 h-4 text-accent" />,
    label: "In Progress",
    color: "text-accent",
  },
  todo: {
    icon: <Circle className="w-4 h-4 text-muted-foreground" />,
    label: "To Do",
    color: "text-muted-foreground",
  },
};

const priorityConfig: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-accent/10 text-accent border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
};

interface SprintTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string | null;
  due_date?: string | null;
  dueDate?: string;
  priority: string;
  subtasks: Array<{ id: string; title: string; done: boolean }>;
  linkedDocs?: Array<{ name: string; type: "pdf" | "spreadsheet" | "document" }>;
}

const SprintTaskCard = ({ task }: { task: SprintTask }) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[task.status];

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-2 py-0 capitalize", priorityConfig[task.priority])}
              >
                {task.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {task.assignee}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>Due {task.dueDate}</span>
            {task.subtasks.length > 0 && (
              <span>{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks</span>
            )}
            {task.linkedDocs.length > 0 && (
              <span>{task.linkedDocs.length} doc{task.linkedDocs.length > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        {(task.subtasks.length > 0 || task.linkedDocs.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-4 py-3 bg-muted/20 space-y-3">
          {task.subtasks.length > 0 && (
            <div className="space-y-1.5">
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2">
                  {st.done ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className={cn("text-xs", st.done ? "line-through text-muted-foreground" : "text-foreground")}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}
          {task.linkedDocs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.linkedDocs.map((doc) => (
                <div key={doc.name} className="flex items-center gap-1.5 px-2 py-1 rounded bg-card border border-border">
                  <FileTypeIcon type={doc.type} />
                  <span className="text-[11px] text-foreground">{doc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AdvisorSprints = () => {
  const { selectedClient } = useClientContext();
  const { data: rawTasks = [], isLoading: tasksLoading } = useClientTasks(selectedClient.id);

  const sprintTasks: SprintTask[] = (rawTasks as any[]).map((t) => ({
    id: t.id,
    title: t.title,
    status: (t.status ?? "todo") as TaskStatus,
    assignee: t.assignee ?? null,
    due_date: t.due_date ?? null,
    dueDate: t.due_date
      ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    priority: t.priority ?? "medium",
    subtasks: (t.subtasks ?? []).map((s: any) => ({ id: s.id, title: s.title, done: s.done ?? false })),
    linkedDocs: [],
  }));

  const total = sprintTasks.length;
  const done = sprintTasks.filter((t) => t.status === "done").length;
  const inProgress = sprintTasks.filter((t) => t.status === "in_progress").length;
  const todo = sprintTasks.filter((t) => t.status === "todo").length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped: Record<TaskStatus, SprintTask[]> = {
    done: sprintTasks.filter((t) => t.status === "done"),
    in_progress: sprintTasks.filter((t) => t.status === "in_progress"),
    todo: sprintTasks.filter((t) => t.status === "todo"),
  };

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">90-Day Sprint Planning</h1>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">90-Day Sprint Planning</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {selectedClient.name} — execution sprint
        </p>
      </div>

      {total === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No sprint tasks yet</h3>
          <p className="text-sm text-muted-foreground">Tasks created for this client will appear here.</p>
        </div>
      )}

      {total > 0 && (
      <>
      {/* Progress + stats */}
      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Sprint Progress</p>
          <span className="text-sm font-bold text-foreground font-display">{progressPct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-6">
          {[
            { label: "Done", count: done, color: "text-emerald-600" },
            { label: "In Progress", count: inProgress, color: "text-accent" },
            { label: "To Do", count: todo, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label}>
              <p className={cn("text-2xl font-bold font-display", s.color)}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Task columns */}
      <div className="grid grid-cols-3 gap-4">
        {(["done", "in_progress", "todo"] as TaskStatus[]).map((status) => {
          const config = statusConfig[status];
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                {config.icon}
                <p className={cn("text-xs font-semibold uppercase tracking-wide", config.color)}>
                  {config.label}
                </p>
                <span className="ml-auto text-xs text-muted-foreground">{grouped[status].length}</span>
              </div>
              {grouped[status].length === 0 ? (
                <div className="bg-card rounded-lg border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                grouped[status].map((task) => <SprintTaskCard key={task.id} task={task} />)
              )}
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AdvisorReports — Reports & Deliverables
// ---------------------------------------------------------------------------

const deliverableStatusConfig: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready to Generate", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  draft: { label: "Draft", color: "bg-accent/10 text-accent border-accent/20" },
  needs_data: { label: "Needs Data", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  pending: { label: "Pending", color: "bg-muted text-muted-foreground border-border" },
};

const missingData: Record<string, string> = {
  "del3": "Missing: Revenue segmentation, 2024 tax returns",
  "del7": "Missing: Governance assessment, Q1 board minutes",
};

const publishedReports: { title: string; client: string; date: string; engine: string }[] = [];

const reportContent: Record<string, string> = {};

interface GenerateDialogState {
  open: boolean;
  title: string;
  phase: "generating" | "done";
}

interface EditDialogState {
  open: boolean;
  title: string;
  content: string;
}

export const AdvisorReports = () => {
  const { selectedClient } = useClientContext();
  const { data: rawDeliverables = [] } = useClientDeliverables(selectedClient.id);

  const copilotDeliverables = (rawDeliverables as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    client: selectedClient.name,
    status: (d.status ?? "pending") as "ready" | "draft" | "needs_data" | "pending",
    engine: d.engine ?? "Performance",
  }));

  const [generateDialog, setGenerateDialog] = useState<GenerateDialogState>({
    open: false,
    title: "",
    phase: "generating",
  });
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    title: "",
    content: "",
  });
  const [reportPreview, setReportPreview] = useState<{ title: string; content: string } | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleGenerate = (title: string) => {
    setGenerateDialog({ open: true, title, phase: "generating" });
    setTimeout(() => {
      setGenerateDialog((prev) => ({ ...prev, phase: "done" }));
    }, 2000);
  };

  const handleEdit = (title: string) => {
    const draftContent = `DRAFT — ${title.toUpperCase()}
${selectedClient.name} | In Progress

[Section 1: Executive Summary]
This report is currently being prepared for ${selectedClient.name}. The following sections require review and completion before publication.

[Section 2: Key Findings]
• Finding 1: [Placeholder — review source data]
• Finding 2: [Placeholder — confirm with advisor]
• Finding 3: [Placeholder — pending Q1 data]

[Section 3: Recommendations]
Based on the preliminary analysis, the following actions are recommended:
1. [Action item pending review]
2. [Action item pending review]

[NOTES FOR ADVISOR]
This draft requires sign-off from the client before publication. Please confirm the financial figures in Section 2 against the uploaded statements.`;
    setEditContent(draftContent);
    setEditDialog({ open: true, title, content: draftContent });
  };

  const handleReportPreview = (title: string) => {
    const content = reportContent[title] ?? `REPORT: ${title}\n\nThis report has been published and is available for distribution to the assigned audience.`;
    setReportPreview({ title, content });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Reports & Deliverables</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate, edit, and publish institutional-quality reports for your clients
        </p>
      </div>

      {/* Deliverable cards */}
      <div>
        <h2 className="text-base font-display font-semibold text-foreground mb-3">Deliverables Queue</h2>
        {copilotDeliverables.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground mb-1">No deliverables yet</h3>
            <p className="text-sm text-muted-foreground">Deliverables for this client will appear here.</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4">
          {copilotDeliverables.map((del) => {
            const config = deliverableStatusConfig[del.status];
            return (
              <div
                key={del.id}
                className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{del.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{del.client}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0 whitespace-nowrap", config.color)}>
                    {config.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {del.engine}
                  </span>
                </div>

                {del.status === "needs_data" && missingData[del.id] && (
                  <div className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600">{missingData[del.id]}</p>
                  </div>
                )}

                <div className="mt-auto">
                  {del.status === "ready" && (
                    <Button
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => handleGenerate(del.title)}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Generate Report
                    </Button>
                  )}
                  {del.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => handleEdit(del.title)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Continue Editing
                    </Button>
                  )}
                  {del.status === "needs_data" && (
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" disabled>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Data Required
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Published reports */}
      <div>
        <h2 className="text-base font-display font-semibold text-foreground mb-3">Published Reports</h2>
        {publishedReports.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground mb-1">No published reports yet</h3>
            <p className="text-sm text-muted-foreground">Generate and publish reports from the Deliverables Queue above.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Report</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Engine</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Published</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {publishedReports.map((r) => (
                  <tr key={r.title} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-medium text-foreground">{r.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.client}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">{r.engine}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handleReportPreview(r.title)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Dialog */}
      <Dialog open={generateDialog.open} onOpenChange={(v) => !v && setGenerateDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {generateDialog.phase === "generating" ? "Generating Report..." : "Report Ready"}
            </DialogTitle>
            <DialogDescription>{generateDialog.title} — {selectedClient.name}</DialogDescription>
          </DialogHeader>
          {generateDialog.phase === "generating" ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Analyzing client data...</p>
                <p className="text-xs text-muted-foreground mt-1">Pulling from data room and CoPilot intelligence</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Report generated successfully</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ready to review, edit, and publish</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 font-mono text-xs text-muted-foreground">
                <p className="font-semibold text-foreground text-sm">{generateDialog.title}</p>
                <p>Client: {selectedClient.name}</p>
                <p>Score: 72/100 · Pages: 8 · Engine: Performance</p>
                <p>Generated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-foreground font-semibold mb-1">Executive Summary</p>
                  <p className="leading-relaxed">{selectedClient.name} demonstrates strong capital readiness fundamentals. This report has been generated based on available client data and is ready for advisor review before publication.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateDialog((p) => ({ ...p, open: false }))}>
                  Close
                </Button>
                <Button onClick={() => {
                  toast("Report published", { description: `${generateDialog.title} is now live` });
                  setGenerateDialog((p) => ({ ...p, open: false }));
                }} className="gap-2">
                  <Send className="w-4 h-4" /> Publish Report
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Continue Editing Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(v) => !v && setEditDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Draft</DialogTitle>
            <DialogDescription>{editDialog.title} — {selectedClient.name}</DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full h-72 px-3 py-2.5 rounded-md border border-input bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog((p) => ({ ...p, open: false }))}>
              Discard Changes
            </Button>
            <Button onClick={() => {
              toast("Draft saved", { description: `${editDialog.title} draft updated` });
              setEditDialog((p) => ({ ...p, open: false }));
            }} className="gap-2">
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Preview Dialog */}
      <Dialog open={!!reportPreview} onOpenChange={(v) => !v && setReportPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              {reportPreview?.title}
            </DialogTitle>
            <DialogDescription>Published report — {selectedClient.name}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/30 border border-border p-5 max-h-96 overflow-y-auto">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {reportPreview?.content}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportPreview(null)}>Close</Button>
            <Button onClick={() => { toast("Downloading report", { description: reportPreview?.title }); setReportPreview(null); }} className="gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AdvisorPublish — Publish Controls
// ---------------------------------------------------------------------------

type PublishStatus = "published" | "draft" | "pending";
type Audience = "Client" | "Investor" | "Internal";

interface PublishItem {
  id: string;
  title: string;
  client: string;
  status: PublishStatus;
  audience: Audience;
  date: string;
}

const initialPublishedItems: PublishItem[] = [];

const publishStatusConfig: Record<PublishStatus, { label: string; color: string; icon: React.ReactNode }> = {
  published: {
    label: "Published",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: <Globe className="w-3 h-3" />,
  },
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground border-border",
    icon: <Edit3 className="w-3 h-3" />,
  },
  pending: {
    label: "Pending Review",
    color: "bg-accent/10 text-accent border-accent/20",
    icon: <Clock className="w-3 h-3" />,
  },
};

const audienceConfig: Record<Audience, string> = {
  Client: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Investor: "bg-primary/10 text-primary border-primary/20",
  Internal: "bg-muted text-muted-foreground border-border",
};

const availableDocuments = [
  "Founder Business Index Report",
  "Wealth Gap Analysis",
  "Capital Strategy Architecture",
  "Protection Architecture Summary",
  "Customer Concentration Analysis",
  "Q2 Sprint Progress Report",
];

export const AdvisorPublish = () => {
  const { selectedClient } = useClientContext();
  const [items, setItems] = useState<PublishItem[]>(initialPublishedItems);
  const [publishNewOpen, setPublishNewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<PublishItem | null>(null);
  const [unpublishItem, setUnpublishItem] = useState<PublishItem | null>(null);
  const [newDoc, setNewDoc] = useState("");
  const [newAudience, setNewAudience] = useState<Audience>("Client");

  const handlePublish = () => {
    if (!newDoc) return;
    const newItem: PublishItem = {
      id: `pub${Date.now()}`,
      title: newDoc,
      client: selectedClient.name,
      status: "published",
      audience: newAudience,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setItems((prev) => [newItem, ...prev]);
    setPublishNewOpen(false);
    setNewDoc("");
    setNewAudience("Client");
    toast("Document published", { description: `${newDoc} is now live for ${newAudience}s` });
  };

  const handleUnpublish = () => {
    if (!unpublishItem) return;
    setItems((prev) => prev.map((i) => i.id === unpublishItem.id ? { ...i, status: "draft" } : i));
    setUnpublishItem(null);
    toast("Document unpublished", { description: `${unpublishItem.title} moved to drafts` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Publish & Share</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control which reports and materials are visible to clients, investors, and partners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareInvestorPortal />
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setPublishNewOpen(true)}
          >
            <Send className="w-3.5 h-3.5" />
            Publish New
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Published", count: items.filter((p) => p.status === "published").length, color: "text-emerald-600" },
          { label: "Pending Review", count: items.filter((p) => p.status === "pending").length, color: "text-accent" },
          { label: "Drafts", count: items.filter((p) => p.status === "draft").length, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border px-5 py-3">
            <p className={cn("text-2xl font-bold font-display", s.color)}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Publish table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Audience</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const sc = publishStatusConfig[item.status];
              return (
                <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.client}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 gap-1", sc.color)}>
                      {sc.icon}
                      {sc.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0", audienceConfig[item.audience])}>
                      {item.audience}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        onClick={() => setViewItem(item)}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {item.status === "published" && (
                        <button
                          className="text-xs text-red-500/70 hover:text-red-500 transition-colors flex items-center gap-1"
                          onClick={() => setUnpublishItem(item)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Unpublish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Publish New Dialog */}
      <Dialog open={publishNewOpen} onOpenChange={setPublishNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Publish New Document</DialogTitle>
            <DialogDescription>Select a document and audience to publish to the portal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Document</label>
              <select
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a document...</option>
                {availableDocuments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Audience</label>
              <div className="flex gap-2">
                {(["Client", "Investor", "Internal"] as Audience[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewAudience(a)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors border",
                      newAudience === a
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-input hover:text-foreground"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {newDoc && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{newDoc}</span> will be published to the <span className="font-medium text-foreground">{newAudience}</span> portal for {selectedClient.name}.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishNewOpen(false)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={!newDoc} className="gap-2">
              <Send className="w-4 h-4" /> Confirm & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              {viewItem?.title}
            </DialogTitle>
            <DialogDescription>
              {viewItem?.client} · {viewItem?.audience} audience · {viewItem?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/30 border border-border p-5 min-h-[200px] space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] px-2 py-0 gap-1", viewItem ? publishStatusConfig[viewItem.status].color : "")}>
                {viewItem && publishStatusConfig[viewItem.status].icon}
                {viewItem && publishStatusConfig[viewItem.status].label}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] px-2 py-0", viewItem ? audienceConfig[viewItem.audience] : "")}>
                {viewItem?.audience}
              </Badge>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-foreground font-semibold">{viewItem?.title}</p>
              <p className="text-xs text-muted-foreground mt-1">Client: {viewItem?.client}</p>
              <p className="text-xs text-muted-foreground">Published: {viewItem?.date}</p>
              <div className="mt-4 p-4 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground italic">
                  This document is securely stored and accessible to authorized {viewItem?.audience.toLowerCase()}s. Downloads are watermarked with recipient identity. All access is logged.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            <Button onClick={() => { toast("Downloading", { description: viewItem?.title }); setViewItem(null); }} className="gap-2">
              <Download className="w-4 h-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={!!unpublishItem} onOpenChange={(v) => !v && setUnpublishItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Unpublish Document?</DialogTitle>
            <DialogDescription>
              This will remove <span className="font-medium text-foreground">{unpublishItem?.title}</span> from the {unpublishItem?.audience} portal. It will be moved to Drafts.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-xs text-destructive">
              Existing share links to this document will stop working immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpublishItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnpublish}>
              Yes, Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AdvisorInvestorShare — Investor Share Portal
// ---------------------------------------------------------------------------

interface ShareLink {
  id: string;
  recipient: string;
  email: string;
  type: string;
  created: string;
  expires: string;
  views: number;
  downloads: number;
  revoked?: boolean;
}

const initialShareLinks: ShareLink[] = [];

const accessLog = [
  { recipient: "James Whitfield", action: "Viewed Capital Readiness Memo", time: "2h ago" },
  { recipient: "Priya Nair", action: "Downloaded 3-Year Adjusted P&L", time: "4h ago" },
  { recipient: "Priya Nair", action: "Viewed Investor Portal", time: "6h ago" },
  { recipient: "James Whitfield", action: "Downloaded Customer Concentration Analysis", time: "1d ago" },
  { recipient: "Keith Alvarez", action: "Viewed Investor Portal", time: "2d ago" },
];

export const AdvisorInvestorShare = () => {
  const { selectedClient } = useClientContext();
  const [links, setLinks] = useState<ShareLink[]>(initialShareLinks);
  const [previewLink, setPreviewLink] = useState<ShareLink | null>(null);
  const [revokeLink, setRevokeLink] = useState<ShareLink | null>(null);

  const activeLinks = links.filter((l) => !l.revoked);

  const handleRevoke = () => {
    if (!revokeLink) return;
    setLinks((prev) => prev.map((l) => l.id === revokeLink.id ? { ...l, revoked: true } : l));
    setRevokeLink(null);
    toast("Access revoked", { description: `${revokeLink.recipient}'s portal access has been removed` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Investor Share Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage secure, watermarked share links for capital partners, buyers, and brokers
          </p>
        </div>
        <ShareInvestorPortal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Links", value: String(activeLinks.length) },
          { label: "Total Views", value: String(activeLinks.reduce((a, l) => a + l.views, 0)) },
          { label: "Total Downloads", value: String(activeLinks.reduce((a, l) => a + l.downloads, 0)) },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border px-5 py-3">
            <p className="text-2xl font-bold font-display text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active share links */}
      <div>
        <h2 className="text-base font-display font-semibold text-foreground mb-3">Active Share Links</h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Views</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Downloads</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {activeLinks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No active share links
                  </td>
                </tr>
              )}
              {activeLinks.map((link) => (
                <tr key={link.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{link.recipient}</p>
                    <p className="text-[11px] text-muted-foreground">{link.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] px-2 py-0">{link.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{link.created}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{link.expires}</td>
                  <td className="px-4 py-3 text-xs text-foreground font-medium">{link.views}</td>
                  <td className="px-4 py-3 text-xs text-foreground font-medium">{link.downloads}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setPreviewLink(link)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        onClick={() => setRevokeLink(link)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access log */}
      <div>
        <h2 className="text-base font-display font-semibold text-foreground mb-3">Access Log</h2>
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          {accessLog.map((entry, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <div>
                <p className="text-xs text-foreground leading-snug">
                  <span className="font-medium">{entry.recipient}</span> — {entry.action}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{entry.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-sm font-display font-semibold text-foreground mb-4">How It Works</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: "1", title: "Prepare Materials", desc: "Publish reports and organize the data room with curated documents." },
            { step: "2", title: "Generate Secure Link", desc: "Create a time-limited, watermarked share link for each recipient." },
            { step: "3", title: "Track Engagement", desc: "Monitor views, downloads, and activity from invited partners." },
          ].map((s) => (
            <div key={s.step} className="p-4 rounded-lg border border-border bg-background">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-xs font-bold text-primary font-display">{s.step}</span>
              </div>
              <p className="text-xs font-semibold text-foreground mb-1">{s.title}</p>
              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          <span>All downloads are watermarked with recipient identity. Access is fully logged.</span>
        </div>
      </div>

      {/* Portal Preview Dialog */}
      <Dialog open={!!previewLink} onOpenChange={(v) => !v && setPreviewLink(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Investor Portal Preview</DialogTitle>
            <DialogDescription>
              Viewing as <span className="font-medium text-foreground">{previewLink?.recipient}</span> ({previewLink?.type})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="text-xs font-semibold text-foreground mb-1">{selectedClient.name} — Capital Readiness Portal</p>
              <p className="text-[11px] text-muted-foreground">Secure access granted to {previewLink?.recipient}</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "Capital Readiness Memo.pdf", size: "2.4 MB" },
                { name: "3-Year Adjusted P&L.xlsx", size: "1.1 MB" },
                { name: "Customer Concentration Analysis.pdf", size: "0.8 MB" },
                { name: "Founder Business Index Report.pdf", size: "3.2 MB" },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-foreground font-medium">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <Lock className="w-3 h-3" />
              <span>Watermarked for {previewLink?.recipient} · Expires {previewLink?.expires}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/30 border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">{previewLink?.views}</p>
                <p className="text-muted-foreground">Total Views</p>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border p-3 text-center">
                <p className="text-xl font-bold text-foreground">{previewLink?.downloads}</p>
                <p className="text-muted-foreground">Downloads</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewLink(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeLink} onOpenChange={(v) => !v && setRevokeLink(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Revoke Access?</DialogTitle>
            <DialogDescription>
              This will immediately revoke portal access for <span className="font-medium text-foreground">{revokeLink?.recipient}</span>. They will no longer be able to view or download documents.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-xs text-destructive">
              This action cannot be undone. You will need to create a new share link to restore access.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeLink(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Yes, Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
