import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { clients } from "@/lib/mockData";

interface ClientContextType {
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  selectedClient: typeof clients[0];
}

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({
  children,
  initialClientId = "1",
  onClientChange,
}: {
  children: ReactNode;
  initialClientId?: string;
  onClientChange?: (id: string) => void;
}) {
  const [selectedClientId, setSelectedClientIdState] = useState(initialClientId);
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? clients[0];

  const setSelectedClientId = useCallback(
    (id: string) => {
      setSelectedClientIdState(id);
      onClientChange?.(id);
    },
    [onClientChange]
  );

  return (
    <ClientContext.Provider value={{ selectedClientId, setSelectedClientId, selectedClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClientContext must be used within ClientProvider");
  return ctx;
}
