import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCopilot } from "@/hooks/useCopilot";
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
  const copilot = useCopilot(clientContext, clientId);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeepDive, setDeepDive] = useState(false);
  const togglePanel = () => setIsOpen((prev) => !prev);

  // Reset deep-dive overlay when the advisor navigates between clients.
  // Without this, an open deep-dive on Client A persists into Client B's
  // workspace and renders Client A's briefing on the wrong page.
  useEffect(() => {
    setDeepDive(false);
  }, [clientId]);

  return (
    <CopilotContext.Provider
      value={{ ...copilot, clientId, isOpen, setIsOpen, togglePanel, isDeepDive, setDeepDive }}
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
