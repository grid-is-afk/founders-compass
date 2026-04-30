import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Clock,
} from "lucide-react";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { useActivity } from "@/hooks/useActivity";
import { useNotifications, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Static page definitions for the search palette
// ---------------------------------------------------------------------------
const pages = [
  { name: "Dashboard", path: "/advisor", icon: LayoutDashboard },
  { name: "Clients", path: "/advisor/clients", icon: Users },
  { name: "Journey", path: "/advisor/journey", icon: GitBranch },
  { name: "Prospects", path: "/advisor/prospects", icon: UserPlus },
  { name: "Protection", path: "/advisor/protection", icon: ShieldCheck },
  { name: "Grow Lane", path: "/advisor/grow-lane", icon: TrendingUp },
  { name: "Quarterly Reviews", path: "/advisor/quarterly-review", icon: CalendarDays },
  { name: "Assessments", path: "/advisor/assessments", icon: ClipboardCheck },
  { name: "Data Room", path: "/advisor/data-room", icon: FolderOpen },
  { name: "Reports", path: "/advisor/reports", icon: FileText },
  { name: "Performance", path: "/advisor/performance", icon: Target },
];

const TopBar = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { selectedClientId, setSelectedClientId, clients } = useClientContext();
  const { user, logout } = useAuth();
  const { data: riskAlerts = [] } = useClientRiskAlerts(selectedClientId);
  const { data: activity = [] } = useActivity();
  const { data: clientNotifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const riskNotifications = (riskAlerts as any[]).filter(
    (a) => a.severity === "high" || a.severity === "critical" || a.severity === "medium"
  );
  const unreadClientNotifs = clientNotifications.filter((n) => !n.read);
  const notificationCount = riskNotifications.length + unreadClientNotifs.length;

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    navigate(path);
  };

  const severityColor = (severity: string) => {
    if (severity === "critical" || severity === "high") return "text-destructive";
    if (severity === "warning" || severity === "medium") return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-8 bg-card">

      {/* Search — Command palette inside a Popover */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex items-center gap-3 w-full max-w-lg cursor-text border border-border bg-muted/40 hover:bg-muted/60 rounded-md px-3 py-1.5 transition-colors"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground/70 select-none flex-1">
              Search clients, reports, tasks...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/60 bg-muted border border-border rounded px-1.5 py-0.5 shrink-0">
              ⌘K
            </kbd>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-0" align="start" sideOffset={8}>
          <Command>
            <CommandInput placeholder="Search..." autoFocus />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>

              {/* Clients */}
              {clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {(clients as any[]).map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.name} ${client.contact_name ?? ""}`}
                      onSelect={() => handleSearchSelect("/advisor/clients")}
                      className="cursor-pointer"
                    >
                      <Users className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{client.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground shrink-0">
                        {client.contact_name ?? ""}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Pages */}
              <CommandGroup heading="Pages">
                {pages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <CommandItem
                      key={page.path}
                      value={page.name}
                      onSelect={() => handleSearchSelect(page.path)}
                      className="cursor-pointer"
                    >
                      <Icon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span>{page.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Recent Activity */}
              {(activity as any[]).length > 0 && (
                <CommandGroup heading="Recent Activity">
                  {(activity as any[]).slice(0, 5).map((item, i) => (
                    <CommandItem
                      key={item.id ?? i}
                      value={item.action}
                      onSelect={() => setSearchOpen(false)}
                      className="cursor-pointer"
                    >
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-sm">{item.action}</span>
                      {item.client_name && (
                        <span className="ml-2 text-xs text-muted-foreground shrink-0">{item.client_name}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Right-hand controls */}
      <div className="flex items-center gap-4">

        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadClientNotifs.length > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {notificationCount}
                </Badge>
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-border">
              {/* Client-triggered notifications */}
              {clientNotifications.slice(0, 8).map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 transition-colors",
                    !notif.read && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <Activity className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">{notif.message}</p>
                    {notif.client_name && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{notif.client_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {/* Risk alerts */}
              {riskNotifications.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-2.5 px-3 py-2.5">
                  <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", severityColor(alert.severity))} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug truncate">{alert.title}</p>
                    {alert.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.detail}</p>}
                  </div>
                  <span className={cn("ml-auto text-[10px] font-medium shrink-0 capitalize", severityColor(alert.severity))}>
                    {alert.severity}
                  </span>
                </div>
              ))}

              {/* Recent activity (fallback when no client notifs or risk alerts) */}
              {clientNotifications.length === 0 && riskNotifications.length === 0 && (
                (activity as any[]).slice(0, 5).map((item: any, i: number) => (
                  <div key={item.id ?? i} className="flex items-start gap-2.5 px-3 py-2.5">
                    <Activity className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-snug flex-1 min-w-0">
                      {item.text ?? item.action}
                      {item.client_name ? ` — ${item.client_name}` : ""}
                    </p>
                    <span className="ml-2 text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}

              {notificationCount === 0 && clientNotifications.length === 0 && (activity as any[]).length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-border">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                onClick={() => navigate("/advisor")}
              >
                View all activity
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full gradient-olive flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring outline-none">
              <span className="text-xs font-semibold text-primary-foreground">
                {user?.name
                  ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "?"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name ?? "Advisor"}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{user?.email ?? ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/advisor")} className="cursor-pointer">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/advisor/clients")} className="cursor-pointer">
              <Users className="w-4 h-4 mr-2" />
              My Clients
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/advisor/assessments")} className="cursor-pointer">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Assessments
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
      </div>
    </header>
  );
};

export default TopBar;
