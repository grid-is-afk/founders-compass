import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import AdvisorLayout from "./components/layout/AdvisorLayout";
import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";
import AdvisorClients from "./pages/advisor/AdvisorClients";
import ProspectPipeline from "./pages/advisor/ProspectPipeline";
import GrowLanePage from "./pages/advisor/GrowLanePage";
import ProtectionPage from "./pages/advisor/ProtectionPage";
import QuarterlyReviewPage from "./pages/advisor/QuarterlyReviewPage";
import CustomerCapital from "./pages/advisor/CustomerCapital";
import CapitalArchitecture from "./pages/advisor/CapitalArchitecture";
import PerformanceEngine from "./pages/advisor/PerformanceEngine";
import AdvisorAssessmentsPage from "./pages/advisor/AdvisorAssessmentsPage";
import CopilotPage from "./pages/advisor/CopilotPage";
import CapitalStrategyRoadmap from "./pages/advisor/CapitalStrategyRoadmap";
import {
  AdvisorDataRoom,
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
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Advisor Back Office */}
            <Route
              path="/advisor"
              element={
                <ProtectedRoute>
                  <AdvisorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdvisorDashboard />} />
              <Route path="clients" element={<AdvisorClients />} />

              {/* TFO pages */}
              <Route path="prospects" element={<ProspectPipeline />} />
              <Route path="grow-lane" element={<GrowLanePage />} />
              <Route path="protection" element={<ProtectionPage />} />
              <Route path="quarterly-review" element={<QuarterlyReviewPage />} />

              {/* Engine analytics pages */}
              <Route path="capital-architecture" element={<CapitalArchitecture />} />
              <Route path="customer-capital" element={<CustomerCapital />} />
              <Route path="performance" element={<PerformanceEngine />} />

              <Route path="assessments" element={<AdvisorAssessmentsPage />} />
              <Route path="uploads" element={<Navigate to="/advisor/data-room" replace />} />
              <Route path="data-room" element={<AdvisorDataRoom />} />
              <Route path="copilot" element={<CopilotPage />} />
              <Route path="reports" element={<AdvisorReports />} />
              <Route path="publish" element={<AdvisorPublish />} />
              <Route path="investor-share" element={<AdvisorInvestorShare />} />
              <Route path="capital-strategy-roadmap" element={<CapitalStrategyRoadmap />} />
            </Route>

            {/* Protected Client Portal */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientDashboard />} />
              <Route path="questionnaires" element={<ClientQuestionnaires />} />
              <Route path="uploads" element={<ClientUploads />} />
              <Route path="tasks" element={<ClientTasks />} />
              <Route path="reports" element={<ClientReports />} />
              <Route path="meetings" element={<ClientMeetings />} />
            </Route>

            {/* Public shared experiences */}
            <Route path="/founder" element={<FounderExperience />} />
            <Route path="/investor" element={<InvestorView />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
