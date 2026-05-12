import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients"),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => api.get(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/clients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useArchivedClients() {
  return useQuery({
    queryKey: ["clients", "archived"],
    queryFn: () => api.get("/clients?archived=true"),
  });
}

export function useArchiveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/clients/${id}/archive`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useRestoreClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/clients/${id}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/** @deprecated Use useArchiveClient instead */
export const useDeleteClient = useArchiveClient;
