import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FileText,
  Upload,
  Trash2,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useProspectDocuments,
  useUploadProspectDocument,
  useDeleteDocument,
  type Document,
} from "@/hooks/useDocuments";
import type { ProspectShape } from "./ProspectWorkspace";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.join(",");

const CATEGORY_OPTIONS = [
  { value: "Financial", label: "Financial" },
  { value: "Legal", label: "Legal" },
  { value: "Assessment", label: "Assessment" },
  { value: "Other", label: "Other" },
];

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  Financial: "bg-blue-500/10 text-blue-700 border-blue-400/30",
  Legal: "bg-purple-500/10 text-purple-700 border-purple-400/30",
  Assessment: "bg-amber-500/10 text-amber-700 border-amber-400/30",
  Other: "bg-muted text-muted-foreground border-border",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProspectDocumentsTab() {
  const { prospect } = useOutletContext<{ prospect: ProspectShape }>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Other");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useProspectDocuments(prospect.id);
  const uploadDoc = useUploadProspectDocument();
  const deleteDoc = useDeleteDocument();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    try {
      await uploadDoc.mutateAsync({
        prospectId: prospect.id,
        file: selectedFile,
        category,
        onProgress: setUploadProgress,
      });
      toast.success(`"${selectedFile.name}" uploaded`);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    }
  };

  const handleDelete = async (doc: Document) => {
    setDeletingId(doc.id);
    try {
      await deleteDoc.mutateAsync({ id: doc.id, prospectId: prospect.id });
      toast.success(`"${doc.name}" removed`);
    } catch {
      toast.error("Failed to remove document");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4.5 h-4.5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Files uploaded for this prospect's record. Documents carry over when they become a client.
          </p>
        </div>
      </div>

      {/* Upload section */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-medium text-foreground">Upload a File</p>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleFileChange}
            className="hidden"
            id="prospect-file-input"
          />
          <label
            htmlFor="prospect-file-input"
            className="flex-1 flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {selectedFile ? selectedFile.name : "Choose file..."}
            </span>
          </label>

          {/* Category */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-sm w-full sm:w-36 flex-shrink-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress bar */}
        {uploadDoc.isPending && uploadProgress > 0 && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <Button
          size="sm"
          onClick={handleUpload}
          disabled={!selectedFile || uploadDoc.isPending}
          className="gap-1.5"
        >
          {uploadDoc.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploadDoc.isPending ? "Uploading..." : "Upload"}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Allowed: PDF, Excel, CSV, Word, images. Max 25 MB per file.
        </p>
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            No documents yet — upload files to preserve this prospect's record.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {doc.category && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${CATEGORY_BADGE_CLASS[doc.category] ?? CATEGORY_BADGE_CLASS["Other"]}`}
                    >
                      {doc.category}
                    </Badge>
                  )}
                  {doc.size && (
                    <span className="text-[11px] text-muted-foreground">{doc.size}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(doc.uploaded_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                className="gap-1.5 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
