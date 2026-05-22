"use client";

import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, RefreshCw, LogOut, User, ChevronRight, Activity } from "lucide-react";
import { useTheme } from "next-themes";
import { clearToken } from "@/lib/api-client";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ROUTE_MAP: Record<string, string> = {
  "/":           "Dashboard",
  "/projecten":  "Projecten",
  "/werkbonnen": "Werkbonnen",
  "/facturen":   "Facturen",
  "/inkoop":     "Inkoop",
  "/grootboek":  "Grootboek",
  "/klanten":    "Klanten",
  "/rapportages":"Rapportages",
};

function getLabel(segment: string): string {
  return ROUTE_MAP[`/${segment}`] ?? segment;
}

function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return "zojuist";
  if (s < 60) return `${s}s geleden`;
  return `${Math.floor(s / 60)}m geleden`;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { enabled, toggle } = useAutoRefresh();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  useTick();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [
    { label: "Home", href: "/" },
    ...segments.map((seg, i) => ({
      label: getLabel(seg),
      href: `/${segments.slice(0, i + 1).join("/")}`,
    })),
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    setLastRefresh(new Date());
  };

  return (
    <header className="flex items-center h-14 px-5 border-b gap-4 shrink-0 bg-card">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {i < crumbs.length - 1 ? (
              <button onClick={() => router.push(c.href)} className="text-muted-foreground hover:text-foreground transition-colors truncate">
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

        {/* Auto-refresh toggle */}
        <button
          onClick={toggle}
          className={cn(
            "hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors",
            enabled
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
              : "hover:bg-muted text-muted-foreground"
          )}
          title={enabled ? "Auto-refresh aan" : "Auto-refresh uit"}
        >
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", enabled ? "bg-blue-500 animate-pulse" : "bg-muted-foreground")} />
          {enabled ? "Live" : "Pauze"}
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Thema wisselen"
        >
          {resolvedTheme === "dark"
            ? <Sun className="h-3.5 w-3.5" />
            : <Moon className="h-3.5 w-3.5" />
          }
        </button>

        {/* User */}
        <div className="relative group">
          <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-md hover:bg-muted transition-colors">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              A
            </div>
            <span className="text-sm font-medium hidden md:block">Admin</span>
          </button>
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border bg-popover shadow-lg p-1 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity z-50">
            <button
              onClick={() => { clearToken(); router.push("/login"); }}
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
