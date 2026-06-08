"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectRow {
  ID: string;
  DATABASE: string;
  PROJECTNUMMER: string;
  NAAM: string;
  KLANT: string;
  PROJECTLEIDER: string;
  STATUS: string;
  AANNEEMSOM: number;
  MEERWERK: number;
  TOTAAL_AANNEEMSOM: number;
  GEFACTUREERD_TOTAAL: number;
  PCT_BETAALD: number | null;
  TOTALE_KOSTEN: number;
  BRUTOMARGE: number;
  MARGE_PCT: number;
}

interface ProjectenResponse {
  data: ProjectRow[];
  total: number;
  _source: string;
}

// ─── DB config ────────────────────────────────────────────────────────────────

const DB_LABELS: Record<string, string> = {
  SERVICES:      "Elmar Services",
  MAINTENANCE:   "Elmar Maintenance",
  INTERNATIONAL: "Elmar International",
  KEYSER:        "Keyser",
};

const DB_COLORS: Record<string, { dot: string; badge: string }> = {
  SERVICES:      { dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30" },
  MAINTENANCE:   { dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30" },
  INTERNATIONAL: { dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30" },
  KEYSER:        { dot: "bg-orange-500",  badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30" },
};

function margeCls(v: number) {
  return v >= 15 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : v >= 0 ? "" : "text-red-600 dark:text-red-400 font-semibold";
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagementDatabasePage({ params }: { params: Promise<{ database: string }> }) {
  const { database } = use(params);
  const router = useRouter();

  const [status, setStatus]       = useState<"actueel" | "historisch">("actueel");
  const [search, setSearch]       = useState("");
  const [plFilter, setPlFilter]   = useState("");

  const { data, isLoading, isError } = useQuery<ProjectenResponse>({
    queryKey: ["mgm-projecten", database, status],
    queryFn: () => {
      const params = new URLSearchParams({
        database,
        pageSize:   "5000",
        verbergLeeg: "true",
        status,      // server-side status filter (actueel/historisch)
      });
      return fetch(`/api/v1/projecten?${params}`)
        .then(r => {
          if (!r.ok) throw new Error("Fout bij laden");
          return r.json();
        });
    },
  });

  const label  = DB_LABELS[database] ?? database;
  const colors = DB_COLORS[database];

  // Search + projectleider filter blijven client-side (snel op al geladen data)
  const projecten: ProjectRow[] = (data?.data ?? []).filter(p => {
    if (plFilter && !p.PROJECTLEIDER?.toLowerCase().includes(plFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.NAAM?.toLowerCase().includes(q) ||
        p.PROJECTNUMMER?.toLowerCase().includes(q) ||
        p.KLANT?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Unieke projectleiders voor filter-dropdown (over gehele geladen dataset)
  const alleProjectleiders = [...new Set((data?.data ?? []).map(p => p.PROJECTLEIDER).filter(Boolean))].sort();

  // Totals over filtered rows
  const totAanneemsom  = projecten.reduce((s, p) => s + p.TOTAAL_AANNEEMSOM, 0);
  const totGefact      = projecten.reduce((s, p) => s + p.GEFACTUREERD_TOTAAL, 0);
  const totKosten      = projecten.reduce((s, p) => s + p.TOTALE_KOSTEN, 0);
  const totMarge       = projecten.reduce((s, p) => s + p.BRUTOMARGE, 0);
  const gemMargePct    = totKosten > 0 ? totMarge / totKosten * 100 : 0;
  const totNietGefact  = totAanneemsom - totGefact;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${colors?.dot ?? "bg-slate-500"}`} />
          <h1 className="text-xl font-bold">{label}</h1>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors?.badge ?? ""}`}>
            {database}
          </span>
        </div>
        {data?._source === "mock" && (
          <span className="text-xs text-muted-foreground italic ml-1">mock data</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <FilterChip label="Actueel" active={status === "actueel"} onClick={() => setStatus("actueel")} />
        <FilterChip label="Historisch" active={status === "historisch"} onClick={() => setStatus("historisch")} />
        {alleProjectleiders.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground ml-2">Projectleider:</span>
            <select
              value={plFilter}
              onChange={e => setPlFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Alle</option>
              {alleProjectleiders.map(pl => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </>
        )}
        <div className="flex-1" />
        <Input
          placeholder="Zoeken op naam, nummer, klant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-64 text-sm"
        />
      </div>

      {/* Summary strip */}
      {!isLoading && projecten.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-1">
          {[
            { label: "Aanneemsom",       value: formatCurrency(totAanneemsom) },
            { label: "Gefactureerd",     value: formatCurrency(totGefact) },
            { label: "Niet-gefact.",     value: formatCurrency(totNietGefact), warn: totNietGefact > 0 },
            { label: "Totale kosten",    value: formatCurrency(totKosten) },
            { label: "Brutomarge",       value: formatCurrency(totMarge), success: totMarge >= 0 },
            { label: "Gem. marge",       value: formatPercentage(gemMargePct) },
            { label: "Projecten",        value: String(projecten.length) },
          ].map(({ label, value, warn, success }) => (
            <div key={label} className="text-sm">
              <span className="text-muted-foreground text-xs block">{label}</span>
              <span className={`font-semibold tabular-nums ${warn ? "text-orange-600 dark:text-orange-400" : success ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-6 w-6" />
            <p>Kon projecten niet laden. Controleer uw toegangsrechten.</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {projecten.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Geen projecten gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["Projectnr.", "Naam", "Klant", "Projectleider", "Status",
                        "Aanneemsom", "Gefactureerd", "Niet-gefact. %",
                        "Totale kosten", "Brutomarge", "Marge %", ""
                      ].map((h, i) => (
                        <th key={h+i} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${i >= 5 ? "text-right" : "text-left"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projecten.map(p => {
                      const nietGefactPct = p.TOTAAL_AANNEEMSOM > 0
                        ? (p.TOTAAL_AANNEEMSOM - p.GEFACTUREERD_TOTAAL) / p.TOTAAL_AANNEEMSOM * 100
                        : 0;
                      return (
                        <tr
                          key={p.PROJECTNUMMER}
                          onClick={() => router.push(`/projecten/${encodeURIComponent(p.PROJECTNUMMER)}?database=${database}`)}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.PROJECTNUMMER}</td>
                          <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{p.NAAM}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[130px] truncate">{p.KLANT}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate text-xs">{p.PROJECTLEIDER || "—"}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={p.STATUS} /></td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatCurrency(p.TOTAAL_AANNEEMSOM)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${nietGefactPct > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                            {formatPercentage(nietGefactPct)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">{formatCurrency(p.TOTALE_KOSTEN)}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap font-semibold ${p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatCurrency(p.BRUTOMARGE)}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${margeCls(p.MARGE_PCT)}`}>
                            {formatPercentage(p.MARGE_PCT)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
