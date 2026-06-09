"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { inkoopApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { useRole } from "@/hooks/use-role";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getChartColor } from "@/lib/chart-colors";
import { PageHeader } from "@/components/ui/page-header";

type Inkoop = Record<string, unknown>;

const columns: ColumnDef<Inkoop>[] = [
  { accessorKey: "FACTUURNUMMER", header: "Factuurnummer", size: 140 },
  { accessorKey: "LEVERANCIER", header: "Leverancier" },
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "BEDRAG_EXCL", header: "Excl. BTW", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "BTW", header: "BTW", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "TOTAALBEDRAG", header: "Totaal", cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "STATUS", header: "Status", cell: ({ getValue }) => <Badge variant="secondary" className="text-xs">{String(getValue() ?? "")}</Badge> },
];

const mgmColumns: ColumnDef<Inkoop>[] = [
  { accessorKey: "PROJECT",       header: "Project",      size: 130, cell: ({ getValue }) => {
    const v = String(getValue() ?? "");
    return v ? <span className="font-mono text-xs text-muted-foreground">{v}</span> : <span className="text-muted-foreground">—</span>;
  }},
  { accessorKey: "LEVERANCIER",   header: "Leverancier" },
  { accessorKey: "DATUM",         header: "Datum",    cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "BEDRAG_EXCL",   header: "Excl. BTW", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "TOTAALBEDRAG",  header: "Totaal",   cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "STATUS",        header: "Status",   cell: ({ getValue }) => <Badge variant="secondary" className="text-xs">{String(getValue() ?? "")}</Badge> },
];

// ── Gedeelde hulpfuncties ──────────────────────────────────────────────────────

const MGM_DBS = [
  { db: "SERVICES",      label: "Elmar Services",      dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { db: "MAINTENANCE",   label: "Elmar Maintenance",   dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  { db: "INTERNATIONAL", label: "Elmar International", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
] as const;

function topNOverig(data: { name: string; value: number }[], n = 8) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  return [...sorted.slice(0, n), { name: "Overig", value: sorted.slice(n).reduce((s, r) => s + r.value, 0) }];
}

// ── Management inkoop (MGM rol) ───────────────────────────────────────────────

function ManagementInkoopPage() {
  const router = useRouter();
  const [db, setDb]         = useState<string>("SERVICES");
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo]     = useState<string | undefined>(undefined);

  const buildUrl = (base: string, extra?: Record<string, string>) => {
    const p = new URLSearchParams({ database: db, ...extra });
    return `${base}?${p}`;
  };

  const { data: list, isLoading } = useQuery({
    queryKey: ["mgm-inkoop-list", db, page, search, dateFrom, dateTo],
    queryFn: () => {
      const p = new URLSearchParams({ database: db, page: String(page), pageSize: "50" });
      if (search)   p.set("search",   search);
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo)   p.set("dateTo",   dateTo);
      return fetch(`/api/v1/inkoop?${p}`).then(r => r.json());
    },
  });

  const { data: perKs } = useQuery({
    queryKey: ["mgm-inkoop-ks", db],
    queryFn: () => fetch(buildUrl("/api/v1/inkoop/per-kostensoort")).then(r => r.json()),
  });

  const rawChart = (perKs as Record<string, unknown>[] | undefined)?.map(r => ({
    name: String(r.KOSTENSOORT ?? ""),
    value: Number(r.BEDRAG ?? 0),
  })) ?? [];
  const chartData = topNOverig(rawChart);

  const dbCfg = MGM_DBS.find(d => d.db === db)!;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inkoop — Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Inkoopfacturen per bedrijf</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {MGM_DBS.map(({ db: d, label, dot }) => (
            <button key={d} onClick={() => { setDb(d); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                db === d
                  ? `${MGM_DBS.find(x => x.db === d)!.badge} border-current`
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Zoek + datum filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="search"
              placeholder="Zoek op factuurnummer, leverancier…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-9 w-64 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input type="date" lang="nl" value={dateFrom ?? ""}
              onChange={e => { setDateFrom(e.target.value || undefined); setPage(1); }}
              className="h-9 rounded-md border bg-background px-2 text-sm" />
            <span className="text-sm text-muted-foreground">t/m</span>
            <input type="date" lang="nl" value={dateTo ?? ""}
              onChange={e => { setDateTo(e.target.value || undefined); setPage(1); }}
              className="h-9 rounded-md border bg-background px-2 text-sm" />
            {(search || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(""); setDateFrom(undefined); setDateTo(undefined); setPage(1); }}
                className="h-9 px-3 rounded-md border text-xs text-muted-foreground hover:bg-muted">
                Reset
              </button>
            )}
          </div>

          <DataTable
            columns={mgmColumns}
            data={((list as { data?: Inkoop[] } | undefined)?.data ?? []) as Inkoop[]}
            loading={isLoading}
            total={(list as { total?: number } | undefined)?.total}
            page={page}
            pageSize={50}
            totalPages={(list as { totalPages?: number } | undefined)?.totalPages}
            onPageChange={setPage}
            emptyMessage="Geen inkoopfacturen gevonden"
            onRowClick={(row) => {
              const proj = String((row as Inkoop).PROJECT ?? "");
              if (proj) router.push(`/management/${db}/${encodeURIComponent(proj)}`);
            }}
          />
        </div>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${dbCfg.dot}`} />
              Verdeling {dbCfg.label} (top 8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={70} label={false}>
                      {chartData.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {chartData.map((d, i) => {
                    const tot = chartData.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getChartColor(i) }} />
                          <span className="text-muted-foreground truncate max-w-[130px]">{d.name}</span>
                        </span>
                        <span className="tabular-nums ml-1 shrink-0">{tot > 0 ? (d.value / tot * 100).toFixed(0) : 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Reguliere inkoop ──────────────────────────────────────────────────────────

function InkoopInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb = useActiveDb();

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["inkoop", activeDb, params],
    queryFn: () => inkoopApi.list(params),
    refetchInterval,
  });

  const { data: perKostensoort } = useQuery({
    queryKey: ["inkoop", activeDb, "per-kostensoort"],
    queryFn: inkoopApi.perKostensoort,
    refetchInterval,
  });

  const rawChart = (perKostensoort as Record<string, unknown>[] | undefined)?.map(r => ({
    name: String(r.KOSTENSOORT ?? ""),
    value: Number(r.BEDRAG ?? 0),
  })) ?? [];
  const chartData = topNOverig(rawChart);

  return (
    <div className="space-y-5">
      <PageHeader title="Inkoop" description="Inkoopfacturen en kostensoort-analyse" />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <FilterBar
            search={params.search}
            onSearchChange={(v) => setParams({ search: v, page: "1" })}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
            onReset={resetParams}
          />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Verdeling dit jaar (top 8)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={70} label={false}>
                  {chartData.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {chartData.map((d, i) => {
                const tot = chartData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getChartColor(i) }} />
                      <span className="text-muted-foreground truncate max-w-[130px]">{d.name}</span>
                    </span>
                    <span className="tabular-nums ml-1 shrink-0">{tot > 0 ? (d.value / tot * 100).toFixed(0) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as Inkoop[]}
        loading={isLoading}
        total={data?.total}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={data?.totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        emptyMessage="Geen inkoopfacturen gevonden"
      />
    </div>
  );
}

export default function InkoopPage() {
  const role = useRole();
  if (role === "MGM") return <ManagementInkoopPage />;
  return <Suspense><InkoopInner /></Suspense>;
}
