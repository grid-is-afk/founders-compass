import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Share2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Map,
  Archive,
  ShieldCheck,
  Network,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Mirrors Katie's Licensee Portal mockup. Items not yet built point at a
// "coming soon" placeholder so the shell is complete and navigable.
const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/licensee", end: true, icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Prospects",
    items: [
      { to: "/licensee/prospects", icon: UserPlus, label: "Prospects" },
      { to: "/licensee/off-pipeline", icon: Archive, label: "Off-Pipeline" },
    ],
  },
  {
    label: "Clients",
    items: [
      { to: "/licensee/clients", icon: Users, label: "Active Clients" },
      { to: "/licensee/clients-archived", icon: Archive, label: "Archived Clients" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/licensee/referral-hub", icon: Network, label: "Referral Hub" },
      { to: "/licensee/quarterback", icon: Sparkles, label: "Quarterback AI" },
      { to: "/licensee/investor-share", icon: Share2, label: "Investor Share" },
      { to: "/licensee/capital-strategy", icon: Map, label: "Capital Strategy Architecture" },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/licensee/user-management", icon: ShieldCheck, label: "User Management" }],
  },
];

const LicenseeSidebar = () => {
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Advisor Portal</p>
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
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
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

export default LicenseeSidebar;
