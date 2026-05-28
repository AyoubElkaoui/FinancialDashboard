"use client";

import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, RefreshCw, LogOut, ChevronRight, Activity, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DB_CHANGE_EVENT } from "@/hooks/use-active-db";

const ROUTE_MAP: Record<string, string> = {
  "/":                    "Dashboard",
  "/projecten":           "Projecten",
  "/facturen":            "Facturen",
  "/rapportages":         "Rapportages",
  "/faq":                 "FAQ",
  "/instellingen":        "Instellingen",
  "/admin/gebruikers":    "Gebruikers",
  "/admin/audit":         "Auditlog",
};

function getLabel(pathname: string): string {
  return ROUTE_MAP[pathname] ?? pathname.split("/").filter(Boolean).pop() ?? "";
}

function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return "zojuist";
  if (s < 60) return `${s}s geleden`;
  return `${Math.floor(s / 60)}m geleden`;
}

const DB_LABELS: Record<string, string> = {
  SERVICES:      "Services",
  MAINTENANCE:   "Maintenance",
  INTERNATIONAL: "International",
  KEYSER:        "Keyser",
};

interface CurrentUser {
  email: string;
  role: "ADMIN" | "VIEWER";
  databases: string[];
  activeDatabase: string | null;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeDb, setActiveDb] = useState<string | null>(null);
  useTick();

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  useEffect(() => {
    // Restore from localStorage first, then fall back to user session
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored && !activeDb) {
        setActiveDb(stored);
        return;
      }
    } catch {
      // ignore localStorage errors
    }
    if (user?.activeDatabase && !activeDb) {
      setActiveDb(user.activeDatabase);
    }
  }, [user, activeDb]);

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [
    { label: "Home", href: "/" },
    ...segments.map((seg, i) => ({
      label: getLabel(`/${segments.slice(0, i + 1).join("/")}`),
      href: `/${segments.slice(0, i + 1).join("/")}`,
    })),
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    setLastRefresh(new Date());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  const initials = user?.email?.[0]?.toUpperCase() ?? "?";
  const availableDbs = user?.databases ?? [];

  return (
    <header className="flex items-center h-14 px-5 border-b gap-4 shrink-0 bg-card">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {i < crumbs.length - 1 ? (
              <button
                onClick={() => router.push(c.href)}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {c.label}
              </button>
            ) : (
              <span className="font-semibold text-foreground truncate">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Database selector */}
        {availableDbs.length > 0 && (
          <div className="relative group mr-1">
            <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border bg-background hover:bg-muted text-sm transition-colors">
              <Database className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium hidden sm:block">
                {activeDb ? DB_LABELS[activeDb] ?? activeDb : "Kies database"}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" />
            </button>
            <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border bg-popover shadow-lg p-1 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity z-50">
              {availableDbs.map((db) => (
                <button
                  key={db}
                  onClick={() => {
                    setActiveDb(db);
                    try {
                      localStorage.setItem("elmar_active_db", db);
                    } catch {
                      // ignore localStorage errors
                    }
                    window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: db }));
                    queryClient.invalidateQueries();
                    toast.success(`Database gewisseld naar ${DB_LABELS[db] ?? db}`);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                    db === activeDb
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "hover:bg-muted"
                  )}
                >
                  <Database className="h-3.5 w-3.5" />
                  {DB_LABELS[db] ?? db}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last refresh */}
        <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground mr-1">
          <Activity className="h-3 w-3" />
          {timeAgo(lastRefresh)}
        </span>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Vernieuwen"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Thema wisselen"
        >
          {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* User menu */}
        <div className="relative group">
          <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-md hover:bg-muted transition-colors">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              {initials}
            </div>
            <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
              {user?.email?.split("@")[0] ?? "—"}
            </span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover shadow-lg p-1 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity z-50">
            {user?.email && (
              <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">
                {user.email}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-destructive hover:bg-muted transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
