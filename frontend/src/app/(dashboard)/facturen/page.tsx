"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { facturenApi } from "@/lib/api-client";
import { formatDate, formatCurrency, formatDaysOverdue } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { useRole } from "@/hooks/use-role";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";

type Factuur = Record<string, unknown>;

const columns: ColumnDef<Factuur>[] = [
  { accessorKey: "FACTUURNUMMER", header: "Factuurnummer", size: 130 },
  { accessorKey: "KLANT", header: "Klant" },
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "VERVALDATUM", header: "Vervaldatum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  {
    accessorKey: "BEDRAG_EXCL",
    header: "Excl. BTW",
    cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "TOTAALBEDRAG",
    header: "Totaal",
    cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "OPENSTAAND",
    header: "Openstaand",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return <span className={`tabular-nums ${v > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>{formatCurrency(v)}</span>;
    },
  },
  {
    accessorKey: "DAGEN_OVERDUE",
    header: "Overdue",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <Badge variant="destructive" className="text-xs">{formatDaysOverdue(v)}</Badge> : null;
    },
  },
  { accessorKey: "STATUS", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? "")} /> },
];

const AGING_LABELS: Record<string, string> = {
  current: "Niet vervallen",
  "1-30": "1–30 dagen",
  "31-60": "31–60 dagen",
  "61-90": "61–90 dagen",
  "90+": "90+ dagen",
};

const MGM_DBS = [
  { db: "SERVICES",      label: "Elmar Services",      dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { db: "MAINTENANCE",   label: "Elmar Maintenance",   dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  { db: "INTERNATIONAL", label: "Elmar International", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
] as const;

// ── Management facturen (MGM rol) ─────────────────────────────────────────────

function ManagementFacturenPage() {
  const [db, setDb]         = useState<string>("SERVICES");
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo]     = useState<string | undefined>(undefined);

  const { data: list, isLoading } = useQuery({
    queryKey: ["mgm-facturen-list", db, page, search, statusFilter, dateFrom, dateTo],
    queryFn: () => {
      const p = new URLSearchParams({ database: db, page: String(page), pageSize: "50" });
      if (search)                    p.set("search",   search);
      if (statusFilter !== "alle")   p.set("status",   statusFilter);
      if (dateFrom)                  p.set("dateFrom", dateFrom);
      if (dateTo)                    p.set("dateTo",   dateTo);
      return fetch(`/api/v1/facturen?${p}`).then(r => r.json());
    },
  });

  const { data: aging } = useQuery({
    queryKey: ["mgm-facturen-aging", db],
    queryFn: () => fetch(`/api/v1/facturen/aging?database=${db}`).then(r => r.json()),
  });

  const dbCfg = MGM_DBS.find(d => d.db === db)!;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturen — Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Verkoop- en projectfacturen per bedrijf</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {MGM_DBS.map(({ db: d, label, dot, badge }) => (
            <button key={d} onClick={() => { setDb(d); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                db === d ? `${badge} border-current` : "border-border text-muted-foreground hover:bg-muted"
              }`}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Aging cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(aging as Record<string, unknown>[] | undefined)?.map((bucket) => (
          <Card key={String(bucket.BUCKET)} className="bg-background">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {AGING_LABELS[String(bucket.BUCKET)] ?? bucket.BUCKET}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-base font-bold tabular-nums">{formatCurrency(Number(bucket.BEDRAG ?? 0))}</div>
              <div className="text-xs text-muted-foreground">{Number(bucket.AANTAL ?? 0)} {Number(bucket.AANTAL ?? 0) === 1 ? "factuur" : "facturen"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="alle">Alle</TabsTrigger>
          <TabsTrigger value="open">Openstaand</TabsTrigger>
          <TabsTrigger value="betaald">Betaald</TabsTrigger>
        </TabsList>
        <TabsContent value={statusFilter} className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="search"
              placeholder="Zoek op factuurnummer, klant…"
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
            columns={columns}
            data={((list as { data?: Factuur[] } | undefined)?.data ?? []) as Factuur[]}
            loading={isLoading}
            total={(list as { total?: number } | undefined)?.total}
            page={page}
            pageSize={50}
            totalPages={(list as { totalPages?: number } | undefined)?.totalPages}
            onPageChange={setPage}
            emptyMessage="Geen facturen gevonden"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Reguliere facturen ────────────────────────────────────────────────────────

function FacturenInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb  = useActiveDb();
  const activeTab = get("tab") ?? "alle";

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    status: activeTab !== "alle" ? activeTab : undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["facturen", params, activeDb],
    queryFn: () => facturenApi.list(params),
    refetchInterval,
  });

  const { data: aging } = useQuery({
    queryKey: ["facturen", "aging", activeDb],
    queryFn: facturenApi.aging,
    refetchInterval,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Facturen" description="Verkoop- en projectfacturen — openstaand, betaald en overdue" />

      {/* Aging overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(aging as Record<string, unknown>[] | undefined)?.map((bucket) => (
          <Card key={String(bucket.BUCKET)} className="bg-background">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {AGING_LABELS[String(bucket.BUCKET)] ?? bucket.BUCKET}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-base font-bold tabular-nums">{formatCurrency(Number(bucket.BEDRAG ?? 0))}</div>
              <div className="text-xs text-muted-foreground">{Number(bucket.AANTAL ?? 0)} {Number(bucket.AANTAL ?? 0) === 1 ? "factuur" : "facturen"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setParams({ tab: v, page: "1" })}>
        <TabsList>
          <TabsTrigger value="alle">Alle</TabsTrigger>
          <TabsTrigger value="open">Openstaand</TabsTrigger>
          <TabsTrigger value="betaald">Betaald</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <FilterBar
            search={params.search}
            onSearchChange={(v) => setParams({ search: v, page: "1" })}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
            onReset={resetParams}
          />

          <DataTable
            columns={columns}
            data={(data?.data ?? []) as Factuur[]}
            loading={isLoading}
            total={data?.total}
            page={params.page}
            pageSize={params.pageSize}
            totalPages={data?.totalPages}
            onPageChange={(p) => setParams({ page: String(p) })}
            emptyMessage="Geen facturen gevonden"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FacturenPage() {
  const role = useRole();
  if (role === "MGM") return <ManagementFacturenPage />;
  return (
    <Suspense>
      <FacturenInner />
    </Suspense>
  );
}
