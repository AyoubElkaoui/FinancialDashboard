"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { werkbonnenApi } from "@/lib/api-client";
import { formatDate, formatCurrency, formatNumber } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { CATEGORIE_LABELS } from "@/lib/mock/maintenance-data";
import type { MaintenanceWerkbon, WerkbonCategorie, WerkbonStatus } from "@/lib/mock/maintenance-data";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type Werkbon = Record<string, unknown>;

const STATUSSEN = ["NIEUW", "IN_UITVOERING", "AFGEROND", "GEFACTUREERD"];
const TYPES     = ["Storingsdienst", "Onderhoud", "Installatie", "Reparatie", "Inspectie"];

function MargeCell({ pct }: { pct: number }) {
  const color = pct >= 25 ? "text-emerald-600 dark:text-emerald-400"
              : pct >= 10 ? "text-amber-600 dark:text-amber-400"
              : pct >= 0  ? "text-orange-600 dark:text-orange-400"
              : "text-red-600 dark:text-red-400";
  return <span className={`tabular-nums font-semibold ${color}`}>{formatNumber(pct, 1)}%</span>;
}

const columns: ColumnDef<Werkbon>[] = [
  {
    accessorKey: "BONNUMMER",
    header: "Nummer",
    size: 140,
    cell: ({ getValue }) => <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{String(getValue() ?? "")}</span>,
  },
  {
    accessorKey: "DATUM",
    header: "Datum",
    cell: ({ getValue }) => formatDate(String(getValue() ?? "")),
  },
  { accessorKey: "OMSCHRIJVING", header: "Omschrijving" },
  {
    accessorKey: "TYPE",
    header: "Type",
    cell: ({ getValue }) => <span className="text-xs font-medium">{String(getValue() ?? "")}</span>,
  },
  { accessorKey: "KLANT",        header: "Moederrelatie" },
  { accessorKey: "OBJECTLOCATIE",header: "Objectlocatie" },
  { accessorKey: "FASE",         header: "Fase", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "")}</span> },
  {
    accessorKey: "UITVOERINGSDATUM",
    header: "Uitvoeringsdatum",
    cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : <span className="text-muted-foreground">—</span>,
  },
  { accessorKey: "COORDINATOR", header: "Coordinator" },
  {
    accessorKey: "KOSTEN",
    header: "Kosten",
    cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "INDIRECT",
    header: "Indirect 7,5%",
    cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "ALGEMEEN",
    header: "Algemeen 5%",
    cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "TOTALE_KOSTEN",
    header: "Totale kosten",
    cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "OPBRENGSTEN",
    header: "Opbrengsten",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0
        ? <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(v)}</span>
        : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "B_MARGE",
    header: "B Marge",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v !== 0
        ? <span className={`tabular-nums font-semibold ${v >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(v)}</span>
        : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "MARGE_PCT",
    header: "%",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v !== 0 ? <MargeCell pct={v} /> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "FACTUURNUMMER",
    header: "Factuurnummer",
    cell: ({ getValue }) => getValue()
      ? <span className="font-mono text-xs">{String(getValue())}</span>
      : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "FACTUURDATUM",
    header: "Factuurdatum",
    cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "BETAALD",
    header: "Betaald",
    cell: ({ getValue }) => {
      const v = String(getValue() ?? "");
      if (!v) return <span className="text-muted-foreground">—</span>;
      return v === "Ja"
        ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Ja</span>
        : <span className="text-xs text-orange-600 dark:text-orange-400">Nee</span>;
    },
  },
  {
    accessorKey: "STATUS",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? "")} />,
  },
];

function WerkbonnenInner() {
  const router = useRouter();
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb = useActiveDb();
  const [exporting, setExporting] = useState(false);

  const params = {
    page:      Number(get("page") ?? 1),
    pageSize:  Number(get("pageSize") ?? 50),
    search:    get("search") ?? undefined,
    status:    get("status") ?? undefined,
    type:      get("type") ?? undefined,
    dateFrom:  get("dateFrom") ?? undefined,
    dateTo:    get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["werkbonnen", activeDb, params],
    queryFn:  () => werkbonnenApi.list(params),
    refetchInterval,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("syntess_token");
      const q = new URLSearchParams();
      if (params.search)   q.set("search",   params.search);
      if (params.status)   q.set("status",   params.status);
      if (params.type)     q.set("type",     params.type);
      if (params.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params.dateTo)   q.set("dateTo",   params.dateTo);
      q.set("format", "xlsx");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/v1/werkbonnen/export?${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export mislukt");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `werkbonnen-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel gedownload");
    } catch {
      toast.error("Export mislukt");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Werkbonnen</h1>
          <p className="text-muted-foreground text-sm">
            {data?.total != null ? `${data.total} werkbonnen` : "Laden..."}
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Exporteer Excel
        </Button>
      </div>

      <FilterBar
        search={params.search}
        onSearchChange={(v) => setParams({ search: v, page: "1" })}
        dateFrom={params.dateFrom}
        dateTo={params.dateTo}
        onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
        onReset={resetParams}
      >
        <Select
          value={params.status ?? "alle"}
          onValueChange={(v) => setParams({ status: v === "alle" ? null : v, page: "1" })}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {STATUSSEN.map(s => <SelectItem key={s} value={s} className="text-sm">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={params.type ?? "alle"}
          onValueChange={(v) => setParams({ type: v === "alle" ? null : v, page: "1" })}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle typen</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as Werkbon[]}
        loading={isLoading}
        total={data?.total}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={data?.totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        onRowClick={(row) => router.push(`/werkbonnen/${String(row.ID ?? "")}`)}
        emptyMessage="Geen werkbonnen gevonden"
      />
    </div>
  );
}

// ── Type B: Maintenance werkbonnen (echte Atrium-data) ───────────────────────

interface WbRow {
  BONNUMMER: string; DATUM: string; OMSCHRIJVING: string;
  STATUS: string; STATUS_LABEL: string; METH_LABEL: string; FASE: string;
  KLANT: string; EIGENAAR: string; IS_GEFACTUREERD: boolean;
  // Financieel uit DB
  OPBRENGSTEN: number; UREN_WERKBON: number | null;
  INDIRECT: number | null; B_MARGE: number | null; MARGE_PCT: number | null;
  // Handmatig
  STREEFMARGE_PCT: number | null; VOLLEDIG_BETAALD: boolean; NOTITIES: string;
}

const STATUS_CLR: Record<string, string> = {
  A: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  I: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  U: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  V: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

function EditRow({ wb, onSaved }: { wb: WbRow; onSaved: () => void }) {
  const [vals, setVals] = useState({
    streefmarge: wb.STREEFMARGE_PCT ?? "",
    betaald:     wb.VOLLEDIG_BETAALD,
    notities:    wb.NOTITIES,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const body = {
      streefmargePct: vals.streefmarge !== "" ? Number(vals.streefmarge) : null,
      volledigBetaald: vals.betaald,
      notities: vals.notities || null,
    };
    const r = await fetch(`/api/v1/maintenance/werkbonnen/${wb.BONNUMMER}?database=MAINTENANCE`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) { toast.success("Opgeslagen"); onSaved(); }
    else        toast.error("Opslaan mislukt");
  };

  return (
    <td colSpan={99} className="bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-end gap-4">
        {/* Alle financiële velden komen uit de DB — alleen streefmarge is handmatig */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Streefmarge %</label>
          <input
            type="number" step="0.1" min="0" max="100"
            value={vals.streefmarge as string | number}
            onChange={e => setVals(v => ({ ...v, streefmarge: e.target.value }))}
            className="w-20 h-7 text-xs px-2 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vol. betaald</label>
          <button
            onClick={() => setVals(v => ({ ...v, betaald: !v.betaald }))}
            className={`h-7 w-16 rounded-md text-xs font-semibold border transition-colors ${vals.betaald ? "bg-emerald-500 text-white border-emerald-500" : "bg-background text-muted-foreground"}`}
          >
            {vals.betaald ? "Ja" : "Nee"}
          </button>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notities</label>
          <input type="text" value={vals.notities}
            onChange={e => setVals(v => ({ ...v, notities: e.target.value }))}
            className="h-7 text-xs px-2 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
        </div>
        <button onClick={save} disabled={saving}
          className="h-7 px-3 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Opslaan
        </button>
      </div>
    </td>
  );
}

function MaintenanceWerkbonnenInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const [editingBon, setEditingBon] = useState<string | null>(null);

  const params = {
    database:  "MAINTENANCE",
    page:      Number(get("page") ?? 1),
    pageSize:  Number(get("pageSize") ?? 50),
    search:    get("search") ?? undefined,
    status:    get("status") ?? undefined,
    dateFrom:  get("dateFrom") ?? undefined,
    dateTo:    get("dateTo") ?? undefined,
  };

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });

  const { data, isLoading, refetch } = useQuery<{ data: WbRow[]; total: number; totalPages: number }>({
    queryKey: ["maintenance", "werkbonnen-list", params],
    queryFn:  () => fetch(`/api/v1/maintenance/werkbonnen?${qs}`).then(r => r.json()),
  });

  const bons = data?.data ?? [];

  const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );

  const fmt = (v: number | null) => v != null ? formatCurrency(v) : <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Werkbonnen</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total != null ? `${data.total} werkbonnen` : "Laden…"}
            <span className="ml-2 text-[11px] text-muted-foreground/70">· server-side paginatie · klik ✎ voor handmatige velden</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        search={params.search}
        onSearchChange={v => setParams({ search: v, page: "1" })}
        dateFrom={params.dateFrom}
        dateTo={params.dateTo}
        onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
        onReset={resetParams}
      >
        <Select value={params.status ?? "alle"} onValueChange={v => setParams({ status: v === "alle" ? null : v, page: "1" })}>
          <SelectTrigger className="h-8 w-38 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            <SelectItem value="openstaand">Openstaand (A+I)</SelectItem>
            <SelectItem value="afgerond">Afgerond (U+V)</SelectItem>
            <SelectItem value="A">Aangemaakt</SelectItem>
            <SelectItem value="I">In uitvoering</SelectItem>
            <SelectItem value="U">Uitgevoerd</SelectItem>
            <SelectItem value="V">Voltoooid</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Tabel */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <Th>Bonnummer</Th>
                <Th>Datum</Th>
                <Th>Klant</Th>
                <Th>Omschrijving</Th>
                <Th>Status</Th>
                <Th>Fase</Th>
                <Th>Eigenaar</Th>
                <Th>Fact.</Th>
                <Th right>Opbrengsten</Th>
                <Th right>Uren</Th>
                <Th right>Indirect</Th>
                <Th right>B Marge</Th>
                <Th right>%</Th>
                <Th right>Streef%</Th>
                <Th>Betaald</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} className="py-12 text-center text-muted-foreground">Laden…</td></tr>
              ) : bons.length === 0 ? (
                <tr><td colSpan={14} className="py-12 text-center text-muted-foreground">Geen werkbonnen gevonden</td></tr>
              ) : bons.flatMap((wb, i) => {
                const editing = editingBon === wb.BONNUMMER;
                const rows = [
                  <tr key={wb.BONNUMMER} className={`border-b hover:bg-muted/30 transition-colors ${editing ? "bg-blue-50 dark:bg-blue-950/20" : i % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{wb.BONNUMMER}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(wb.DATUM)}</td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate text-xs" title={wb.KLANT}>{wb.KLANT || "—"}</td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate text-xs text-muted-foreground" title={wb.OMSCHRIJVING}>{wb.OMSCHRIJVING || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CLR[wb.STATUS] ?? ""}`}>
                        {wb.STATUS_LABEL}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{wb.FASE || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{wb.EIGENAAR || "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {wb.IS_GEFACTUREERD
                        ? <span className="text-emerald-600 font-semibold">✓</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                      {wb.OPBRENGSTEN > 0 ? fmt(wb.OPBRENGSTEN) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {wb.UREN_WERKBON != null ? wb.UREN_WERKBON.toFixed(1) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {wb.INDIRECT != null ? fmt(wb.INDIRECT) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-xs font-semibold ${wb.B_MARGE != null ? (wb.B_MARGE >= 0 ? "text-emerald-600" : "text-red-600") : ""}`}>
                      {wb.B_MARGE != null ? fmt(wb.B_MARGE) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${wb.MARGE_PCT != null ? (wb.MARGE_PCT >= 20 ? "text-emerald-600" : wb.MARGE_PCT >= 0 ? "text-amber-600" : "text-red-600") : ""}`}>
                      {wb.MARGE_PCT != null ? `${wb.MARGE_PCT.toFixed(1)}%` : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-blue-600">
                      {wb.STREEFMARGE_PCT != null ? `${wb.STREEFMARGE_PCT.toFixed(1)}%` : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {wb.VOLLEDIG_BETAALD
                        ? <span className="text-emerald-600 font-semibold">✓</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setEditingBon(editing ? null : wb.BONNUMMER)}
                        className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${editing ? "bg-blue-600 text-white" : "hover:bg-muted text-muted-foreground"}`}
                        title="Handmatige velden bewerken"
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                ];
                if (editing) {
                  rows.push(
                    <tr key={`${wb.BONNUMMER}-edit`} className="border-b bg-blue-50 dark:bg-blue-950/20">
                      <EditRow wb={wb} onSaved={() => { refetch(); }} />
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginatie */}
      <div className="flex items-center justify-between text-sm">
        <span suppressHydrationWarning className="text-muted-foreground">
          {data?.total ? `${(params.page - 1) * params.pageSize + 1}–${Math.min(params.page * params.pageSize, data.total)} van ${data.total}` : ""}
        </span>
        <div className="flex gap-2">
          <button disabled={params.page <= 1} onClick={() => setParams({ page: String(params.page - 1) })}
            className="px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-40 text-xs">← Vorige</button>
          <span className="px-3 py-1.5 text-muted-foreground text-xs">Pagina {params.page} / {data?.totalPages ?? "…"}</span>
          <button disabled={params.page >= (data?.totalPages ?? 1)} onClick={() => setParams({ page: String(params.page + 1) })}
            className="px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-40 text-xs">Volgende →</button>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function WerkbonnenPage() {
  const viewType = useViewTypeSafe();
  return <Suspense>{viewType === "CUSTOMER" ? <MaintenanceWerkbonnenInner /> : <WerkbonnenInner />}</Suspense>;
}
