import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import TopBar from "./TopBar";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import { ClientProvider } from "@/hooks/useClientContext";

const AdvisorLayout = () => {
  const [selectedClientId, setSelectedClientId] = useState("");

  return (
    <CopilotProvider clientContext="">
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
      </ClientProvider>
    </CopilotProvider>
  );
};

export default AdvisorLayout;
