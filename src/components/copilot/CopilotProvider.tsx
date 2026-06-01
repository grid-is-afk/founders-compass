import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCopilot } from "@/hooks/useCopilot";
import { useAuth } from "@/lib/auth";
import type { ChatMessage } from "@/lib/copilotApi";

interface CopilotContextType {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  error: string | null;
  clientId: string | undefined;
  sendMessage: (text: string) => Promise<void>;
  cancelStream: () => void;
  clearConversation: () => void;
  setIsOpen: (open: boolean) => void;
  togglePanel: () => void;
  isDeepDive: boolean;
  setDeepDive: (deep: boolean) => void;
  deepDiveClientName: string | null;
  setDeepDiveClientName: (name: string | null) => void;
}

const CopilotContext = createContext<CopilotContextType | null>(null);

export function CopilotProvider({
  children,
  clientContext,
  clientId,
}: {
  children: ReactNode;
  clientContext?: string;
  clientId?: string;
}) {
  // Scope chat history to the logged-in advisor so one advisor's client
  // conversations are never loaded into another advisor's session.
  const { user } = useAuth();
  const copilot = useCopilot(clientContext, clientId, user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeepDive, setDeepDive] = useState(false);
  const [deepDiveClientName, setDeepDiveClientName] = useState<string | null>(null);
  const togglePanel = () => setIsOpen((prev) => !prev);

  // Reset deep-dive overlay when the advisor navigates between clients.
  // Without this, an open deep-dive on Client A persists into Client B's
  // workspace and renders Client A's briefing on the wrong page.
  useEffect(() => {
    setDeepDive(false);
    setDeepDiveClientName(null);
  }, [clientId]);

  return (
    <CopilotContext.Provider
      value={{
        ...copilot,
        clientId,
        isOpen,
        setIsOpen,
        togglePanel,
        isDeepDive,
        setDeepDive,
        deepDiveClientName,
        setDeepDiveClientName,
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilotContext() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilotContext must be used within CopilotProvider");
  return ctx;
}
