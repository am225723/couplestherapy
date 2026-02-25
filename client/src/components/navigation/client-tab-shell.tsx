import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  clientTabConfig,
  getClientTab,
  routeToClientPrimaryTab,
  type ClientPrimaryTab,
} from "@/config/clientTabConfig";
import { cn } from "@/lib/utils";
import logoMark from "@assets/998.png";

interface ClientProfile {
  full_name?: string | null;
  avatar_url?: string | null;
}

interface ClientTabShellProps {
  profile: ClientProfile;
  onSignOut: () => void;
  children: ReactNode;
}

const getInitials = (fullName?: string | null): string => {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
};

export function ClientTabShell({
  profile,
  onSignOut,
  children,
}: ClientTabShellProps) {
  const [location] = useLocation();
  const activeTabId = routeToClientPrimaryTab(location);
  const activeTab = getClientTab(activeTabId);

  return (
    <div className="aleic-ambient min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-3 py-3 sm:px-5 md:px-6">
          <Link
            href="/dashboard"
            className="group flex min-w-0 items-center gap-2.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 hover-elevate"
            data-testid="link-client-home"
          >
            <img
              src={logoMark}
              alt="ALEIC"
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="hidden text-sm font-semibold tracking-wide text-foreground sm:block">
              ALEIC
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {clientTabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTabId === tab.id;

              return (
                <Link key={tab.id} href={tab.defaultUrl}>
                  <button
                    type="button"
                    className={cn(
                      "touch-target inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold tracking-wide transition-all",
                      isActive
                        ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_30px_rgba(201,169,98,0.22)]"
                        : "border-border/50 bg-card/50 text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`client-primary-tab-${tab.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              data-testid="button-client-notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full border border-border/70 bg-card/70 p-1 hover-elevate"
                  data-testid="button-client-profile"
                >
                  <Avatar className="h-9 w-9">
                    {profile.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                    ) : null}
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">
                    {profile.full_name || "Client"}
                  </p>
                  <p className="text-xs text-muted-foreground">Couples App</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={onSignOut}
                  data-testid="menu-item-client-signout"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="hidden border-t border-border/50 px-3 py-2 sm:px-5 md:block md:px-6">
          <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-2">
            {activeTab.secondaryRoutes.map((route) => {
              const Icon = route.icon;
              const isActive = location.startsWith(route.url);
              return (
                <Link key={route.url} href={route.url}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "border-primary/60 bg-primary/20 text-primary"
                        : "border-border/50 bg-card/50 text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`client-secondary-link-${route.url.replace(/\//g, "-")}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{route.title}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1800px] px-3 pb-28 pt-4 sm:px-5 md:px-6 md:pb-8 md:pt-5">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-20 z-40 px-3 md:hidden">
        <div className="aleic-tabbar-blur overflow-x-auto rounded-2xl border border-border/60 px-2 py-2">
          <div className="flex w-max min-w-full gap-2">
            {activeTab.secondaryRoutes.map((route) => {
              const Icon = route.icon;
              const isActive = location.startsWith(route.url);
              return (
                <Link key={route.url} href={route.url}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold",
                      isActive
                        ? "border-primary/70 bg-primary/25 text-primary"
                        : "border-border/60 bg-card/70 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{route.title}</span>
                    <ChevronRight className="h-3 w-3 opacity-70" />
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="aleic-tabbar-blur fixed inset-x-0 bottom-0 z-50 border-t border-border/70 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <div className="mx-auto grid max-w-screen-sm grid-cols-6 gap-1">
          {clientTabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;

            return (
              <Link key={tab.id} href={tab.defaultUrl}>
                <button
                  type="button"
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-semibold",
                    isActive
                      ? "border-primary/70 bg-primary/25 text-primary"
                      : "border-border/50 bg-card/65 text-muted-foreground",
                  )}
                  data-testid={`client-mobile-tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
