import { FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// A minimal, reusable document preview modal. Renders the file inline by type
// (PDF via <object>, images via <img>, HTML via sandboxed <iframe>) and falls
// back to a download prompt otherwise. Mirrors the client Data Room preview so
// prospect documents get the same behavior.

export interface PreviewableDoc {
  name: string;
  file_url?: string | null;
  category?: string | null;
  uploaded_at?: string | null;
}

interface DocumentPreviewDialogProps {
  doc: PreviewableDoc | null;
  onClose: () => void;
}

export function DocumentPreviewDialog({ doc, onClose }: DocumentPreviewDialogProps) {
  const ext = doc?.name.split(".").pop()?.toLowerCase() ?? "";
  const url = doc?.file_url ?? "";

  const renderBody = () => {
    if (!url) {
      return (
        <div className="rounded-lg bg-muted/40 border border-border p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
          <FileText className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground text-center">
            Preview unavailable for this file. Download to view.
          </p>
        </div>
      );
    }
    if (ext === "pdf") {
      return (
        <object data={url} type="application/pdf" className="w-full h-[500px] rounded border border-border">
          <div className="rounded-lg bg-muted/40 border border-border p-6 h-[500px] flex flex-col items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground text-center">PDF preview unavailable in this browser.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
              Open in new tab
            </a>
          </div>
        </object>
      );
    }
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <img src={url} alt={doc?.name} className="max-h-[500px] w-full object-contain rounded" />;
    }
    if (ext === "html") {
      return (
        <iframe
          src={url}
          sandbox="allow-same-origin allow-scripts"
          className="w-full h-[500px] rounded border border-border"
          title={doc?.name}
        />
      );
    }
    return (
      <div className="rounded-lg bg-muted/40 border border-border p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
        <FileText className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground text-center">Download to view this file type.</p>
      </div>
    );
  };

  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            {doc?.name}
          </DialogTitle>
          {doc?.category && (
            <DialogDescription>{doc.category}</DialogDescription>
          )}
        </DialogHeader>
        {doc && renderBody()}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {url && (
            <Button asChild className="gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4" /> Download
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
