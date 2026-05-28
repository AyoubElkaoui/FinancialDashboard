"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { LayoutGrid, Table2 } from "lucide-react";
import type { ElmarProjectSummary } from "@/lib/mock/elmar-data";

// ─── DB badge ────────────────────────────────────────────────────────────────

const DB_COLORS: Record<string, string> = {
  SERVICES:      "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",
  MAINTENANCE:   "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30",
  INTERNATIONAL: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  KEYSER:        "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30",
};

function DbBadge({ db }: { db: string }) {
  const cls = DB_COLORS[db] ?? "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/30";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {db}
    </span>
  );
}

// ─── Marge color helper ───────────────────────────────────────────────────────

function margeCls(v: number) {
  return v >= 15
    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
    : v >= 0
    ? "text-foreground"
    : "text-red-600 dark:text-red-400 font-semibold";
}

function betaaldCls(v: number) {
  return v >= 90
    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
    : v >= 50
    ? "text-orange-600 dark:text-orange-400"
    : "text-red-600 dark:text-red-400";
}

// ─── Table view ───────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function TableView({ projecten, activeDb, onNavigate }: { projecten: ElmarProjectSummary[]; activeDb: string; onNavigate: (p: ElmarProjectSummary) => void }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <Th>Projectnummer</Th>
              <Th>Naam</Th>
              <Th>Klant</Th>
              <Th>Projectleider</Th>
              <Th right>Aanneemsom</Th>
              <Th right>Gefactureerd</Th>
              <Th right>Totale kosten</Th>
              <Th right>Brutomarge</Th>
              <Th right>Marge %</Th>
              <Th right>% Betaald</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {projecten.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                  Geen projecten gevonden
                </td>
              </tr>
            ) : (
              projecten.map((p) => (
                <tr
                  key={p.ID}
                  className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => onNavigate(p)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {p.PROJECTNUMMER}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.NAAM}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{p.KLANT}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.PROJECTLEIDER}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.TOTAAL_AANNEEMSOM)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(p.TOTALE_KOSTEN)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatCurrency(p.BRUTOMARGE)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${margeCls(p.MARGE_PCT)}`}>
                    {formatPercentage(p.MARGE_PCT)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${betaaldCls(p.PCT_BETAALD)}`}>
                    {formatPercentage(p.PCT_BETAALD)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={p.STATUS} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function MiniStat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${cls ?? ""}`}>{value}</span>
    </div>
  );
}

function CardView({ projecten, onNavigate }: { projecten: ElmarProjectSummary[]; onNavigate: (p: ElmarProjectSummary) => void }) {
  if (projecten.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Geen projecten gevonden
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projecten.map((p) => (
        <div
          key={p.ID}
          onClick={() => onNavigate(p)}
          className="cursor-pointer rounded-xl border bg-card p-4 hover:shadow-md hover:border-blue-500/30 transition-all duration-150 flex flex-col gap-3"
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-mono text-[11px] text-muted-foreground leading-none">{p.PROJECTNUMMER}</span>
              <span className="font-semibold text-sm leading-snug line-clamp-2">{p.NAAM}</span>
              <span className="text-xs text-muted-foreground truncate">{p.KLANT}</span>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={p.STATUS} />
              <span className="text-[10px] text-muted-foreground">{p.PROJECTLEIDER}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <MiniStat label="Aanneemsom" value={formatCurrency(p.TOTAAL_AANNEEMSOM)} />
            <MiniStat label="Gefactureerd" value={formatCurrency(p.GEFACTUREERD_TOTAAL)} />
            <MiniStat
              label="Brutomarge"
              value={formatCurrency(p.BRUTOMARGE)}
              cls={p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            />
            <MiniStat
              label="Marge %"
              value={formatPercentage(p.MARGE_PCT)}
              cls={p.MARGE_PCT >= 15 ? "text-emerald-600 dark:text-emerald-400" : p.MARGE_PCT >= 0 ? "" : "text-red-600 dark:text-red-400"}
            />
            <MiniStat label="Totale kosten" value={formatCurrency(p.TOTALE_KOSTEN)} cls="text-muted-foreground" />
            <MiniStat
              label="% Betaald"
              value={formatPercentage(p.PCT_BETAALD)}
              cls={betaaldCls(p.PCT_BETAALD)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Inner component ─────────────────────────────────────────────────────────

function ProjectenInner() {
  const router = useRouter();
  const [activeDb, setActiveDb] = useState<string>("SERVICES");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored) setActiveDb(stored);
      const storedView = localStorage.getItem("elmar_projecten_view") as "table" | "cards" | null;
      if (storedView) setView(storedView);
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "elmar_active_db" && e.newValue) setActiveDb(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data, isLoading } = useQuery<{ data: ElmarProjectSummary[]; total: number }>({
    queryKey: ["elmar-projecten", activeDb, search],
    queryFn: () => {
      const params = new URLSearchParams({ database: activeDb });
      if (search) params.set("search", search);
      return fetch(`/api/v1/projecten?${params.toString()}`).then((r) => r.json());
    },
    enabled: mounted,
  });

  const projecten = data?.data ?? [];

  const switchView = (v: "table" | "cards") => {
    setView(v);
    try { localStorage.setItem("elmar_projecten_view", v); } catch {}
  };

  const navigate = (p: ElmarProjectSummary) =>
    router.push(`/projecten/${p.ID}?database=${activeDb}`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Projecten</h1>
          <DbBadge db={activeDb} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Zoek op naam, nummer of klant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {/* View toggle */}
          <div className="flex items-center rounded-md border overflow-hidden">
            <button
              onClick={() => switchView("table")}
              title="Tabelweergave"
              className={`flex items-center gap-1.5 h-9 px-3 text-sm transition-colors ${
                view === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              onClick={() => switchView("cards")}
              title="Kaartweergave"
              className={`flex items-center gap-1.5 h-9 px-3 text-sm transition-colors border-l ${
                view === "cards"
                  ? "bg-blue-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kaarten</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <th key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : view === "table" ? (
        <TableView projecten={projecten} activeDb={activeDb} onNavigate={navigate} />
      ) : (
        <CardView projecten={projecten} onNavigate={navigate} />
      )}

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.total} {data.total === 1 ? "project" : "projecten"} in database <strong>{activeDb}</strong>
        </p>
      )}
    </div>
  );
}

export default function ProjectenPage() {
  return (
    <Suspense>
      <ProjectenInner />
    </Suspense>
  );
}
