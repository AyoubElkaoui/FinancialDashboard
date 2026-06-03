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

// ── Type B: Maintenance klanten op klantgroep-niveau ─────────────────────────

interface Buckets { open: number; uitg: number; totaal: number; }
interface LocatieRow { klant: string; werkCode: string; all: Buckets; week: Buckets; maand: Buckets; jaar: Buckets; }
interface KlantgroepRow { klantgroep: string; familie: string | null; all: Buckets; week: Buckets; maand: Buckets; jaar: Buckets; locaties: LocatieRow[]; }
interface KlantenResponse { klantgroepen: KlantgroepRow[] }

const FAMILIE_KLEUREN: Record<string, string> = {
  Bestseller: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  'AS Watson': "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CeX:        "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

function BucketCell({ b, field }: { b: Buckets; field: "open" | "uitg" | "totaal" }) {
  const v = b[field];
  const cls = v === 0 ? "text-muted-foreground"
    : field === "open"  ? "text-orange-600 dark:text-orange-400 font-semibold"
    : field === "uitg"  ? "text-emerald-600 dark:text-emerald-400"
    :                     "font-semibold";
  return <td className={`px-3 py-2 text-right tabular-nums text-xs ${cls}`}>{v || "—"}</td>;
}

function MaintenanceKlantenInner() {
  const [search, setSearch]   = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<KlantenResponse>({
    queryKey: ["maintenance", "klanten-groepen"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten?database=MAINTENANCE").then(r => r.json()),
    staleTime: 120_000,
  });

  const allGroepen = data?.klantgroepen ?? [];
  const klantgroepen = search
    ? allGroepen.filter(kg =>
        kg.klantgroep.toLowerCase().includes(search.toLowerCase()) ||
        kg.locaties.some(l => l.klant.toLowerCase().includes(search.toLowerCase()))
      )
    : allGroepen;

  const toggle = (key: string) =>
    setExpanded(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Groepeer klantgroepen per familie
  const familieGroepen = new Map<string | null, KlantgroepRow[]>();
  for (const kg of klantgroepen) {
    const f = kg.familie;
    if (!familieGroepen.has(f)) familieGroepen.set(f, []);
    familieGroepen.get(f)!.push(kg);
  }
  const FAMILIE_VOLGORDE = ['Bestseller', 'AS Watson', 'CeX', null];

  const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );

  const totaal400 = allGroepen.reduce((s, kg) => s + kg.all.totaal, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Laden…" : `${allGroepen.length} klantgroepen · ${totaal400.toLocaleString("nl-NL")} werkbonnen (400-contracten)`}
          </p>
        </div>
        <input
          type="search" placeholder="Zoek klantgroep of locatie…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-72 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <Th>Klantgroep</Th>
                <Th right>Wk O</Th><Th right>Wk U</Th>
                <Th right>Md O</Th><Th right>Md U</Th>
                <Th right>Jaar U</Th><Th right>Jaar O</Th>
                <Th right>Totaal</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Laden…</td></tr>
              ) : klantgroepen.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Geen klantgroepen gevonden</td></tr>
              ) : FAMILIE_VOLGORDE.flatMap(fam => {
                const groepen = familieGroepen.get(fam) ?? [];
                if (groepen.length === 0) return [];
                const rows = [];

                // Familie-header (alleen als er een naam is)
                if (fam) {
                  rows.push(
                    <tr key={`fam-${fam}`} className="bg-muted/20 border-b">
                      <td colSpan={9} className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${FAMILIE_KLEUREN[fam] ?? ""}`}>
                          {fam}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {groepen.reduce((s, g) => s + g.all.totaal, 0).toLocaleString("nl-NL")} werkbonnen · {groepen.length} groepen
                        </span>
                      </td>
                    </tr>
                  );
                }

                // Klantgroepen binnen deze familie
                for (const kg of groepen) {
                  const isOpen = expanded.has(kg.klantgroep);
                  rows.push(
                    <tr key={kg.klantgroep} className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggle(kg.klantgroep)}>
                      <td className="px-3 py-2.5 font-semibold text-sm flex items-center gap-2">
                        <span className={`text-muted-foreground text-[10px] transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                        {kg.klantgroep}
                      </td>
                      <BucketCell b={kg.week}  field="open" />
                      <BucketCell b={kg.week}  field="uitg" />
                      <BucketCell b={kg.maand} field="open" />
                      <BucketCell b={kg.maand} field="uitg" />
                      <BucketCell b={kg.jaar}  field="uitg" />
                      <BucketCell b={kg.jaar}  field="open" />
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-bold">{kg.all.totaal.toLocaleString("nl-NL")}</td>
                      <td />
                    </tr>
                  );

                  // Expandable locaties
                  if (isOpen) {
                    const filteredLocs = search
                      ? kg.locaties.filter(l => l.klant.toLowerCase().includes(search.toLowerCase()))
                      : kg.locaties;
                    for (const loc of filteredLocs) {
                      rows.push(
                        <tr key={`${kg.klantgroep}-${loc.werkCode}-${loc.klant}`}
                            className="border-b border-dashed bg-muted/5 hover:bg-muted/10">
                          <td className="pl-10 pr-3 py-1.5 text-xs text-muted-foreground max-w-[260px] truncate" title={loc.klant}>
                            <span className="font-mono text-[10px] bg-muted px-1 rounded mr-1.5">{loc.werkCode}</span>
                            {loc.klant || "Onbekend"}
                          </td>
                          <BucketCell b={loc.week}  field="open" />
                          <BucketCell b={loc.week}  field="uitg" />
                          <BucketCell b={loc.maand} field="open" />
                          <BucketCell b={loc.maand} field="uitg" />
                          <BucketCell b={loc.jaar}  field="uitg" />
                          <BucketCell b={loc.jaar}  field="open" />
                          <td className="px-3 py-1.5 text-right tabular-nums text-xs text-muted-foreground">{loc.all.totaal}</td>
                          <td />
                        </tr>
                      );
                    }
                  }
                }
                return rows;
              })}
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
