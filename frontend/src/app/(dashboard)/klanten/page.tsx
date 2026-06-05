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
import type { KlantgroepBlok, KlantenApiResponse } from "@/app/api/v1/maintenance/klanten/route";

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
      <FilterBar search={params.search} onSearchChange={(v) => setParams({ search: v, page: "1" })} onReset={resetParams} />
      <DataTable
        columns={columns} data={(data?.data ?? []) as Klant[]} loading={isLoading}
        total={data?.total} page={params.page} pageSize={params.pageSize}
        totalPages={data?.totalPages} onPageChange={(p) => setParams({ page: String(p) })}
        onRowClick={(row) => router.push(`/klanten/${String(row.ID ?? "")}`)}
        emptyMessage="Geen klanten gevonden"
      />
    </div>
  );
}

// ── Type B: Maintenance klanten — Excel-tabblad-stijl ─────────────────────────

const FAMILIE_CLR: Record<string, string> = {
  Bestseller: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  'AS Watson': "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CeX:        "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};
const TECH_VOLGORDE = ['W','E','CV','B','Overig'] as const;
const TECH_LABEL: Record<string, string> = {
  W: 'Onderhoud W', E: 'Onderhoud E', CV: 'Onderhoud CV', B: 'Bouwkundig', Overig: 'Overig',
};

function Cel({ v, orange, green }: { v: number; orange?: boolean; green?: boolean }) {
  const cls = v === 0 ? "text-muted-foreground/40"
    : orange ? "text-orange-600 dark:text-orange-400 font-semibold"
    : green  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
    :          "font-semibold text-foreground";
  return <td className={`px-2 py-1.5 text-right tabular-nums text-xs border-l border-muted/20 ${cls}`}>{v || "—"}</td>;
}

