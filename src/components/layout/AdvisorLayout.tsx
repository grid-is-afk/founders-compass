import { Outlet } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import TopBar from "./TopBar";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import { ClientProvider, useClientContext } from "@/hooks/useClientContext";

// Inner component that reads selectedClientId from ClientContext
// and forwards it to CopilotProvider so the AI knows which client is active.
const AdvisorLayoutInner = () => {
  const { selectedClientId } = useClientContext();

  return (
    <CopilotProvider clientContext="" clientId={selectedClientId || undefined}>
      <div className="flex min-h-screen bg-background">
        <AdvisorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </CopilotProvider>
  );
};

const AdvisorLayout = () => {
  return (
    <ClientProvider>
      <AdvisorLayoutInner />
    </ClientProvider>
  );
};

export default AdvisorLayout;
