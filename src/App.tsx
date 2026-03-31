import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

import AdvisorLayout from "./components/layout/AdvisorLayout";
import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";
import AdvisorClients from "./pages/advisor/AdvisorClients";
import AdvisorJourney from "./pages/advisor/AdvisorJourney";
import ProspectPipeline from "./pages/advisor/ProspectPipeline";
import InstrumentsPage from "./pages/advisor/InstrumentsPage";
import GrowLanePage from "./pages/advisor/GrowLanePage";
import ProtectionPage from "./pages/advisor/ProtectionPage";
import QuarterlyReviewPage from "./pages/advisor/QuarterlyReviewPage";
import CustomerCapital from "./pages/advisor/CustomerCapital";
import CapitalArchitecture from "./pages/advisor/CapitalArchitecture";
import PerformanceEngine from "./pages/advisor/PerformanceEngine";
import AdvisorAssessmentsPage from "./pages/advisor/AdvisorAssessmentsPage";
import {
  AdvisorUploads,
  AdvisorDataRoom,
  AdvisorSprints,
  AdvisorReports,
  AdvisorPublish,
  AdvisorInvestorShare,
} from "./pages/advisor/AdvisorPlaceholders";

import ClientLayout from "./components/layout/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import {
  ClientQuestionnaires,
  ClientUploads,
  ClientTasks,
  ClientReports,
  ClientMeetings,
} from "./pages/client/ClientPlaceholders";

import InvestorView from "./pages/investor/InvestorView";
import FounderExperience from "./pages/founder/FounderExperience";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Advisor Back Office */}
          <Route path="/advisor" element={<AdvisorLayout />}>
            <Route index element={<AdvisorDashboard />} />
            <Route path="clients" element={<AdvisorClients />} />

            {/* Journey (replaces workflow) */}
            <Route path="journey" element={<AdvisorJourney />} />
            <Route path="workflow" element={<Navigate to="/advisor/journey" replace />} />

            {/* New TFO pages */}
            <Route path="prospects" element={<ProspectPipeline />} />
            <Route path="instruments" element={<InstrumentsPage />} />
            <Route path="grow-lane" element={<GrowLanePage />} />
            <Route path="protection" element={<ProtectionPage />} />
            <Route path="quarterly-review" element={<QuarterlyReviewPage />} />

            {/* Legacy engine pages — still valuable as analytics views */}
            <Route path="capital-architecture" element={<CapitalArchitecture />} />
            <Route path="customer-capital" element={<CustomerCapital />} />
            <Route path="performance" element={<PerformanceEngine />} />

            <Route path="assessments" element={<AdvisorAssessmentsPage />} />
            <Route path="uploads" element={<AdvisorUploads />} />
            <Route path="data-room" element={<AdvisorDataRoom />} />
            <Route path="copilot" element={<Navigate to="/advisor" replace />} />
            <Route path="sprints" element={<AdvisorSprints />} />
            <Route path="reports" element={<AdvisorReports />} />
            <Route path="publish" element={<AdvisorPublish />} />
            <Route path="investor-share" element={<AdvisorInvestorShare />} />
          </Route>

          {/* Client Portal */}
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="questionnaires" element={<ClientQuestionnaires />} />
            <Route path="uploads" element={<ClientUploads />} />
            <Route path="tasks" element={<ClientTasks />} />
            <Route path="reports" element={<ClientReports />} />
            <Route path="meetings" element={<ClientMeetings />} />
          </Route>

          {/* Shared Experiences */}
          <Route path="/founder" element={<FounderExperience />} />
          <Route path="/investor" element={<InvestorView />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
