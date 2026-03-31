import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import TopBar from "./TopBar";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import CopilotTrigger from "@/components/copilot/CopilotTrigger";
import { ClientProvider } from "@/hooks/useClientContext";
import { clients } from "@/lib/mockData";

const AdvisorLayout = () => {
  // Mirror the selectedClientId here so CopilotProvider (outer) can receive the client name.
  // The source of truth remains inside ClientProvider/useClientContext for all pages.
  const [selectedClientId, setSelectedClientId] = useState("1");
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? clients[0];

  return (
    <CopilotProvider clientContext={selectedClient.name}>
      <ClientProvider
        initialClientId={selectedClientId}
        onClientChange={setSelectedClientId}
      >
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
      </ClientProvider>
    </CopilotProvider>
  );
};

export default AdvisorLayout;
