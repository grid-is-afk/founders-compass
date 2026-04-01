import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  UserPlus,
  ClipboardCheck,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  FileText,
  CalendarDays,
  Target,
  Upload,
  Share2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/advisor", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/advisor/clients", icon: Users, label: "Clients" },
      { to: "/advisor/journey", icon: GitBranch, label: "Journey" },
      { to: "/advisor/prospects", icon: UserPlus, label: "Prospects" },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/advisor/assessments", icon: ClipboardCheck, label: "Assessments" },
      { to: "/advisor/data-room", icon: FolderOpen, label: "Data Room" },
      { to: "/advisor/instruments", icon: BarChart3, label: "Instruments" },
    ],
  },
  {
    label: "Protect",
    items: [
      { to: "/advisor/protection", icon: ShieldCheck, label: "Protection" },
    ],
  },
  {
    label: "Grow",
    items: [
      { to: "/advisor/grow-lane", icon: TrendingUp, label: "Grow Lane" },
      { to: "/advisor/customer-capital", icon: TrendingUp, label: "Customer Capital" },
    ],
  },
  {
    label: "Prove & Align",
    items: [
      { to: "/advisor/reports", icon: FileText, label: "Reports" },
      { to: "/advisor/quarterly-review", icon: CalendarDays, label: "Quarterly Reviews" },
      { to: "/advisor/sprints", icon: Target, label: "Sprints" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/advisor/copilot", icon: Sparkles, label: "Quarterback AI" },
      { to: "/advisor/uploads", icon: Upload, label: "Uploads" },
      { to: "/advisor/investor-share", icon: Share2, label: "Investor Share" },
    ],
  },
];

const AdvisorSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-sidebar-primary-foreground font-display">F</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold tracking-wide font-display text-sidebar-foreground">The Founders Office</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Capital Alignment</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-4 border-t border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AdvisorSidebar;
