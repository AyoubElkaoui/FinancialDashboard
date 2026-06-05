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
import type { KlantgroepBlok, KlantenApiResponse, StandBuckets } from "@/types/maintenance-klanten";

// ── Type A: Services klanten ──────────────────────────────────────────────────

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
      <FilterBar search={params.search} onSearchChange={v => setParams({ search: v, page: "1" })} onReset={resetParams} />
      <DataTable columns={columns} data={(data?.data ?? []) as Klant[]} loading={isLoading}
        total={data?.total} page={params.page} pageSize={params.pageSize}
        totalPages={data?.totalPages} onPageChange={p => setParams({ page: String(p) })}
        onRowClick={row => router.push(`/klanten/${String(row.ID ?? "")}`)}
        emptyMessage="Geen klanten gevonden" />
    </div>
  );
}

// ── Type B: Maintenance klanten — Excel-tabblad ───────────────────────────────

const FAMILIE_CLR: Record<string, string> = {
  Bestseller: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  'AS Watson': "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CeX:        "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};
const TECH_VOLGORDE = ['W','E','CV','B','Overig'] as const;
const TECH_LABEL: Record<string, string> = {
  W: 'Onderhoud W', E: 'Onderhoud E', CV: 'Onderhoud CV', B: 'Bouwkundig', Overig: 'Overig',
};

// Cel: kleurcodering per veld
function Td({ v, variant = "default" }: { v: number; variant?: "totaal"|"teDoen"|"loopt"|"gedaan"|"default" }) {
  const cls = v === 0
    ? "text-muted-foreground/40"
    : variant === "totaal" ? "font-bold text-foreground"
    : variant === "teDoen" ? "font-semibold text-slate-600 dark:text-slate-300"
    : variant === "loopt"  ? "font-semibold text-amber-600 dark:text-amber-400"
    : variant === "gedaan" ? "font-semibold text-emerald-600 dark:text-emerald-400"
    :                        "text-muted-foreground";
  return (
    <td className={`px-2 py-1.5 text-right tabular-nums text-xs border-l border-muted/20 ${cls}`}>
      {v || "—"}
    </td>
  );
}

function StandRij({ label, b, bJaar, bWeek, indent, bold }: {
  label: string;
  b?: StandBuckets;   // all-time (fallback)
  bJaar: StandBuckets;
  bWeek: StandBuckets;
  indent?: boolean;
  bold?: boolean;
}) {
  if (!bJaar) return null;
  const rowCls = `border-b last:border-b-0 ${bold ? "bg-muted/5" : "hover:bg-muted/10"}`;
  return (
    <tr className={rowCls}>
      <td className={`${indent ? "pl-7" : "px-3"} pr-3 py-1.5 ${bold ? "font-semibold text-foreground" : "text-muted-foreground"} truncate max-w-[180px]`}>
        {label}
      </td>
      {/* Jaar */}
      <Td v={bJaar.totaal}  variant="totaal" />
      <Td v={bJaar.te_doen} variant="teDoen" />
      <Td v={bJaar.loopt}   variant="loopt" />
      <Td v={bJaar.gedaan}  variant="gedaan" />
      {/* Week */}
      <Td v={bWeek.totaal}  variant="totaal" />
      <Td v={bWeek.te_doen} variant="teDoen" />
      <Td v={bWeek.loopt}   variant="loopt" />
      <Td v={bWeek.gedaan}  variant="gedaan" />
    </tr>
  );
}

