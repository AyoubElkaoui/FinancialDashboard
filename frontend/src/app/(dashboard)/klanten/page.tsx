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

// ── Type B: Maintenance klanten — Excel-tab stijl per klantgroep ─────────────

interface ExBuckets {
  aangemaakt: number; openstaand: number; uitgevoerd: number; totaal: number;
}
interface ExTechniek { W: ExBuckets; E: ExBuckets; CV: ExBuckets; B: ExBuckets; Overig: ExBuckets; }
interface ExLocatie   { klant: string; werkCode: string; all: ExBuckets; }
interface ExKlantgroep {
  klantgroep: string; familie: string | null;
  all: ExBuckets; week: ExBuckets; jaar: ExBuckets;
  techniek: ExTechniek;
  omzet: { periodiek: number; service: number; week: number };
  locaties: ExLocatie[];
}
interface ExResponse { klantgroepen: ExKlantgroep[]; periodes: Record<string, string> }

const FAMILIE_CLR: Record<string, string> = {
  Bestseller: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  'AS Watson': "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CeX:        "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};
const TECH_KEYS = ['W','E','CV','B','Overig'] as const;
const TECH_LABEL: Record<string, string> = { W:'W-inst.',E:'Electra',CV:'CV',B:'Bouwk.',Overig:'Overig' };

function Num({ v, orange, green, grey }: { v: number; orange?: boolean; green?: boolean; grey?: boolean }) {
  const cls = v === 0 ? "text-muted-foreground/50"
    : orange ? "text-orange-600 dark:text-orange-400 font-semibold"
    : green  ? "text-emerald-600 dark:text-emerald-400"
    : grey   ? "text-muted-foreground"
    :          "";
  return <span className={`tabular-nums text-xs ${cls}`}>{v || "—"}</span>;
}

