import { createContext, useContext, useState, type ReactNode } from "react";
import { useCopilot } from "@/hooks/useCopilot";
import type { ChatMessage } from "@/lib/copilotApi";

interface CopilotContextType {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  cancelStream: () => void;
  clearConversation: () => void;
  setIsOpen: (open: boolean) => void;
  togglePanel: () => void;
}

const CopilotContext = createContext<CopilotContextType | null>(null);

export function CopilotProvider({
  children,
  clientContext,
}: {
  children: ReactNode;
  clientContext?: string;
}) {
  const copilot = useCopilot(clientContext);
  const [isOpen, setIsOpen] = useState(false);
  const togglePanel = () => setIsOpen((prev) => !prev);

  return (
    <CopilotContext.Provider value={{ ...copilot, isOpen, setIsOpen, togglePanel }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilotContext() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilotContext must be used within CopilotProvider");
  return ctx;
}
