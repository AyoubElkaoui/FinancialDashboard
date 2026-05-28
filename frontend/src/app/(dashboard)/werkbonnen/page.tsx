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

// ── Type B: Maintenance werkbonnen ────────────────────────────────────────────

const MAINTENANCE_STATUSSEN: WerkbonStatus[] = ["AANGEMAAKT", "UITGEVOERD", "OPENSTAAND"];
const MAINTENANCE_CATS: WerkbonCategorie[]   = ["ONDERHOUD", "EW", "CV", "SLUITING_300", "KLUSSEN_300"];

const STATUS_COLORS: Record<WerkbonStatus, string> = {
  UITGEVOERD: "text-emerald-600 dark:text-emerald-400",
  OPENSTAAND: "text-orange-600 dark:text-orange-400",
  AANGEMAAKT: "text-slate-500",
};

function MaintenanceWerkbonnenInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const params = {
    page:      Number(get("page") ?? 1),
    pageSize:  Number(get("pageSize") ?? 50),
    search:    get("search") ?? undefined,
    status:    get("status") as WerkbonStatus | undefined,
    categorie: get("categorie") as WerkbonCategorie | undefined,
    klantId:   get("klantId") ?? undefined,
    dateFrom:  get("dateFrom") ?? undefined,
    dateTo:    get("dateTo") ?? undefined,
  };

  const qs = new URLSearchParams();
  qs.set("page",     String(params.page));
  qs.set("pageSize", String(params.pageSize));
  if (params.search)    qs.set("search",    params.search);
  if (params.status)    qs.set("status",    params.status);
  if (params.categorie) qs.set("categorie", params.categorie);
  if (params.klantId)   qs.set("klantId",   params.klantId);
  if (params.dateFrom)  qs.set("dateFrom",  params.dateFrom);
  if (params.dateTo)    qs.set("dateTo",    params.dateTo);

  const { data, isLoading } = useQuery<{ data: MaintenanceWerkbon[]; total: number }>({
    queryKey: ["maintenance", "werkbonnen", params],
    queryFn:  () => fetch(`/api/v1/maintenance/werkbonnen?${qs}`).then(r => r.json()),
  });

  const { data: klanten } = useQuery<{ id: string; naam: string }[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten").then(r => r.json()),
    staleTime: 300_000,
  });

  const bons = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Werkbonnen</h1>
          <p className="text-sm text-muted-foreground">{data?.total != null ? `${data.total} werkbonnen` : "Laden…"}</p>
        </div>
      </div>

      <FilterBar
        search={params.search}
        onSearchChange={v => setParams({ search: v, page: "1" })}
        dateFrom={params.dateFrom}
        dateTo={params.dateTo}
        onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
        onReset={resetParams}
      >
        <Select value={params.status ?? "alle"} onValueChange={v => setParams({ status: v === "alle" ? null : v, page: "1" })}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {MAINTENANCE_STATUSSEN.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.categorie ?? "alle"} onValueChange={v => setParams({ categorie: v === "alle" ? null : v, page: "1" })}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Categorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle categorieën</SelectItem>
            {MAINTENANCE_CATS.map(c => <SelectItem key={c} value={c}>{CATEGORIE_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.klantId ?? "alle"} onValueChange={v => setParams({ klantId: v === "alle" ? null : v, page: "1" })}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle klanten</SelectItem>
            {(klanten ?? []).map(k => <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Bon-ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Klant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Categorie</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Omschrijving</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Technicus</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Datum</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Omzet</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Laden…</td></tr>
              ) : bons.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Geen werkbonnen gevonden</td></tr>
              ) : bons.map((b, i) => (
                <tr key={b.id} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{b.id}</td>
                  <td className="px-4 py-2.5 font-medium">{b.klantNaam}</td>
                  <td className="px-4 py-2.5 text-xs"><span className="rounded-md bg-muted px-2 py-0.5">{CATEGORIE_LABELS[b.categorie]}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{b.omschrijving}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{b.technicus}</td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{b.datum}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {b.omzet > 0 ? formatCurrency(b.omzet) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-xs font-semibold ${STATUS_COLORS[b.status]}`}>{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > params.pageSize && (
        <div className="flex justify-end gap-2 text-sm">
          <button disabled={params.page <= 1} onClick={() => setParams({ page: String(params.page - 1) })}
            className="px-3 py-1.5 rounded border hover:bg-muted disabled:opacity-40">Vorige</button>
          <span className="px-3 py-1.5 text-muted-foreground">Pagina {params.page}</span>
          <button disabled={(data?.total ?? 0) <= params.page * params.pageSize} onClick={() => setParams({ page: String(params.page + 1) })}
            className="px-3 py-1.5 rounded border hover:bg-muted disabled:opacity-40">Volgende</button>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function WerkbonnenPage() {
  const viewType = useViewTypeSafe();
  return <Suspense>{viewType === "CUSTOMER" ? <MaintenanceWerkbonnenInner /> : <WerkbonnenInner />}</Suspense>;
}
