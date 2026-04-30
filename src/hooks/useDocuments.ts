import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Document {
  id: string;
  client_id: string | null;
  prospect_id?: string | null;
  name: string;
  category: string | null;
  file_url: string | null;
  size: string | null;
  size_bytes: number;
  type: "pdf" | "spreadsheet" | "document";
  uploaded_by_role: "advisor" | "client";
  uploaded_at: string;
}

export interface StorageInfo {
  used_bytes: number;
  file_count: number;
  max_bytes: number;
}

export interface StagedFile {
  id: string;
  file: File;
  category: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useClientDocuments(clientId: string, refetchInterval?: number) {
  return useQuery<Document[]>({
    queryKey: ["documents", clientId],
    queryFn: async () => {
      const res = await apiFetch(`/documents?client_id=${clientId}`);
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !!clientId,
    refetchInterval,
  });
}

export function useClientStorage(clientId: string) {
  return useQuery<StorageInfo>({
    queryKey: ["documents-storage", clientId],
    queryFn: async () => {
      const res = await apiFetch(`/documents/storage?client_id=${clientId}`);
      if (!res.ok) throw new Error("Failed to load storage info");
      return res.json();
    },
    enabled: !!clientId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface UploadParams {
  clientId: string;
  stagedFiles: StagedFile[];
  uploadedByRole: "advisor" | "client";
  onProgress?: (fileIndex: number, percent: number) => void;
}

export function useUploadDocuments() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      stagedFiles,
      uploadedByRole,
      onProgress,
    }: UploadParams) => {
      const results: Document[] = [];

      for (let i = 0; i < stagedFiles.length; i++) {
        const { file, category } = stagedFiles[i];

        const formData = new FormData();
        formData.append("file", file);
        formData.append("client_id", clientId);
        formData.append("category", category);
        formData.append("uploaded_by_role", uploadedByRole);

        const token = localStorage.getItem("tfo-access-token");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && onProgress) {
              onProgress(i, Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 201) {
              results.push(JSON.parse(xhr.responseText) as Document);
              if (onProgress) onProgress(i, 100);
              resolve();
            } else {
              let errMsg = `Upload failed for "${file.name}"`;
              try {
                const body = JSON.parse(xhr.responseText);
                if (body.error) errMsg = body.error;
              } catch {}
              reject(new Error(errMsg));
            }
          });

          xhr.addEventListener("error", () => reject(new Error(`Network error uploading "${file.name}"`)));
          xhr.addEventListener("abort", () => reject(new Error(`Upload aborted for "${file.name}"`)));

          xhr.open("POST", "/api/documents");
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      }

      return results;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["documents-storage", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId?: string; prospectId?: string }) => {
      const res = await apiFetch(`/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      if (vars.clientId) {
        qc.invalidateQueries({ queryKey: ["documents", vars.clientId] });
        qc.invalidateQueries({ queryKey: ["documents-storage", vars.clientId] });
      }
      if (vars.prospectId) {
        qc.invalidateQueries({ queryKey: ["documents", "prospect", vars.prospectId] });
      }
    },
  });
}

// ── Prospect document hooks ───────────────────────────────────────────────────

export function useProspectDocuments(prospectId: string | null) {
  return useQuery<Document[]>({
    queryKey: ["documents", "prospect", prospectId],
    queryFn: async () => {
      const res = await apiFetch(`/documents?prospect_id=${prospectId}`);
      if (!res.ok) throw new Error("Failed to load prospect documents");
      return res.json();
    },
    enabled: !!prospectId,
  });
}

interface ProspectUploadParams {
  prospectId: string;
  file: File;
  category: string;
  onProgress?: (percent: number) => void;
}

export function useUploadProspectDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prospectId,
      file,
      category,
      onProgress,
    }: ProspectUploadParams): Promise<Document> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prospect_id", prospectId);
      formData.append("category", category);
      formData.append("uploaded_by_role", "advisor");

      const token = localStorage.getItem("tfo-access-token");

      return new Promise<Document>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 201) {
            if (onProgress) onProgress(100);
            resolve(JSON.parse(xhr.responseText) as Document);
          } else {
            let errMsg = `Upload failed for "${file.name}"`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (body.error) errMsg = body.error;
            } catch {}
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error(`Network error uploading "${file.name}"`))
        );
        xhr.addEventListener("abort", () =>
          reject(new Error(`Upload aborted for "${file.name}"`))
        );

        xhr.open("POST", "/api/documents");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", "prospect", vars.prospectId] });
    },
  });
}
