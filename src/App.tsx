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
import ClientListPage from "./pages/advisor/ClientListPage";
import ClientWorkspace from "./pages/advisor/ClientWorkspace";
import Q1DiscoverPage from "./pages/advisor/Q1DiscoverPage";
import Q2Page from "./pages/advisor/Q2Page";
import Q3Page from "./pages/advisor/Q3Page";
import Q4Page from "./pages/advisor/Q4Page";
import ClientDashboardTab from "./pages/advisor/ClientDashboardTab";
import ClientDataRoomTab from "./pages/advisor/ClientDataRoomTab";
import ProspectPipeline from "./pages/advisor/ProspectPipeline";
import ProspectWorkspace from "./pages/advisor/ProspectWorkspace";
import ProspectOverviewTab from "./pages/advisor/ProspectOverviewTab";
import ProspectAssessmentsTab from "./pages/advisor/ProspectAssessmentsTab";
import ProspectDocumentsTab from "./pages/advisor/ProspectDocumentsTab";
import GrowLanePage from "./pages/advisor/GrowLanePage";
import ProtectionPage from "./pages/advisor/ProtectionPage";
import QuarterlyReviewPage from "./pages/advisor/QuarterlyReviewPage";
import CustomerCapital from "./pages/advisor/CustomerCapital";
import CapitalArchitecture from "./pages/advisor/CapitalArchitecture";
import PerformanceEngine from "./pages/advisor/PerformanceEngine";
import AdvisorAssessmentsPage from "./pages/advisor/AdvisorAssessmentsPage";
import CopilotPage from "./pages/advisor/CopilotPage";
import CapitalStrategyRoadmap from "./pages/advisor/CapitalStrategyRoadmap";
import UserManagement from "./pages/advisor/admin/UserManagement";
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

              {/* Q1 Client Workspace */}
              <Route path="clients-list" element={<ClientListPage />} />
              <Route path="clients/:id" element={<ClientWorkspace />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ClientDashboardTab />} />
                <Route path="discover" element={<Q1DiscoverPage />} />
                <Route path="q2" element={<Q2Page />} />
                <Route path="q3" element={<Q3Page />} />
                <Route path="q4" element={<Q4Page />} />
                <Route path="data-room" element={<ClientDataRoomTab />} />
              </Route>

              {/* TFO pages */}
              <Route path="prospects" element={<ProspectPipeline />} />
              <Route path="prospects/:id" element={<ProspectWorkspace />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<ProspectOverviewTab />} />
                <Route path="assessments" element={<ProspectAssessmentsTab />} />
                <Route path="documents" element={<ProspectDocumentsTab />} />
              </Route>
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
              <Route path="admin/users" element={<UserManagement />} />
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
