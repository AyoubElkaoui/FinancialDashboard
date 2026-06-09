"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { grootboekApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { useRole } from "@/hooks/use-role";

type Mutatie = Record<string, unknown>;
type Resultaat = Record<string, unknown>;

const mutatieColumns: ColumnDef<Mutatie>[] = [
  { accessorKey: "PROJECT",        header: "Project",  size: 120, cell: ({ getValue }) => {
    const v = String(getValue() ?? "");
    return v ? <span className="font-mono text-xs text-muted-foreground">{v}</span> : <span className="text-muted-foreground">—</span>;
  }},
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "REKENINGNUMMER", header: "Rekening", size: 80 },
  { accessorKey: "RUBRIEK", header: "Rubriek" },
  { accessorKey: "OMSCHRIJVING", header: "Omschrijving" },
  {
    accessorKey: "DEBET",
    header: "Debet",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <span className="tabular-nums text-red-600">{formatCurrency(v)}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "CREDIT",
    header: "Credit",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <span className="tabular-nums text-green-600">{formatCurrency(v)}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
];

const resultaatColumns: ColumnDef<Resultaat>[] = [
  { accessorKey: "REKENINGNUMMER", header: "Rekening", size: 90 },
  { accessorKey: "OMSCHRIJVING", header: "Omschrijving" },
  { accessorKey: "SOORT", header: "Soort", cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{String(getValue() ?? "")}</Badge> },
  { accessorKey: "DEBET_TOTAAL", header: "Debet", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "CREDIT_TOTAAL", header: "Credit", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  {
    accessorKey: "SALDO",
    header: "Saldo",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return <span className={`tabular-nums font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(v)}</span>;
    },
  },
];

const MGM_DBS = [
  { db: "SERVICES",      label: "Elmar Services",      dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { db: "MAINTENANCE",   label: "Elmar Maintenance",   dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  { db: "INTERNATIONAL", label: "Elmar International", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
] as const;

// ── Management grootboek (MGM rol) ────────────────────────────────────────────

function ManagementGrootboekPage() {
  const router = useRouter();
  const [db, setDb]         = useState<string>("SERVICES");
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo]     = useState<string | undefined>(undefined);
  const [rubriekCode, setRubriekCode] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("mutaties");

  const { data: rubrieken } = useQuery({
    queryKey: ["mgm-gb-rubrieken", db],
    queryFn: () => fetch(`/api/v1/grootboek/rubrieken?database=${db}`).then(r => r.json()),
    staleTime: 300_000,
  });

  const { data: mutaties, isLoading: mutatiesLoading } = useQuery({
    queryKey: ["mgm-gb-mutaties", db, page, search, dateFrom, dateTo, rubriekCode],
    queryFn: () => {
      const p = new URLSearchParams({ database: db, page: String(page), pageSize: "50" });
      if (search)      p.set("search",      search);
      if (dateFrom)    p.set("dateFrom",    dateFrom);
      if (dateTo)      p.set("dateTo",      dateTo);
      if (rubriekCode) p.set("rubriekCode", rubriekCode);
      return fetch(`/api/v1/grootboek/mutaties?${p}`).then(r => r.json());
    },
    enabled: activeTab === "mutaties",
  });

  const { data: resultaat, isLoading: resultaatLoading } = useQuery({
    queryKey: ["mgm-gb-resultaat", db],
    queryFn: () => fetch(`/api/v1/grootboek/resultaat?database=${db}`).then(r => r.json()),
    enabled: activeTab === "resultaat",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grootboek — Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Journaalmutaties per bedrijf</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {MGM_DBS.map(({ db: d, label, dot, badge }) => (
            <button key={d} onClick={() => { setDb(d); setPage(1); setRubriekCode(undefined); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                db === d ? `${badge} border-current` : "border-border text-muted-foreground hover:bg-muted"
              }`}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="mutaties">Mutaties</TabsTrigger>
          <TabsTrigger value="resultaat">Resultatenrekening</TabsTrigger>
        </TabsList>

        <TabsContent value="mutaties" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <input
              type="search"
              placeholder="Zoek op project, rubriek, omschrijving…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-8 w-72 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input type="date" lang="nl" value={dateFrom ?? ""}
              onChange={e => { setDateFrom(e.target.value || undefined); setPage(1); }}
              className="h-8 rounded-md border bg-background px-2 text-sm" />
            <span className="flex items-center text-sm text-muted-foreground">t/m</span>
            <input type="date" lang="nl" value={dateTo ?? ""}
              onChange={e => { setDateTo(e.target.value || undefined); setPage(1); }}
              className="h-8 rounded-md border bg-background px-2 text-sm" />
            <Select
              value={rubriekCode ?? "alle"}
              onValueChange={v => { setRubriekCode(v === "alle" ? undefined : v ?? undefined); setPage(1); }}
            >
              <SelectTrigger className="h-8 w-56 text-sm">
                <SelectValue placeholder="Rubriek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle rubrieken</SelectItem>
                {(rubrieken as Record<string, unknown>[] | undefined)?.map(r => (
                  <SelectItem key={String(r.REKENINGNUMMER)} value={String(r.REKENINGNUMMER)} className="text-sm">
                    {String(r.REKENINGNUMMER)} — {String(r.OMSCHRIJVING)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={mutatieColumns}
            data={((mutaties as { data?: Mutatie[] } | undefined)?.data ?? []) as Mutatie[]}
            loading={mutatiesLoading}
            total={(mutaties as { total?: number } | undefined)?.total}
            page={page}
            pageSize={50}
            totalPages={(mutaties as { totalPages?: number } | undefined)?.totalPages}
            onPageChange={setPage}
            emptyMessage="Geen mutaties gevonden"
            onRowClick={(row) => {
              const proj = String((row as Mutatie).PROJECT ?? "");
              if (proj) router.push(`/management/${db}/${encodeURIComponent(proj)}`);
            }}
          />
        </TabsContent>

        <TabsContent value="resultaat" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resultatenrekening — huidig jaar</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={resultaatColumns}
                data={(resultaat as Resultaat[] | undefined) ?? []}
                loading={resultaatLoading}
                emptyMessage="Geen gegevens beschikbaar"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Reguliere grootboek ───────────────────────────────────────────────────────

function GrootboekInner() {
  const { get, setParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb  = useActiveDb();
  const activeTab = get("tab") ?? "mutaties";

  const mutatieParams = {
    page:        Number(get("page") ?? 1),
    pageSize:    Number(get("pageSize") ?? 50),
    rubriekCode: get("rubriekCode") ?? undefined,
    search:      get("search")      ?? undefined,
    dateFrom:    get("dateFrom")    ?? undefined,
    dateTo:      get("dateTo")      ?? undefined,
  };

  const { data: rubrieken } = useQuery({
    queryKey: ["grootboek", activeDb, "rubrieken"],
    queryFn: grootboekApi.rubrieken,
    staleTime: 300_000,
  });

  const { data: mutaties, isLoading: mutatiesLoading } = useQuery({
    queryKey: ["grootboek", activeDb, "mutaties", mutatieParams],
    queryFn: () => grootboekApi.mutaties(mutatieParams),
    refetchInterval,
    enabled: activeTab === "mutaties",
  });

  const { data: resultaat, isLoading: resultaatLoading } = useQuery({
    queryKey: ["grootboek", activeDb, "resultaat"],
    queryFn: grootboekApi.resultaat,
    refetchInterval,
    enabled: activeTab === "resultaat",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Grootboek</h1>

      <Tabs value={activeTab} onValueChange={(v) => setParams({ tab: v, page: "1" })}>
        <TabsList>
          <TabsTrigger value="mutaties">Mutaties</TabsTrigger>
          <TabsTrigger value="resultaat">Resultatenrekening</TabsTrigger>
        </TabsList>

        <TabsContent value="mutaties" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <input
              type="search"
              placeholder="Zoek op project, rubriek, omschrijving…"
              value={get("search") ?? ""}
              onChange={e => setParams({ search: e.target.value || null, page: "1" })}
              className="h-8 w-72 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="date"
              lang="nl"
              value={get("dateFrom") ?? ""}
              onChange={e => setParams({ dateFrom: e.target.value || null, page: "1" })}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            />
            <span className="flex items-center text-sm text-muted-foreground">t/m</span>
            <input
              type="date"
              lang="nl"
              value={get("dateTo") ?? ""}
              onChange={e => setParams({ dateTo: e.target.value || null, page: "1" })}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            />
            <Select
              value={mutatieParams.rubriekCode ?? "alle"}
              onValueChange={(v) => setParams({ rubriekCode: v === "alle" ? null : v, page: "1" })}
            >
              <SelectTrigger className="h-8 w-56 text-sm">
                <SelectValue placeholder="Rubriek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle rubrieken</SelectItem>
                {(rubrieken as Record<string, unknown>[] | undefined)?.map(r => (
                  <SelectItem key={String(r.REKENINGNUMMER)} value={String(r.REKENINGNUMMER)} className="text-sm">
                    {String(r.REKENINGNUMMER)} — {String(r.OMSCHRIJVING)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={mutatieColumns}
            data={(mutaties?.data ?? []) as Mutatie[]}
            loading={mutatiesLoading}
            total={mutaties?.total}
            page={mutatieParams.page}
            pageSize={mutatieParams.pageSize}
            totalPages={mutaties?.totalPages}
            onPageChange={(p) => setParams({ page: String(p) })}
            emptyMessage="Geen mutaties gevonden"
          />
        </TabsContent>

        <TabsContent value="resultaat" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resultatenrekening — huidig jaar</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={resultaatColumns}
                data={(resultaat as Resultaat[] | undefined) ?? []}
                loading={resultaatLoading}
                emptyMessage="Geen gegevens beschikbaar"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GrootboekPage() {
  const role = useRole();
  if (role === "MGM") return <Suspense><ManagementGrootboekPage /></Suspense>;
  return <Suspense><GrootboekInner /></Suspense>;
}
