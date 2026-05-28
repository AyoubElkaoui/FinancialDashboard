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

export default function WerkbonnenPage() {
  return <Suspense><WerkbonnenInner /></Suspense>;
}
