import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Document {
  id: string;
  client_id: string | null;
  prospect_id?: string | null;
  name: string;
  category: string | null;
  subfolder: string | null;
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
  subfolder?: string;
  sourceFolderName?: string;
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
        const { file, category, subfolder } = stagedFiles[i];

        const formData = new FormData();
        formData.append("file", file);
        formData.append("client_id", clientId);
        formData.append("category", category);
        formData.append("subfolder", subfolder ?? "");
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

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category, subfolder }: { id: string; category?: string; subfolder?: string }) => {
      const res = await apiFetch(`/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subfolder }),
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ── Folder hooks ─────────────────────────────────────────────────────────────

export interface DataRoomFolder {
  id: string;
  client_id: string;
  category: string;
  name: string;
  created_at: string;
}

export function useClientFolders(clientId: string, category?: string) {
  return useQuery<DataRoomFolder[]>({
    queryKey: ["data-room-folders", clientId, category ?? "all"],
    queryFn: async () => {
      const url = `/documents/folders?client_id=${clientId}${category ? `&category=${encodeURIComponent(category)}` : ""}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to load folders");
      return res.json();
    },
    enabled: !!clientId,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, category, name }: { client_id: string; category: string; name: string }) => {
      const res = await apiFetch("/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, category, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to create folder");
      }
      return res.json() as Promise<DataRoomFolder>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["data-room-folders", vars.client_id] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const res = await apiFetch(`/documents/folders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete folder");
      return { id, client_id };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["data-room-folders", vars.client_id] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, category }: { client_id: string; category: string }) => {
      const res = await apiFetch("/documents/categories/by-name", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, category }),
      });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json() as Promise<{ ok: boolean; docsDeleted: number }>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["documents", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["documents-storage", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["data-room-folders", vars.client_id] });
    },
  });
}

export function useDeleteSubfolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, category, name }: { client_id: string; category: string; name: string }) => {
      const res = await apiFetch("/documents/folders/by-name", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, category, name }),
      });
      if (!res.ok) throw new Error("Failed to delete subfolder");
      return res.json() as Promise<{ ok: boolean; docsCleared: number }>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["data-room-folders", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["documents", vars.client_id] });
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