function KlantBlok({ kg, weekLabel }: { kg: KlantgroepBlok; weekLabel: string }) {
  const totaalOmzet = kg.omzet.periodiek + kg.omzet.service;

  return (
    <div className="border rounded-xl bg-card overflow-hidden mb-3">
      {/* Klantgroep-naam header */}
      <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between">
        <span className="font-bold text-sm">{kg.klantgroep}</span>
        <span className="text-xs text-muted-foreground">{kg.all.totaal} bons · {formatCurrency(totaalOmzet)}</span>
      </div>
      <table className="w-full text-xs">
        {/* Twee-rij kolomkoppen: status / Jaar + Week */}
        <thead>
          <tr className="bg-muted/20 border-b">
            <th className="px-3 py-1.5 text-left text-muted-foreground w-36" rowSpan={2}>Werkbonnen</th>
            <th colSpan={2} className="px-2 py-1 text-center font-semibold text-orange-700 dark:text-orange-400 border-l border-muted/30 bg-orange-50/30 dark:bg-orange-950/10">
              Aangemaakt
            </th>
            <th colSpan={2} className="px-2 py-1 text-center font-semibold text-emerald-700 dark:text-emerald-400 border-l border-muted/30 bg-emerald-50/30 dark:bg-emerald-950/10">
              Uitgevoerd
            </th>
            <th colSpan={2} className="px-2 py-1 text-center font-semibold text-slate-600 dark:text-slate-400 border-l border-muted/30">
              Openstaand
            </th>
            <th colSpan={2} className="px-2 py-1 text-center font-semibold text-blue-700 dark:text-blue-400 border-l border-muted/30 bg-blue-50/30 dark:bg-blue-950/10">
              Omzet 2026
            </th>
          </tr>
          <tr className="bg-muted/10 border-b text-[10px] text-muted-foreground">
            <th className="px-2 py-1 text-right border-l border-muted/20">Dit jaar</th>
            <th className="px-2 py-1 text-right border-l border-muted/20" title={weekLabel}>Week</th>
            <th className="px-2 py-1 text-right border-l border-muted/20">Dit jaar</th>
            <th className="px-2 py-1 text-right border-l border-muted/20" title={weekLabel}>Week</th>
            <th className="px-2 py-1 text-right border-l border-muted/20">Dit jaar</th>
            <th className="px-2 py-1 text-right border-l border-muted/20" title={weekLabel}>Week</th>
            <th className="px-2 py-1 text-right border-l border-muted/30 text-blue-600">Periodiek</th>
            <th className="px-2 py-1 text-right border-l border-muted/20 text-blue-500">Service</th>
          </tr>
        </thead>
        <tbody>
          {/* Totaalregel */}
          <tr className="border-b bg-muted/5 font-medium">
            <td className="px-3 py-1.5 font-semibold text-foreground">Totaal Maintenance</td>
            <Cel v={kg.jaar.aangemaakt} orange />
            <Cel v={kg.week.aangemaakt} orange />
            <Cel v={kg.jaar.uitgevoerd} green />
            <Cel v={kg.week.uitgevoerd} green />
            <Cel v={kg.jaar.openstaand} />
            <Cel v={kg.week.openstaand} />
            <td className="px-2 py-1.5 text-right tabular-nums text-xs border-l border-muted/30 font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(kg.omzet.periodiek)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-xs border-l border-muted/20 font-semibold text-blue-600 dark:text-blue-300">
              {formatCurrency(kg.omzet.service)}
            </td>
          </tr>
          {/* Techniek-regels */}
          {TECH_VOLGORDE.map(t => {
            const tp = kg.techniek[t];
            if (!tp || tp.all.totaal === 0) return null;
            return (
              <tr key={t} className="border-b last:border-b-0 hover:bg-muted/10">
                <td className="pl-6 pr-3 py-1.5 text-muted-foreground">{TECH_LABEL[t]}</td>
                <Cel v={tp.jaar.aangemaakt} orange />
                <Cel v={tp.week.aangemaakt} orange />
                <Cel v={tp.jaar.uitgevoerd} green />
                <Cel v={tp.week.uitgevoerd} green />
                <Cel v={tp.jaar.openstaand} />
                <Cel v={tp.week.openstaand} />
                <td colSpan={2} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceKlantenInner() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<KlantenApiResponse>({
    queryKey: ["maintenance", "klanten-excel-v2"],
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

  // Groepeer per familie
  const FAM_VOLGORDE = ['Bestseller','AS Watson','CeX', null];
  const famMap = new Map<string | null, KlantgroepBlok[]>();
  for (const kg of filtered) {
    if (!famMap.has(kg.familie)) famMap.set(kg.familie, []);
    famMap.get(kg.familie)!.push(kg);
  }

  const totaalBons  = allGroepen.reduce((s, kg) => s + kg.all.totaal, 0);
  const totaalOmzet = allGroepen.reduce((s, kg) => s + kg.omzet.periodiek + kg.omzet.service, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
          <p className="text-sm text-muted-foreground">
            {allGroepen.length} klantgroepen · {totaalBons} werkbonnen · {formatCurrency(totaalOmzet)} omzet 2026
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Vanaf {periodes.start} · {weekLabel}
          </p>
        </div>
        <input
          type="search" placeholder="Zoek klantgroep…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {FAM_VOLGORDE.map(fam => {
        const groepen = famMap.get(fam) ?? [];
        if (groepen.length === 0) return null;
        return (
          <div key={fam ?? "overig"}>
            {fam && (
              <div className="flex items-center gap-3 mb-2 mt-4">
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${FAMILIE_CLR[fam] ?? ""}`}>
                  {fam}
                </span>
                <span className="text-xs text-muted-foreground">
                  {groepen.reduce((s, kg) => s + kg.all.totaal, 0)} bons ·{" "}
                  {formatCurrency(groepen.reduce((s, kg) => s + kg.omzet.periodiek + kg.omzet.service, 0))}
                </span>
                <div className="flex-1 border-t border-muted/30" />
              </div>
            )}
            {groepen.map(kg => (
              <KlantBlok key={kg.klantgroep} kg={kg} weekLabel={weekLabel} />
            ))}
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
