"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useViewType } from "@/hooks/use-view-type";
import { klantenApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Mail, Phone, Euro, FolderKanban, FileText, AlertCircle, Wrench, TrendingUp, CheckCircle2 } from "lucide-react";
import { CATEGORIE_LABELS } from "@/lib/mock/maintenance-data";
import type { MaintenanceWerkbon, WeekStats, MaandStats } from "@/lib/mock/maintenance-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Maintenance klant detail ───────────────────────────────────────────────────

interface MaintenanceKlantData {
  id: string; naam: string; variant: string; telefoon: string; email: string; adres: string; plaats: string;
  summary: {
    week:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    maand: { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    jaar:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
  };
  weekStats:  WeekStats[];
  maandStats: MaandStats[];
  werkbonnen: MaintenanceWerkbon[];
}

const STATUS_COLOR: Record<string, string> = {
  UITGEVOERD: "text-emerald-600 dark:text-emerald-400",
  OPENSTAAND: "text-orange-600 dark:text-orange-400",
  AANGEMAAKT: "text-slate-500",
};

function MaintenanceKlantDetail({ id }: { id: string }) {
  const router = useRouter();

  const { data, isLoading } = useQuery<MaintenanceKlantData>({
    queryKey: ["maintenance", "klant", id],
    queryFn: () => fetch(`/api/v1/maintenance/klanten/${id}`).then(r => {
      if (!r.ok) throw new Error("Klant niet gevonden");
      return r.json();
    }),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}</div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <p className="text-lg font-medium">Klant niet gevonden</p>
      <Button variant="outline" onClick={() => router.back()}>Terug</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div>
          <span className="inline-block text-xs font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground mb-1">{data.variant}</span>
          <h1 className="text-2xl font-bold">{data.naam}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />{data.adres} · {data.plaats}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Omzet deze week"   value={formatCurrency(data.summary.week.omzet)}  icon={TrendingUp}   color="blue"   />
        <StatCard label="Omzet deze maand"  value={formatCurrency(data.summary.maand.omzet)} icon={Euro}         color="blue"   />
        <StatCard label="Uitgevoerd (maand)" value={String(data.summary.maand.uitgevoerd)}   icon={CheckCircle2} color="green"  />
        <StatCard label="Openstaand (maand)" value={String(data.summary.maand.openstaand)}   icon={AlertCircle}  color={data.summary.maand.openstaand > 0 ? "orange" : "green"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contactgegevens</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: MapPin, label: "Adres",    value: `${data.adres}, ${data.plaats}` },
              { icon: Mail,   label: "E-mail",   value: data.email },
              { icon: Phone,  label: "Telefoon", value: data.telefoon },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Week omzet chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Omzet per week (laatste 8 weken)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.weekStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="omzet" name="Omzet" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Werkbonnen tabel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recente werkbonnen ({data.werkbonnen.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Datum</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Categorie</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Omschrijving</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Technicus</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {data.werkbonnen.map((b, i) => (
                  <tr key={b.id} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">{b.datum}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium">{CATEGORIE_LABELS[b.categorie]}</span>
                    </td>
                    <td className="px-4 py-2 max-w-[220px] truncate text-muted-foreground">{b.omschrijving}</td>
                    <td className="px-4 py-2 text-muted-foreground">{b.technicus}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-semibold ${STATUS_COLOR[b.status] ?? ""}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {b.omzet > 0 ? formatCurrency(b.omzet) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Project klant detail ───────────────────────────────────────────────────────

function ProjectKlantDetail({ id }: { id: string }) {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["klanten", id],
    queryFn: () => klantenApi.detail(id),
  });

  const k = data as Record<string, unknown> | undefined;
  const projecten = (k?.projecten as Record<string, unknown>[] | undefined) ?? [];
  const facturen  = (k?.facturen  as Record<string, unknown>[] | undefined) ?? [];
  const omzetJaar = facturen.reduce((s, f) => s + Number(f.TOTAALBEDRAG ?? 0), 0);
  const openstaand = facturen.reduce((s, f) => s + Number(f.OPENSTAAND ?? 0), 0);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}</div>
    </div>
  );

  if (!k) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <p className="text-lg font-medium">Klant niet gevonden</p>
      <Button variant="outline" onClick={() => router.back()}>Terug</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div>
          <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {String(k.KLANTNUMMER ?? "")}
          </span>
          <h1 className="text-2xl font-bold mt-1">{String(k.NAAM ?? "")}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {String(k.ADRES ?? "")} · {String(k.POSTCODE ?? "")} {String(k.PLAATS ?? "")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Omzet (huidig jaar)" value={formatCurrency(omzetJaar)}           icon={Euro}         color="blue"   />
        <StatCard label="Openstaand"           value={formatCurrency(openstaand)}          icon={AlertCircle}  color={openstaand > 0 ? "orange" : "green"} />
        <StatCard label="Projecten"            value={String(projecten.length)}            icon={FolderKanban} color="purple" />
        <StatCard label="Facturen"             value={String(facturen.length)}             icon={FileText}     color="slate"  />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Contactgegevens</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: MapPin, label: "Adres",    value: `${k.ADRES ?? ""}, ${k.POSTCODE ?? ""} ${k.PLAATS ?? ""}` },
              { icon: Mail,   label: "E-mail",   value: k.EMAIL   },
              { icon: Phone,  label: "Telefoon", value: k.TELEFOON },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{String(value ?? "—")}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Projecten ({projecten.length})</CardTitle></CardHeader>
          <CardContent>
            {projecten.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen projecten</p>
            ) : (
              <div className="space-y-2">
                {projecten.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{String(p.PROJECTNUMMER ?? "")}</p>
                      <p className="text-sm font-medium truncate">{String(p.NAAM ?? "")}</p>
                    </div>
                    <StatusBadge status={String(p.STATUS ?? "")} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recente facturen</CardTitle></CardHeader>
          <CardContent>
            {facturen.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen facturen</p>
            ) : (
              <div className="space-y-2">
                {facturen.slice(0, 8).map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{String(f.FACTUURNUMMER ?? "")}</p>
                      <p className="text-sm tabular-nums font-semibold">{formatCurrency(Number(f.TOTAALBEDRAG ?? 0))}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatDate(String(f.DATUM ?? ""))}</span>
                      <StatusBadge status={String(f.STATUS ?? "")} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const viewType = useViewType();
  return viewType === "CUSTOMER"
    ? <MaintenanceKlantDetail id={id} />
    : <ProjectKlantDetail id={id} />;
}
