"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { LayoutGrid, Table2, Sheet, TrendingUp, Euro, FolderKanban, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ElmarProjectSummary } from "@/lib/mock/elmar-data";

type View = "table" | "cards" | "spreadsheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_COLORS: Record<string, { badge: string; header: string; accent: string }> = {
  SERVICES:      { badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",     header: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",     accent: "#3b82f6" },
  INTERNATIONAL: { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30", header: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", accent: "#10b981" },
  KEYSER:        { badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30",   header: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",   accent: "#f97316" },
  MAINTENANCE:   { badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30",   header: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",   accent: "#8b5cf6" },
};

const DB_NAMES: Record<string, string> = {
  SERVICES: "Elmar Services", KEYSER: "Keyser", INTERNATIONAL: "Elmar International", MAINTENANCE: "Maintenance",
};

//─── Helpers ──────────────────────────────────────────────────────────────────

function DbBadge({ db }: { db: string }) {
  const cls = DB_COLORS[db]?.badge ?? "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/30";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>{db}</span>;
}

function margeCls(v: number) {
  return v >= 15 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : v >= 0 ? "" : "text-red-600 dark:text-red-400 font-semibold";
}
function betaaldCls(v: number) {
  return v >= 90 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : v >= 50 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400";
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────

function KpiSummary({ projecten }: { projecten: ElmarProjectSummary[] }) {
  const totOmzet   = projecten.reduce((s, p) => s + p.GEFACTUREERD_TOTAAL, 0);
  const totMarge   = projecten.reduce((s, p) => s + p.BRUTOMARGE, 0);
  const totKosten  = projecten.reduce((s, p) => s + p.TOTALE_KOSTEN, 0);
  const actief     = projecten.filter(p => p.STATUS === "ACTIEF").length;
  const negatief   = projecten.filter(p => p.BRUTOMARGE < 0).length;
  // gem. marge % = totale brutomarge ÷ totale kosten (KH)
  const gemMarge   = totKosten > 0 ? (totMarge / totKosten) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {[
        { label: "Totaal gefactureerd", value: formatCurrency(totOmzet),   icon: Euro,         color: "text-blue-600 dark:text-blue-400" },
        { label: "Totale brutomarge",   value: formatCurrency(totMarge),    icon: TrendingUp,   color: totMarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600" },
        { label: "Gem. marge %",        value: formatPercentage(gemMarge),  icon: TrendingUp,   color: gemMarge >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600" },
        { label: "Actieve projecten",   value: String(actief),              icon: FolderKanban, color: "text-blue-600 dark:text-blue-400" },
        { label: "Verliesgevend",       value: String(negatief),            icon: AlertCircle,  color: negatief > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b ${right ? "text-right" : "text-left"} whitespace-nowrap`}>
      {children}
    </th>
  );
}

function TableView({ projecten, onNavigate }: { projecten: ElmarProjectSummary[]; activeDb: string; onNavigate: (p: ElmarProjectSummary) => void }) {
  const COLS = 9;
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-muted/40">
            <tr>
              <Th>Nr.</Th>
              <Th>Projectnaam</Th>
              <Th>Klant</Th>
              <Th right>Aanneemsom</Th>
              <Th right>Gefactureerd</Th>
              <Th right>% Betaald</Th>
              <Th right>Totale kosten</Th>
              <Th right>Brutomarge</Th>
              <Th right>Marge %</Th>
            </tr>
          </thead>
          <tbody>
            {projecten.length === 0 ? (
              <tr><td colSpan={COLS} className="px-4 py-12 text-center text-muted-foreground">Geen projecten gevonden</td></tr>
            ) : projecten.map((p) => (
              <tr key={p.ID} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => onNavigate(p)}>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.PROJECTNUMMER}</td>
                <td className="px-3 py-2.5 font-medium">{p.NAAM}</td>
                <td className="px-3 py-2.5 text-muted-foreground max-w-[180px] truncate">{p.KLANT}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(p.TOTAAL_AANNEEMSOM)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${p.PCT_BETAALD != null ? betaaldCls(p.PCT_BETAALD) : "text-muted-foreground"}`}>
                  {p.PCT_BETAALD != null ? formatPercentage(p.PCT_BETAALD) : "n.v.t."}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(p.TOTALE_KOSTEN)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(p.BRUTOMARGE)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${margeCls(p.MARGE_PCT)}`}>{formatPercentage(p.MARGE_PCT)}</td>
              </tr>
            ))}
          </tbody>
          {projecten.length > 1 && (
            <tfoot className="border-t bg-muted/30 font-semibold text-sm">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                  Totaal ({projecten.length} projecten)
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(projecten.reduce((s,p)=>s+p.TOTAAL_AANNEEMSOM,0))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(projecten.reduce((s,p)=>s+p.GEFACTUREERD_TOTAAL,0))}</td>
                <td />
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(projecten.reduce((s,p)=>s+p.TOTALE_KOSTEN,0))}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${projecten.reduce((s,p)=>s+p.BRUTOMARGE,0)>=0?"text-emerald-600 dark:text-emerald-400":"text-red-600"}`}>{formatCurrency(projecten.reduce((s,p)=>s+p.BRUTOMARGE,0))}</td>
                <td />
              </tr>
            </tfoot>
          )}
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
  if (projecten.length === 0) return <div className="flex items-center justify-center h-40 text-muted-foreground">Geen projecten gevonden</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projecten.map((p) => (
        <div key={p.ID} onClick={() => onNavigate(p)}
          className="cursor-pointer rounded-xl border bg-card p-4 hover:shadow-md hover:border-blue-500/30 transition-all duration-150 flex flex-col gap-3">
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
          <div className="border-t" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <MiniStat label="Aanneemsom"   value={formatCurrency(p.TOTAAL_AANNEEMSOM)} />
            <MiniStat label="Gefactureerd" value={formatCurrency(p.GEFACTUREERD_TOTAAL)} />
            <MiniStat label="Brutomarge"   value={formatCurrency(p.BRUTOMARGE)}
              cls={p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
            <MiniStat label="Marge %"      value={formatPercentage(p.MARGE_PCT)}
              cls={p.MARGE_PCT >= 15 ? "text-emerald-600 dark:text-emerald-400" : p.MARGE_PCT >= 0 ? "" : "text-red-600 dark:text-red-400"} />
            <MiniStat label="Totale kosten" value={formatCurrency(p.TOTALE_KOSTEN)} cls="text-muted-foreground" />
            <MiniStat label="% Betaald"    value={formatPercentage(p.PCT_BETAALD)} cls={betaaldCls(p.PCT_BETAALD)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Spreadsheet view ─────────────────────────────────────────────────────────

interface SsCol { key: string; label: string; right: boolean; mono?: boolean; wide?: boolean; currency?: boolean; pct?: boolean; colored?: boolean; }

const SS_COLS: SsCol[] = [
  { key: "PROJECTNUMMER",      label: "Projectnr.",    right: false, mono: true  },
  { key: "NAAM",               label: "Naam",          right: false, wide: true  },
  { key: "KLANT",              label: "Klant",         right: false, wide: true  },
  { key: "STATUS",             label: "Status",        right: false              },
  { key: "AANNEEMSOM",         label: "Aanneemsom",    right: true,  currency: true },
  { key: "GEFACTUREERD_TOTAAL",label: "Gefactureerd",  right: true,  currency: true },
  { key: "PCT_BETAALD",        label: "% Betaald",     right: true,  pct: true   },
  { key: "TOTALE_KOSTEN",      label: "Kosten",        right: true,  currency: true },
  { key: "BRUTOMARGE",         label: "Brutomarge",    right: true,  currency: true, colored: true },
  { key: "MARGE_PCT",          label: "Marge %",       right: true,  pct: true,  colored: true },
];

function cellValue(p: ElmarProjectSummary, col: SsCol): React.ReactNode {
  const raw = p[col.key as keyof ElmarProjectSummary];
  if (col.key === "STATUS") return <StatusBadge status={String(raw)} />;
  if (col.currency) {
    const n = Number(raw);
    const cls = col.colored ? (n >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400") : "";
    return <span className={cls}>{formatCurrency(n)}</span>;
  }
  if (col.pct) {
    const n = Number(raw);
    const cls = col.colored ? margeCls(n) : betaaldCls(n);
    return <span className={cls}>{formatPercentage(n)}</span>;
  }
  return String(raw ?? "—");
}

function SpreadsheetView({ projecten, activeDb, onNavigate }: { projecten: ElmarProjectSummary[]; activeDb: string; onNavigate: (p: ElmarProjectSummary) => void }) {
  const cfg = DB_COLORS[activeDb] ?? DB_COLORS.SERVICES;
  const tot = (key: string) => projecten.reduce((s, p) => s + Number(p[key as keyof ElmarProjectSummary] ?? 0), 0);
  const totMarge = tot("BRUTOMARGE");

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div style={{ maxHeight: "72vh", overflowY: "auto" }}>
        <table className="text-xs w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "7%" }} />  {/* Marge % — narrowest */}
          </colgroup>

          {/* Sticky header */}
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr className="border-b-2" style={{ background: `${cfg.accent}12` }}>
              {SS_COLS.map(col => (
                <th key={col.key}
                  className={`px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground ${col.right ? "text-right" : "text-left"} truncate`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {projecten.map((p, i) => (
              <tr key={p.ID}
                className={`border-b cursor-pointer transition-colors hover:bg-muted/50 ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                onClick={() => onNavigate(p)}>
                {SS_COLS.map(col => (
                  <td key={col.key}
                    className={`px-3 py-2 ${col.right ? "text-right tabular-nums" : ""} ${col.mono ? "font-mono text-muted-foreground text-[11px]" : ""} ${col.wide ? "truncate" : "whitespace-nowrap"}`}>
                    {cellValue(p, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Totaalrij */}
          <tfoot style={{ position: "sticky", bottom: 0 }}>
            <tr className="border-t-2 bg-muted/80 backdrop-blur font-semibold">
              <td colSpan={4} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Totaal ({projecten.length} projecten)
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(tot("AANNEEMSOM"))}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(tot("GEFACTUREERD_TOTAAL"))}</td>
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(tot("TOTALE_KOSTEN"))}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${totMarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>{formatCurrency(totMarge)}</td>
              <td className="px-3 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>{Array.from({ length: cols }).map((_, j) => <th key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: cols }).map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [50, 100, 250, 500, 2500] as const;

function ProjectenInner() {
  const router  = useRouter();
  const [activeDb,  setActiveDb]  = useState("SERVICES");
  const [search,    setSearch]    = useState("");
  const [mounted,   setMounted]   = useState(false);
  const [view,      setView]      = useState<View>("table");
  const [pageSize,     setPageSize]     = useState<number>(250);
  const [verbergLeeg,  setVerbergLeeg]  = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored) setActiveDb(stored);
      const sv = localStorage.getItem("elmar_projecten_view") as View | null;
      if (sv) setView(sv);
      const ps = localStorage.getItem("elmar_projecten_pagesize");
      if (ps) setPageSize(Number(ps));
    } catch {}
    setMounted(true);

    const onEvent = (e: Event) => {
      const db = (e as CustomEvent<string>).detail;
      if (db) setActiveDb(db);
    };
    window.addEventListener("elmar-db-change", onEvent);
    return () => window.removeEventListener("elmar-db-change", onEvent);
  }, []);

  const { data, isLoading } = useQuery<{ data: ElmarProjectSummary[]; total: number }>({
    queryKey: ["elmar-projecten", activeDb, search, pageSize, verbergLeeg],
    queryFn: () => {
      const params = new URLSearchParams({ database: activeDb, pageSize: String(pageSize), verbergLeeg: String(verbergLeeg) });
      if (search) params.set("search", search);
      return fetch(`/api/v1/projecten?${params}`).then(r => r.json());
    },
    enabled: mounted,
  });

  const projecten = data?.data ?? [];
  const total     = data?.total ?? 0;

  const switchView = (v: View) => {
    setView(v);
    try { localStorage.setItem("elmar_projecten_view", v); } catch {}
  };

  const changePageSize = (ps: number) => {
    setPageSize(ps);
    try { localStorage.setItem("elmar_projecten_pagesize", String(ps)); } catch {}
  };

  const navigate = (p: ElmarProjectSummary) => router.push(`/projecten/${p.ID}?database=${p.DATABASE}`);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Projecten</h1>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${DB_COLORS[activeDb]?.badge ?? ""}`}>
            {DB_NAMES[activeDb] ?? activeDb}
          </span>
          {!isLoading && total > 0 && (
            <span className="text-sm text-muted-foreground">
              {projecten.length < total ? `${projecten.length} van ${total}` : `${total} projecten`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Zoek op naam, nummer of klant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Toggle lege projecten */}
          <button
            onClick={() => setVerbergLeeg(v => !v)}
            className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors ${
              verbergLeeg ? "bg-blue-600 text-white border-blue-600" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            title={verbergLeeg ? "Toont alleen projecten met activiteit — klik om alles te tonen" : "Toont alle projecten — klik om lege te verbergen"}
          >
            {verbergLeeg ? "Actief" : "Alles"}
          </button>

          {/* Page size selector */}
          <div className="flex items-center rounded-md border overflow-hidden text-xs">
            {PAGE_SIZE_OPTIONS.map(ps => (
              <button key={ps} onClick={() => changePageSize(ps)}
                className={`h-9 px-3 transition-colors border-l first:border-l-0 ${pageSize === ps ? "bg-blue-600 text-white font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                {ps === 2500 ? "Alles" : ps}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-md border overflow-hidden text-sm">
            {([
              { v: "table",       icon: Table2,      label: "Tabel"       },
              { v: "cards",       icon: LayoutGrid,  label: "Kaarten"     },
              { v: "spreadsheet", icon: Sheet,       label: "Spreadsheet" },
            ] as const).map(({ v, icon: Icon, label }) => (
              <button key={v} onClick={() => switchView(v)} title={label}
                className={`flex items-center gap-1.5 h-9 px-3 transition-colors border-l first:border-l-0 ${view === v ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI summary — always visible */}
      {!isLoading && projecten.length > 0 && <KpiSummary projecten={projecten} />}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton cols={view === "spreadsheet" ? 10 : 11} />
      ) : view === "table" ? (
        <TableView projecten={projecten} activeDb={activeDb} onNavigate={navigate} />
      ) : view === "cards" ? (
        <CardView projecten={projecten} onNavigate={navigate} />
      ) : (
        <SpreadsheetView projecten={projecten} activeDb={activeDb} onNavigate={navigate} />
      )}

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.total} {data.total === 1 ? "project" : "projecten"} — {DB_NAMES[activeDb] ?? activeDb}
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
