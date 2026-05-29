"use client";

import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, RefreshCw, LogOut, ChevronDown, Activity, Database, ChevronRight, Shield, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DB_CHANGE_EVENT } from "@/hooks/use-active-db";

const ROUTE_MAP: Record<string, string> = {
  "/":                    "Dashboard",
  "/projecten":           "Projecten",
  "/facturen":            "Facturen",
  "/werkbonnen":          "Werkbonnen",
  "/klanten":             "Klanten",
  "/inkoop":              "Inkoop",
  "/kosten":              "Kosten",
  "/omzet":              "Omzet",
  "/winst":              "Winst",
  "/grootboek":           "Grootboek",
  "/rapportages":         "Rapportages",
  "/jaar-index":          "Index",
  "/faq":                 "FAQ",
  "/instellingen":        "Instellingen",
  "/profiel":             "Profiel",
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

const DB_META: Record<string, { label: string; color: string; dot: string }> = {
  SERVICES:      { label: "Services",      color: "#3b82f6", dot: "bg-blue-500"    },
  MAINTENANCE:   { label: "Maintenance",   color: "#8b5cf6", dot: "bg-violet-500"  },
  INTERNATIONAL: { label: "International", color: "#10b981", dot: "bg-emerald-500" },
  KEYSER:        { label: "Keyser",        color: "#f97316", dot: "bg-orange-500"  },
};

interface CurrentUser {
  email: string;
  role: "ADMIN" | "VIEWER";
  databases: string[];
  activeDatabase: string | null;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeDb, setActiveDb] = useState<string | null>(null);
  const [dbOpen, setDbOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const dbRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useTick();

  useClickOutside(dbRef, () => setDbOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  useEffect(() => {
    const allowedDbs = user?.databases;
    if (!allowedDbs?.length) return;
    // Validate current selection against allowed databases
    if (activeDb && !allowedDbs.includes(activeDb)) {
      const fallback = allowedDbs[0];
      setActiveDb(fallback);
      try { localStorage.setItem("elmar_active_db", fallback); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: fallback }));
      return;
    }
    if (activeDb) return;
    let db: string | null = null;
    try { db = localStorage.getItem("elmar_active_db"); } catch { /* ignore */ }
    // Only restore from localStorage if user still has access
    if (db && !allowedDbs.includes(db)) db = null;
    if (!db && user?.activeDatabase) db = user.activeDatabase;
    if (db) {
      setActiveDb(db);
      window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: db }));
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
    toast.success("Data vernieuwd");
  };

  const handleLogout = async () => {
    setUserOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  const availableDbs = user?.databases ?? [];
  const dbInfo = activeDb ? DB_META[activeDb] : null;
  const initials = user?.email?.[0]?.toUpperCase() ?? "?";
  const userName = user?.email?.split("@")[0] ?? "—";

  return (
    <header className="flex items-center h-14 px-5 border-b gap-4 shrink-0 bg-card">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            {i < crumbs.length - 1 ? (
              <button
                onClick={() => router.push(c.href)}
                className="text-muted-foreground hover:text-foreground transition-colors truncate text-xs"
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

        {/* Last refresh indicator */}
        <span className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground mr-2 select-none">
          <Activity className="h-3 w-3" />
          {timeAgo(lastRefresh)}
        </span>

        {/* Database selector */}
        {availableDbs.length > 0 && (
          <div ref={dbRef} className="relative mr-1">
            <button
              onClick={() => setDbOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 h-8 px-2.5 rounded-md border text-sm transition-colors",
                dbOpen ? "bg-muted border-border" : "bg-background hover:bg-muted border-border"
              )}
            >
              {dbInfo ? (
                <>
                  <span className={cn("h-2 w-2 rounded-full shrink-0", dbInfo.dot)} />
                  <span className="font-medium hidden sm:block">{dbInfo.label}</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium hidden sm:block text-muted-foreground">Database</span>
                </>
              )}
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dbOpen && "rotate-180")} />
            </button>

            {dbOpen && (
              <div className="absolute right-0 top-full mt-1.5 min-w-[180px] rounded-xl border bg-popover shadow-xl p-1.5 z-50">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2.5 pb-1.5 pt-0.5">
                  Selecteer database
                </p>
                {availableDbs.map((db) => {
                  const meta = DB_META[db];
                  const isActive = db === activeDb;
                  return (
                    <button
                      key={db}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setActiveDb(db);
                        setDbOpen(false);
                        try { localStorage.setItem("elmar_active_db", db); } catch { /* ignore */ }
                        window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: db }));
                        queryClient.invalidateQueries();
                        toast.success(`Gewisseld naar ${meta?.label ?? db}`);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors text-left",
                        isActive ? "bg-muted font-semibold" : "hover:bg-muted/60"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", meta?.dot ?? "bg-slate-400")} />
                      <span className="flex-1">{meta?.label ?? db}</span>
                      {isActive && <span className="text-[10px] text-muted-foreground font-normal">actief</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Vernieuwen"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Thema wisselen"
        >
          {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-md transition-colors",
              userOpen ? "bg-muted" : "hover:bg-muted"
            )}
          >
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium hidden md:block max-w-[100px] truncate">{userName}</span>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground hidden md:block transition-transform", userOpen && "rotate-180")} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-popover shadow-xl p-1.5 z-50">
              <div className="px-2.5 py-2 border-b mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                {user?.role === "ADMIN" && (
                  <span className="inline-flex items-center gap-1 mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Shield className="h-2.5 w-2.5" /> Admin
                  </span>
                )}
              </div>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setUserOpen(false); router.push("/profiel"); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Mijn profiel
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg text-destructive hover:bg-muted/60 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
