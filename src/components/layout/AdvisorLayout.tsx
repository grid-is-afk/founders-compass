import { Outlet, useMatch } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import TopBar from "./TopBar";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import CopilotTrigger from "@/components/copilot/CopilotTrigger";
import { ClientProvider } from "@/hooks/useClientContext";

// Reads the active clientId from the URL when inside a client workspace,
// so QB always knows which client the advisor is viewing.
const AdvisorLayoutInner = () => {
  const clientMatch = useMatch("/advisor/clients/:id/*");
  const clientId = clientMatch?.params.id;

  return (
    <CopilotProvider clientContext="" clientId={clientId}>
      <div className="flex min-h-screen bg-background">
        <AdvisorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <CopilotTrigger />
      <CopilotPanel />
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