function KlantBlok({ kg, weekLabel }: { kg: KlantgroepBlok; weekLabel: string }) {
  const totaalOmzet = kg.omzet.periodiek + kg.omzet.service;
  const heeftData   = kg.all.totaal > 0;

  return (
    <div className="border rounded-xl bg-card overflow-hidden mb-3">
      {/* Klantgroep-naam header */}
      <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between gap-4">
        <span className="font-bold text-sm">{kg.klantgroep}</span>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{kg.all.totaal} bons totaal</span>
          {totaalOmzet > 0 && <span className="font-medium text-blue-600">{formatCurrency(totaalOmzet)} omzet 2026</span>}
        </div>
      </div>

      {!heeftData ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">Geen werkbonnen in deze periode.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 700 }}>
            <thead>
              {/* Rij 1: groepkoppen */}
              <tr className="bg-muted/20 border-b">
                <th className="px-3 py-1.5 text-left text-muted-foreground/80 w-44" rowSpan={2}>Werkbonnen</th>
                <th colSpan={4} className="text-center py-1 text-[11px] font-semibold text-muted-foreground border-l border-muted/30 bg-muted/10">
                  Dit jaar (2026)
                </th>
                <th colSpan={4} className="text-center py-1 text-[11px] font-semibold text-muted-foreground border-l border-muted/40 bg-muted/20" title={weekLabel}>
                  Vorige week ↓
                </th>
              </tr>
              {/* Rij 2: sub-koppen */}
              <tr className="bg-muted/10 border-b text-[10px] text-muted-foreground">
                <th className="px-2 py-1 text-right border-l border-muted/30 font-bold">Totaal</th>
                <th className="px-2 py-1 text-right border-l border-muted/20">Nog te doen</th>
                <th className="px-2 py-1 text-right border-l border-muted/20 text-amber-600">Loopt</th>
                <th className="px-2 py-1 text-right border-l border-muted/20 text-emerald-600">Gedaan</th>
                <th className="px-2 py-1 text-right border-l border-muted/40 font-bold">Totaal</th>
                <th className="px-2 py-1 text-right border-l border-muted/20">Nog te doen</th>
                <th className="px-2 py-1 text-right border-l border-muted/20 text-amber-600">Loopt</th>
                <th className="px-2 py-1 text-right border-l border-muted/20 text-emerald-600">Gedaan</th>
              </tr>
            </thead>
            <tbody>
              {/* Totaalregel klantgroep */}
              <StandRij label="Maintenance 2026" bJaar={kg.jaar} bWeek={kg.week} bold />

              {/* Techniek-regels — alleen tonen als er data is */}
              {TECH_VOLGORDE.map(t => {
                const tp = kg.techniek[t];
                if (!tp || tp.jaar.totaal === 0) return null;
                return (
                  <StandRij key={t} label={TECH_LABEL[t]} bJaar={tp.jaar} bWeek={tp.week} indent />
                );
              })}
            </tbody>
            {/* Omzet onderaan als footer */}
            {totaalOmzet > 0 && (
              <tfoot>
                <tr className="border-t bg-blue-50/30 dark:bg-blue-950/10">
                  <td className="px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400 font-semibold">Omzet</td>
                  <td colSpan={4} className="px-2 py-1.5 text-right text-xs border-l border-muted/30">
                    <span className="text-blue-700 dark:text-blue-400 font-semibold">{formatCurrency(kg.omzet.periodiek)}</span>
                    <span className="text-muted-foreground ml-2 text-[10px]">Periodiek</span>
                    {kg.omzet.service > 0 && (
                      <><span className="text-blue-600 font-semibold ml-3">{formatCurrency(kg.omzet.service)}</span>
                      <span className="text-muted-foreground ml-1 text-[10px]">Service</span></>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs border-l border-muted/40 text-blue-600">
                    {formatCurrency(kg.omzet.week)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function MaintenanceKlantenInner() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<KlantenApiResponse>({
    queryKey: ["maintenance", "klanten-v3"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten?database=MAINTENANCE").then(r => r.json()),
    staleTime: 120_000,
  });

  const allGroepen = data?.klantgroepen ?? [];
  const periodes   = data?.periodes ?? { weekStart: "", weekEind: "", start: "" };
  const weekLabel  = periodes.weekStart
    ? `Vorige week: ${periodes.weekStart} t/m ${periodes.weekEind}`
    : "Vorige week";

  const filtered = search
    ? allGroepen.filter(kg =>
        kg.klantgroep.toLowerCase().includes(search.toLowerCase()) ||
        kg.locaties.some(l => l.klant.toLowerCase().includes(search.toLowerCase()))
      )
    : allGroepen;

  const FAM_VOLGORDE = ['Bestseller','AS Watson','CeX', null];
  const famMap = new Map<string | null, KlantgroepBlok[]>();
  for (const kg of filtered) {
    if (!famMap.has(kg.familie)) famMap.set(kg.familie, []);
    famMap.get(kg.familie)!.push(kg);
  }

  const totaalBons  = allGroepen.reduce((s, kg) => s + kg.all.totaal, 0);
  const totaalOmzet = allGroepen.reduce((s, kg) => s + kg.omzet.periodiek + kg.omzet.service, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {allGroepen.length} klantgroepen · {totaalBons} werkbonnen · {formatCurrency(totaalOmzet)} omzet 2026
            </p>
          )}
          <p suppressHydrationWarning className="text-[11px] text-muted-foreground/60">
            Vanaf {periodes.start} · {weekLabel}
          </p>
        </div>
        <input
          type="search" placeholder="Zoek klantgroep…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : FAM_VOLGORDE.map(fam => {
        const groepen = famMap.get(fam) ?? [];
        if (groepen.length === 0) return null;
        const famTot = groepen.reduce((s, kg) => s + kg.all.totaal, 0);
        const famOmz = groepen.reduce((s, kg) => s + kg.omzet.periodiek + kg.omzet.service, 0);
        return (
          <div key={fam ?? "overig"}>
            {fam && (
              <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${FAMILIE_CLR[fam] ?? ""}`}>{fam}</span>
                <span className="text-xs text-muted-foreground">{famTot} bons · {formatCurrency(famOmz)}</span>
                <div className="flex-1 border-t border-muted/30" />
              </div>
            )}
            {groepen.map(kg => <KlantBlok key={kg.klantgroep} kg={kg} weekLabel={weekLabel} />)}
          </div>
        );
      })}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function KlantenPage() {
  const viewType = useViewTypeSafe();
  return <Suspense>{viewType === "CUSTOMER" ? <MaintenanceKlantenInner /> : <KlantenInner />}</Suspense>;
}