function MaintenanceKlantenInner() {
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTech, setShowTech] = useState(false);

  const { data, isLoading } = useQuery<ExResponse>({
    queryKey: ["maintenance", "klanten-excel"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten?database=MAINTENANCE").then(r => r.json()),
    staleTime: 120_000,
  });

  const allGroepen  = data?.klantgroepen ?? [];
  const periodes    = data?.periodes ?? {};
  const klantgroepen = search
    ? allGroepen.filter(kg =>
        kg.klantgroep.toLowerCase().includes(search.toLowerCase()) ||
        kg.locaties.some(l => l.klant.toLowerCase().includes(search.toLowerCase()))
      )
    : allGroepen;

  const toggle = (key: string) =>
    setExpanded(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Familie-groepering
  const famMap = new Map<string | null, ExKlantgroep[]>();
  for (const kg of klantgroepen) {
    if (!famMap.has(kg.familie)) famMap.set(kg.familie, []);
    famMap.get(kg.familie)!.push(kg);
  }
  const FAM_VOLGORDE = ['Bestseller','AS Watson','CeX', null];

  const tot400 = allGroepen.reduce((s, kg) => s + kg.all.totaal, 0);
  const totOmzet = allGroepen.reduce((s, kg) => s + kg.omzet.periodiek + kg.omzet.service, 0);

  const Th = ({ ch, right, grey }: { ch: string; right?: boolean; grey?: boolean }) => (
    <th className={`px-2 py-2 text-[10px] font-semibold whitespace-nowrap border-l border-muted/30 ${right?"text-right":"text-left"} ${grey?"text-muted-foreground/60":"text-muted-foreground"}`}>
      {ch}
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klanten</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Laden…" : `${allGroepen.length} klantgroepen · ${tot400} bons · ${formatCurrency(totOmzet)} omzet YTD`}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            vWk = vorige week ({periodes.weekStart}–{periodes.weekEind}) · Jaar = YTD vanaf {periodes.start}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTech(v => !v)}
            className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${showTech ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            Techniek
          </button>
          <input
            type="search" placeholder="Zoek klantgroep of locatie…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-60 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Excel-stijl tabel */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: showTech ? 960 : 680 }}>
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-44">Klantgroep</th>
                {/* Jaar-kolommen */}
                <Th ch="Jaar A" right grey />
                <Th ch="Jaar U" right />
                <Th ch="Jaar O" right grey />
                {/* Week-kolommen */}
                <Th ch="vWk A" right grey />
                <Th ch="vWk U" right />
                <Th ch="vWk O" right grey />
                {/* Techniek (optioneel) */}
                {showTech && TECH_KEYS.map(t => <Th key={t} ch={TECH_LABEL[t]} right grey />)}
                {/* Omzet */}
                <Th ch="Periodiek" right />
                <Th ch="Service" right />
                <Th ch="vWk omzet" right grey />
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={20} className="py-10 text-center text-muted-foreground">Laden…</td></tr>
              ) : klantgroepen.length === 0 ? (
                <tr><td colSpan={20} className="py-10 text-center text-muted-foreground">Geen resultaten</td></tr>
              ) : FAM_VOLGORDE.flatMap(fam => {
                const groepen = famMap.get(fam) ?? [];
                if (groepen.length === 0) return [];
                const rows = [];

                // Familie-header
                if (fam) {
                  const famTot = groepen.reduce((s, g) => s + g.all.totaal, 0);
                  const famOmz = groepen.reduce((s, g) => s + g.omzet.periodiek + g.omzet.service, 0);
                  rows.push(
                    <tr key={`fam-${fam}`} className="bg-muted/20 border-b">
                      <td colSpan={20} className="px-3 py-1.5 flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${FAMILIE_CLR[fam] ?? ""}`}>{fam}</span>
                        <span className="text-[11px] text-muted-foreground">{famTot} bons · {formatCurrency(famOmz)}</span>
                      </td>
                    </tr>
                  );
                }

                for (const kg of groepen) {
                  const isOpen = expanded.has(kg.klantgroep);
                  rows.push(
                    <tr key={kg.klantgroep}
                        className={`border-b cursor-pointer hover:bg-muted/20 ${isOpen ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                        onClick={() => toggle(kg.klantgroep)}>
                      <td className="px-3 py-2 font-semibold flex items-center gap-1.5">
                        <span className={`text-muted-foreground text-[9px] ${isOpen ? "rotate-90 inline-block" : ""}`}>▶</span>
                        <span className="truncate max-w-[160px]" title={kg.klantgroep}>{kg.klantgroep}</span>
                      </td>
                      {/* Jaar */}
                      <td className="px-2 py-2 text-right border-l border-muted/20"><Num v={kg.jaar.aangemaakt} grey /></td>
                      <td className="px-2 py-2 text-right border-l border-muted/20"><Num v={kg.jaar.uitgevoerd} green /></td>
                      <td className="px-2 py-2 text-right border-l border-muted/20"><Num v={kg.jaar.openstaand} orange /></td>
                      {/* Week */}
                      <td className="px-2 py-2 text-right border-l border-muted/30"><Num v={kg.week.aangemaakt} grey /></td>
                      <td className="px-2 py-2 text-right border-l border-muted/20"><Num v={kg.week.uitgevoerd} green /></td>
                      <td className="px-2 py-2 text-right border-l border-muted/20"><Num v={kg.week.openstaand} orange /></td>
                      {/* Techniek */}
                      {showTech && TECH_KEYS.map(t => (
                        <td key={t} className="px-2 py-2 text-right border-l border-muted/20 text-muted-foreground">
                          {kg.techniek[t]?.totaal || "—"}
                        </td>
                      ))}
                      {/* Omzet */}
                      <td className="px-2 py-2 text-right border-l border-muted/30 font-medium">{formatCurrency(kg.omzet.periodiek)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(kg.omzet.service)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{formatCurrency(kg.omzet.week)}</td>
                      <td />
                    </tr>
                  );

                  // Uitklapbaar: locaties
                  if (isOpen) {
                    const locs = search
                      ? kg.locaties.filter(l => l.klant.toLowerCase().includes(search.toLowerCase()))
                      : kg.locaties;
                    for (const loc of locs) {
                      rows.push(
                        <tr key={`${kg.klantgroep}-${loc.werkCode}-${loc.klant}`}
                            className="border-b border-dashed bg-muted/5">
                          <td className="pl-8 pr-2 py-1.5 text-muted-foreground truncate max-w-[200px]" title={loc.klant}>
                            <span className="font-mono text-[9px] bg-muted px-1 rounded mr-1">{loc.werkCode}</span>
                            {loc.klant || "Onbekend"}
                          </td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground/70">{loc.all.aangemaakt || "—"}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground/70">{loc.all.uitgevoerd || "—"}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground/70">{loc.all.openstaand || "—"}</td>
                          <td colSpan={showTech ? 4 + TECH_KEYS.length : 4} />
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
