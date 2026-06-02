"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { klantenApi } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import type { MaintenanceKlant } from "@/lib/mock/maintenance-data";

type Klant = Record<string, unknown>;

const columns: ColumnDef<Klant>[] = [
  { accessorKey: "KLANTNUMMER", header: "Nr.", size: 100 },
  { accessorKey: "NAAM", header: "Naam" },
  { accessorKey: "PLAATS", header: "Plaats" },
  { accessorKey: "EMAIL", header: "E-mail" },
  { accessorKey: "TELEFOON", header: "Telefoon" },
  {
    accessorKey: "OMZET",
    header: "Omzet dit jaar",
    cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "OPENSTAAND",
    header: "Openstaand",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return <span className={`tabular-nums ${v > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>{formatCurrency(v)}</span>;
    },
  },
];

function KlantenInner() {
  const router = useRouter();
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb = useActiveDb();

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["klanten", activeDb, params],
    queryFn: () => klantenApi.list(params),
    refetchInterval,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
      <FilterBar
        search={params.search}
        onSearchChange={(v) => setParams({ search: v, page: "1" })}
        onReset={resetParams}
      />
      <DataTable
        columns={columns}
        data={(data?.data ?? []) as Klant[]}
        loading={isLoading}
        total={data?.total}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={data?.totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        onRowClick={(row) => router.push(`/klanten/${String(row.ID ?? "")}`)}
        emptyMessage="Geen klanten gevonden"
      />
    </div>
  );
}

// ── Type B: Maintenance klanten (echte rm_werkbon data) ───────────────────────

interface RealKlant {
  klant:      string;
  totaalBons: number;
  week:  { openstaand: number; uitgevoerd: number; totaal: number };
  maand: { openstaand: number; uitgevoerd: number; totaal: number };
  jaar:  { openstaand: number; uitgevoerd: number; totaal: number };
}

function MaintenanceKlantenInner() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<RealKlant[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten?database=MAINTENANCE").then(r => r.json()),
    staleTime: 120_000,
  });

  const klanten = (data ?? []).filter(k =>
    !search || k.klant.toLowerCase().includes(search.toLowerCase())
  );

  const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} klanten met werkbonnen` : "Laden…"}
          </p>
        </div>
        <input
          type="search" placeholder="Zoek klant…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-64 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <Th>Klant / locatie</Th>
                <Th right>Week open</Th>
                <Th right>Week uitg.</Th>
                <Th right>Maand open</Th>
                <Th right>Maand uitg.</Th>
                <Th right>Jaar totaal</Th>
                <Th right>Totaal</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Laden…</td></tr>
              ) : klanten.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Geen klanten gevonden</td></tr>
              ) : klanten.map((k, i) => (
                <tr key={k.klant} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-3 py-2.5 font-medium text-xs max-w-[220px] truncate" title={k.klant}>{k.klant}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${k.week.openstaand > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                    {k.week.openstaand || "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${k.week.uitgevoerd > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {k.week.uitgevoerd || "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${k.maand.openstaand > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                    {k.maand.openstaand || "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${k.maand.uitgevoerd > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {k.maand.uitgevoerd || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">{k.jaar.totaal}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs font-semibold">{k.totaalBons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function KlantenPage() {
  const viewType = useViewTypeSafe();
  return <Suspense>{viewType === "CUSTOMER" ? <MaintenanceKlantenInner /> : <KlantenInner />}</Suspense>;
}
