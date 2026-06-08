import { Outlet, useNavigate, useMatch } from "react-router-dom";
import { LogOut, LayoutDashboard, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roleLabels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import CopilotTrigger from "@/components/copilot/CopilotTrigger";
import LicenseeSidebar from "./LicenseeSidebar";

// Minimal top bar for the licensee portal — intentionally lighter than the advisor
// TopBar (no global search / notifications in V1).
const LicenseeTopBar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="h-14 border-b border-border flex items-center justify-end px-8 bg-card">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full gradient-olive flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring outline-none">
            <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{user?.name ?? "Advisor"}</p>
            <p className="text-xs text-muted-foreground font-normal truncate">{user?.email ?? ""}</p>
            <p className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-accent">
              {roleLabel(user?.role)}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/licensee")} className="cursor-pointer">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/licensee/clients")} className="cursor-pointer">
            <Users className="w-4 h-4 mr-2" />
            My Clients
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { logout(); navigate("/login"); }}
            className="cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

const LicenseeLayout = () => {
  // The read-only Quarterback AI is single-client: it only appears on a client's
  // dashboard, where there's a clientId to scope it to.
  const clientMatch = useMatch("/licensee/clients/:id");
  const clientId = clientMatch?.params.id;

  return (
    <CopilotProvider clientContext="" clientId={clientId}>
      <div className="flex min-h-screen bg-background">
        <LicenseeSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <LicenseeTopBar />
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
      {clientId && (
        <>
          <CopilotTrigger />
          <CopilotPanel />
        </>
      )}
    </CopilotProvider>
  );
};

export default LicenseeLayout;
