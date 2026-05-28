"use client";

import { Suspense } from "react";
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
import { useViewType } from "@/hooks/use-view-type";
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
      <h1 className="text-2xl font-semibold">Klanten</h1>
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

// ── Type B: Maintenance klanten ───────────────────────────────────────────────

interface KlantWithSummary extends MaintenanceKlant {
  summary: {
    week:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    maand: { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    jaar:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
  };
}

function MaintenanceKlantenInner() {
  const router = useRouter();
  const { data, isLoading } = useQuery<KlantWithSummary[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten").then(r => r.json()),
    staleTime: 120_000,
  });

  const klanten = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Klanten</h1>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Klant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Variant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Plaats</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l">Week omzet</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Week bons</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l">Maand omzet</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Maand bons</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Openstaand</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Laden…</td></tr>
              ) : klanten.map((k, i) => (
                <tr
                  key={k.id}
                  className={`border-b last:border-0 cursor-pointer hover:bg-muted/40 ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                  onClick={() => router.push(`/klanten/${k.id}`)}
                >
                  <td className="px-4 py-2.5 font-semibold">{k.naam}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{k.variant}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{k.plaats}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium border-l">{formatCurrency(k.summary.week.omzet)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.week.totaal}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium border-l">{formatCurrency(k.summary.maand.omzet)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.maand.totaal}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${k.summary.maand.openstaand > 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground"}`}>
                    {k.summary.maand.openstaand}
                  </td>
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
  const viewType = useViewType();
  return <Suspense>{viewType === "CUSTOMER" ? <MaintenanceKlantenInner /> : <KlantenInner />}</Suspense>;
}
