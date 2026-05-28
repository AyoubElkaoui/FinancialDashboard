"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
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
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {db}
    </span>
  );
}

// ─── Table cell helpers ───────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

// ─── Inner component ─────────────────────────────────────────────────────────

function ProjectenInner() {
  const router = useRouter();
  const [activeDb, setActiveDb] = useState<string>("SERVICES");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored) setActiveDb(stored);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // Also listen for storage changes (when topbar switches db)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "elmar_active_db" && e.newValue) {
        setActiveDb(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data, isLoading } = useQuery<{
    data: ElmarProjectSummary[];
    total: number;
  }>({
    queryKey: ["elmar-projecten", activeDb, search],
    queryFn: () => {
      const params = new URLSearchParams({ database: activeDb });
      if (search) params.set("search", search);
      return fetch(`/api/v1/projecten?${params.toString()}`).then((r) => r.json());
    },
    enabled: mounted,
  });

  const projecten = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Projecten</h1>
          <DbBadge db={activeDb} />
        </div>
        <input
          type="search"
          placeholder="Zoek op naam, nummer of klant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-72 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Th>Projectnummer</Th>
                <Th>Naam</Th>
                <Th>Klant</Th>
                <Th right>Aanneemsom</Th>
                <Th right>Gefactureerd</Th>
                <Th right>% Betaald</Th>
                <Th right>Marge %</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : projecten.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Geen projecten gevonden
                  </td>
                </tr>
              ) : (
                projecten.map((p) => (
                  <tr
                    key={p.ID}
                    className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(`/projecten/${p.ID}?database=${activeDb}`)
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {p.PROJECTNUMMER}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate">
                      {p.NAAM}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">
                      {p.KLANT}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(p.TOTAAL_AANNEEMSOM)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(p.GEFACTUREERD_TOTAAL)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          p.PCT_BETAALD >= 90
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : p.PCT_BETAALD >= 50
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {formatPercentage(p.PCT_BETAALD)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          p.MARGE_PCT >= 15
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : p.MARGE_PCT >= 0
                            ? "text-foreground"
                            : "text-red-600 dark:text-red-400 font-semibold"
                        }
                      >
                        {formatPercentage(p.MARGE_PCT)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.STATUS} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.total} {data.total === 1 ? "project" : "projecten"} in database{" "}
          <strong>{activeDb}</strong>
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
