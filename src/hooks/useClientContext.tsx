import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ApiClient {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  stage: string;
  capital_readiness: number;
  customer_capital: number;
  performance_score: number;
  revenue: string | null;
  current_quarter: number;
  current_year: number;
  updated_at: string;
}

const FALLBACK_CLIENT: ApiClient = {
  id: "",
  name: "No clients",
  contact_name: null,
  contact_email: null,
  stage: "",
  capital_readiness: 0,
  customer_capital: 0,
  performance_score: 0,
  revenue: null,
  current_quarter: 1,
  current_year: new Date().getFullYear(),
  updated_at: new Date().toISOString(),
};

interface ClientContextType {
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  selectedClient: ApiClient;
  clients: ApiClient[];
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({
  children,
  initialClientId,
  onClientChange,
}: {
  children: ReactNode;
  initialClientId?: string;
  onClientChange?: (id: string) => void;
}) {
  const { user } = useAuth();
  const isClientRole = user?.role === "client";

  // Single query — works for both roles because the API handles it
  // For advisors: GET /api/clients returns all their clients (array)
  // For clients: GET /api/clients returns only their own record (array with 1 item)
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => api.get("/clients"),
    enabled: !!user,
  });

  // Normalize — ensure it's always an array
  const clients: ApiClient[] = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];

  const [selectedClientId, setSelectedClientIdState] = useState<string>(
    initialClientId ?? ""
  );

  // Auto-select first client once loaded
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientIdState(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const setSelectedClientId = useCallback(
    (id: string) => {
      setSelectedClientIdState(id);
      onClientChange?.(id);
    },
    [onClientChange]
  );

  const selectedClient: ApiClient =
    clients.find((c) => c.id === selectedClientId) ??
    clients[0] ??
    FALLBACK_CLIENT;

  return (
    <ClientContext.Provider
      value={{ selectedClientId, setSelectedClientId, selectedClient, clients, isLoading }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClientContext must be used within ClientProvider");
  return ctx;
}
