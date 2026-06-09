"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle, DatabaseZap } from "lucide-react";
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
  NOG_TE_FACTUREREN: number;
  PCT_GEFACT: number | null;
  TOTALE_KOSTEN: number;
  BRUTOMARGE: number;
  MARGE_PCT: number;
}

interface Totals {
  aanneemsom: number;
  gefactureerd: number;
  nogTeFactureren: number;
  kosten: number;
  marge: number;
}

interface ProjectenResponse {
  data: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  _source: string;
  _totals?: Totals;
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
  return v >= 15
    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
    : v >= 0 ? "" : "text-red-600 dark:text-red-400 font-semibold";
}

const PAGE_SIZE = 100;

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "border-border text-muted-foreground hover:border-blue-400"
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

  const [status, setStatus]               = useState<"alle" | "actueel" | "historisch">("alle");
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce zoekterm — sla pagina terug naar 1
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Status-wijziging → pagina resetten
  useEffect(() => { setPage(1); }, [status]);

  const { data, isLoading, isError } = useQuery<ProjectenResponse>({
    queryKey: ["mgm-projecten", database, status, page, debouncedSearch],
    queryFn: () => {
      const p = new URLSearchParams({
        database,
        pageSize:    String(PAGE_SIZE),
        page:        String(page),
        verbergLeeg: "false",   // toon alle projecten, ook zonder financiële data
        status,
      });
      if (debouncedSearch) p.set("search", debouncedSearch);
      return fetch(`/api/v1/projecten?${p}`).then(r => {
        if (!r.ok) throw new Error("Fout bij laden");
        return r.json();
      });
    },
    placeholderData: (prev) => prev,   // behoud vorige data bij pagina-wissel
  });

  const label  = DB_LABELS[database] ?? database;
  const colors = DB_COLORS[database];
  const projecten: ProjectRow[] = data?.data ?? [];
  const totals = data?._totals;

  // Afgeleide totalen (globaal via _totals uit API)
  const totAanneemsom  = totals?.aanneemsom      ?? 0;
  const totGefact      = totals?.gefactureerd    ?? 0;
  const totNogTeFact   = totals?.nogTeFactureren ?? 0;
  const totKosten      = totals?.kosten          ?? 0;
  const totMarge       = totals?.marge           ?? 0;
  // Marge % = brutomarge ÷ gefactureerde omzet
  const gemMargePct    = totGefact > 0 ? totMarge / totGefact * 100 : 0;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
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

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <FilterChip label="Alle"       active={status === "alle"}       onClick={() => setStatus("alle")} />
        <FilterChip label="Actueel"    active={status === "actueel"}    onClick={() => setStatus("actueel")} />
        <FilterChip label="Historisch" active={status === "historisch"} onClick={() => setStatus("historisch")} />
        <div className="flex-1" />
        <Input
          placeholder="Zoek op naam, nummer, klant, projectleider…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-72 text-sm"
        />
      </div>

      {/* ── Not-synced ── */}
      {!isLoading && data?._source === "not-synced" && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <DatabaseZap className="h-6 w-6" />
            <p className="text-sm font-medium">Database niet gesynchroniseerd</p>
            <p className="text-xs">Start de worker om {label} te synchroniseren.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Samenvattingsbalk (globale totalen) ── */}
      {!isLoading && totals && (data?.total ?? 0) > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-1">
          {[
            { label: "Aanneemsom",      value: formatCurrency(totAanneemsom) },
            { label: "Gefactureerd",    value: formatCurrency(totGefact) },
            { label: "Nog te fact.",    value: formatCurrency(totNogTeFact), warn: totNogTeFact > 0 },
            { label: "Totale kosten",   value: formatCurrency(totKosten) },
            { label: "Brutomarge",      value: formatCurrency(totMarge), success: totMarge >= 0 },
            { label: "Gem. marge %",    value: formatPercentage(gemMargePct) },
            { label: "Totaal projecten", value: `${data?.total ?? 0}` },
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

      {/* ── Laden ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Fout ── */}
      {isError && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-6 w-6" />
            <p>Kon projecten niet laden. Controleer uw toegangsrechten.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Tabel ── */}
      {!isLoading && !isError && data?._source !== "not-synced" && (
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
                      {[
                        "Projectnr.",
                        "Naam", "Klant", "Projectleider", "Status",
                        "Aanneemsom", "Gefactureerd", "Nog te fact. %",
                        "Totale kosten", "Brutomarge", "Marge %", "",
                      ].map((h, i) => (
                        <th
                          key={h + i}
                          className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${i >= 5 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projecten.map(p => {
                      // Nog te factureren als % van aanneemsom (hoeveel nog te gaan)
                      const nogTeFact = p.NOG_TE_FACTUREREN ?? 0;
                      const nogTeFactPct = p.TOTAAL_AANNEEMSOM > 0
                        ? nogTeFact / p.TOTAAL_AANNEEMSOM * 100
                        : 0;
                      return (
                        <tr
                          key={p.PROJECTNUMMER}
                          onClick={() => router.push(`/management/${database}/${encodeURIComponent(p.PROJECTNUMMER)}`)}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.PROJECTNUMMER}</td>
                          <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{p.NAAM}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[130px] truncate">{p.KLANT}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate text-xs">{p.PROJECTLEIDER || "—"}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={p.STATUS} /></td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatCurrency(p.TOTAAL_AANNEEMSOM)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${nogTeFactPct > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                            {formatPercentage(nogTeFactPct)}
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

      {/* ── Paginering ── */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1)}–{Math.min(page * PAGE_SIZE, data?.total ?? 0)} van {data?.total ?? 0}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page} van {data?.totalPages}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
