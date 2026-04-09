import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  AlertTriangle,
  Bell,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const riskNotifications = (riskAlerts as any[]).filter(
    (a) => a.severity === "high" || a.severity === "critical" || a.severity === "medium"
  );
  const notificationCount = riskNotifications.length + (activity as any[]).length;

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
            className="flex items-center gap-3 w-full max-w-md cursor-text"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground/60 select-none">
              Search clients, reports, tasks...
            </span>
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

      {/* Client selector */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/30 flex-shrink-0">
        <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        {clients.length === 0 ? (
          <span className="text-sm text-muted-foreground">No clients</span>
        ) : (
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="border-0 bg-transparent shadow-none h-auto p-0 text-sm font-medium text-foreground w-auto min-w-[140px] focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(clients as any[]).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

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

          <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold">Notifications</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {notificationCount}
              </Badge>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
              {riskNotifications.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-2.5 px-3 py-2.5">
                  <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", severityColor(alert.severity))} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug truncate">{alert.title}</p>
                    {alert.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.detail}</p>}
                  </div>
                  <span className={cn("ml-auto text-[10px] font-medium shrink-0 capitalize", severityColor(alert.severity))}>
                    {alert.severity}
                  </span>
                </div>
              ))}

              {(activity as any[]).slice(0, 5).map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex items-start gap-2.5 px-3 py-2.5">
                  <Activity className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-snug flex-1 min-w-0">
                    {item.action}
                    {item.client_name ? ` — ${item.client_name}` : ""}
                  </p>
                  <span className="ml-2 text-[10px] text-muted-foreground shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {notificationCount === 0 && (
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
