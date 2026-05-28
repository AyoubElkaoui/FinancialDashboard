"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatCurrency, formatPercentage } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Euro, TrendingUp, CheckCircle2, Calculator,
  Pencil, RotateCcw, Save, Loader2, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { ElmarRapport } from "@/lib/mock/elmar-data";

// ─── DB badge ────────────────────────────────────────────────────────────────

const DB_COLORS: Record<string, string> = {
  SERVICES:      "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",
  MAINTENANCE:   "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30",
  INTERNATIONAL: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  KEYSER:        "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30",
};

function DbBadge({ db }: { db: string }) {
  const cls = DB_COLORS[db] ?? "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/30";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {db}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function Row({
  label, value, bold, green, orange,
}: {
  label: string; value: string | React.ReactNode;
  bold?: boolean; green?: boolean; orange?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? "font-semibold" : ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-bold text-foreground" : ""} ${green ? "text-emerald-600 dark:text-emerald-400" : ""} ${orange ? "text-orange-600 dark:text-orange-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() { return <div className="border-t my-2" />; }

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-3 text-sm ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

// ─── Rapport type with override fields ───────────────────────────────────────

type Rapport = ElmarRapport & {
  hasOverrides?: boolean;
  overriddenBy?: string;
  overriddenAt?: string;
};

// ─── Edit panel ──────────────────────────────────────────────────────────────

function BerekenenPanel({
  rapport, projectId, database,
}: { rapport: Rapport; projectId: string; database: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uren, setUren]       = useState(String(rapport.UREN_AANTAL));
  const [tarief, setTarief]   = useState(String(rapport.UREN_TARIEF));
  const [algPct, setAlgPct]   = useState(String(rapport.ALG_KOSTEN_PCT));
  const [opmerking, setOpmerking] = useState(rapport.OPMERKINGEN ?? "");

  useEffect(() => {
    setUren(String(rapport.UREN_AANTAL));
    setTarief(String(rapport.UREN_TARIEF));
    setAlgPct(String(rapport.ALG_KOSTEN_PCT));
    setOpmerking(rapport.OPMERKINGEN ?? "");
  }, [rapport]);

  const saveUrl = `/api/v1/projecten/${projectId}/inputs?database=${database}&projectCode=${encodeURIComponent(rapport.PROJECTNUMMER)}`;

  const save = useMutation({
    mutationFn: () =>
      fetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          urenAantal:   Number(uren)   || undefined,
          urenTarief:   Number(tarief) || undefined,
          algKostenPct: Number(algPct) || undefined,
          opmerkingen:  opmerking || undefined,
        }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      toast.success("Berekeningen opgeslagen");
      qc.invalidateQueries({ queryKey: ["project-rapport", projectId] });
      setOpen(false);
    },
    onError: () => toast.error("Opslaan mislukt"),
  });

  const reset = useMutation({
    mutationFn: () =>
      fetch(saveUrl, { method: "DELETE", credentials: "same-origin" }),
    onSuccess: () => {
      toast.success("Berekeningen teruggezet naar standaard");
      qc.invalidateQueries({ queryKey: ["project-rapport", projectId] });
      setOpen(false);
    },
    onError: () => toast.error("Reset mislukt"),
  });

  // Live preview of recomputed values
  const previewIndir = (Number(uren) || 0) * (Number(tarief) || 0);
  const previewAlg   = Math.round(rapport.DIRECTE_KOSTEN * (Number(algPct) || 0) / 100 * 100) / 100;
  const previewTotaal = rapport.DIRECTE_KOSTEN + previewIndir + previewAlg;
  const previewMarge  = Math.round((rapport.GEFACTUREERD_TOTAAL - previewTotaal) * 100) / 100;
  const previewMargeP = rapport.GEFACTUREERD_TOTAAL > 0
    ? Math.round(previewMarge / rapport.GEFACTUREERD_TOTAAL * 10000) / 100 : 0;

  return (
    <Card className={rapport.hasOverrides ? "border-blue-500/40 ring-1 ring-blue-500/20" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>
              <SectionTitle>Berekeningen aanpassen</SectionTitle>
            </CardTitle>
            {rapport.hasOverrides && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30 px-2 py-0.5 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3" />
                Aangepast door {rapport.overriddenBy?.split("@")[0]}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {rapport.hasOverrides && (
              <Button variant="outline" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                {reset.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Reset</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {open ? "Sluiten" : "Bewerken"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Current values summary */}
        <div className="text-sm space-y-1 mb-4">
          <Row label="Uren aantal" value={`${rapport.UREN_AANTAL} uur`} />
          <Row label="Uren tarief" value={formatCurrency(rapport.UREN_TARIEF) + " / uur"} />
          <Row label={`Alg. kosten (${rapport.ALG_KOSTEN_PCT}%)`} value={formatCurrency(rapport.ALG_KOSTEN)} />
          <Divider />
          <Row label="Indirecte kosten" value={formatCurrency(rapport.INDIRECTE_KOSTEN)} />
          <Row label="Totale kosten" value={formatCurrency(rapport.TOTALE_KOSTEN)} bold />
          <Row label="Brutomarge" value={formatCurrency(rapport.BRUTOMARGE)} bold green={rapport.BRUTOMARGE >= 0} orange={rapport.BRUTOMARGE < 0} />
          <Row label="Marge %" value={formatPercentage(rapport.MARGE_PCT)} green={rapport.MARGE_PCT >= 0} orange={rapport.MARGE_PCT < 0} />
        </div>

        {/* Edit form */}
        {open && (
          <div className="border-t pt-4 space-y-5">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                Aanpassingen worden opgeslagen in de database en overschrijven de standaard Syntess-waarden. De live preview hieronder toont de impact voordat u opslaat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="uren" className="text-xs font-medium">Uren aantal</Label>
                <Input id="uren" type="number" min="0" step="1" value={uren} onChange={(e) => setUren(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarief" className="text-xs font-medium">Uren tarief (€ / uur)</Label>
                <Input id="tarief" type="number" min="0" step="0.5" value={tarief} onChange={(e) => setTarief(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alg" className="text-xs font-medium">Alg. kosten (%)</Label>
                <Input id="alg" type="number" min="0" max="100" step="0.1" value={algPct} onChange={(e) => setAlgPct(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opmerking" className="text-xs font-medium">Interne opmerkingen</Label>
              <textarea
                id="opmerking"
                rows={3}
                value={opmerking}
                onChange={(e) => setOpmerking(e.target.value)}
                placeholder="Toelichting bij aanpassingen..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Live preview */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Live preview (na opslaan)</p>
              <Row label="Indirecte kosten" value={formatCurrency(previewIndir)} />
              <Row label="Alg. kosten" value={formatCurrency(previewAlg)} />
              <Row label="Totale kosten" value={formatCurrency(previewTotaal)} bold />
              <Row label="Brutomarge" value={formatCurrency(previewMarge)} bold green={previewMarge >= 0} orange={previewMarge < 0} />
              <Row label="Marge %" value={formatPercentage(previewMargeP)} green={previewMargeP >= 0} orange={previewMargeP < 0} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white">
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Opslaan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectRapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeDb, setActiveDb] = useState<string>("SERVICES");

  useEffect(() => {
    const qDb = searchParams.get("database");
    if (qDb) { setActiveDb(qDb); return; }
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored) setActiveDb(stored);
    } catch {}
  }, [searchParams]);

  const { data: rapport, isLoading, isError } = useQuery<Rapport>({
    queryKey: ["project-rapport", id, activeDb],
    queryFn: () =>
      fetch(`/api/v1/projecten/${id}/rapport?database=${activeDb}`).then((r) => {
        if (!r.ok) throw new Error("Project niet gevonden");
        return r.json() as Promise<Rapport>;
      }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (isError || !rapport) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <p className="text-lg font-medium">Project niet gevonden</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
      </div>
    );
  }

  const r = rapport;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">{r.PROJECTNUMMER}</span>
            <StatusBadge status={r.STATUS} />
            <DbBadge db={r.DATABASE} />
            {r.hasOverrides && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 px-2 py-0.5 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3" /> Aangepaste berekening
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mt-1 leading-tight">{r.NAAM}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {r.KLANT}{r.PROJECTLEIDER ? ` · Projectleider: ${r.PROJECTLEIDER}` : ""}
          </p>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Aanneemsom + Meerwerk" value={formatCurrency(r.TOTAAL_AANNEEMSOM)} sub={`incl. ${formatCurrency(r.MEERWERK)} meerwerk`} icon={Euro} color="blue" />
        <StatCard label="Brutomarge" value={formatCurrency(r.BRUTOMARGE)} sub={`${formatPercentage(r.MARGE_PCT)} van gefactureerd`} icon={TrendingUp} color={r.BRUTOMARGE >= 0 ? "green" : "red"} />
        <StatCard label="% Betaald" value={formatPercentage(r.PCT_BETAALD)} sub={`${formatCurrency(r.BETAALD_TOTAAL)} van ${formatCurrency(r.GEFACTUREERD_TOTAAL)}`} icon={CheckCircle2} color={r.PCT_BETAALD >= 90 ? "green" : r.PCT_BETAALD >= 50 ? "orange" : "red"} />
        <StatCard label="Totale Kosten" value={formatCurrency(r.TOTALE_KOSTEN)} sub="direct + indirect + alg." icon={Calculator} color="slate" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Projectinformatie */}
        <Card>
          <CardHeader><CardTitle><SectionTitle>Projectinformatie</SectionTitle></CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Projectnummer" value={r.PROJECTNUMMER} />
            <Row label="Naam" value={r.NAAM} />
            <Row label="Klant" value={r.KLANT} />
            <Row label="Projectleider" value={r.PROJECTLEIDER} />
            <Row label="Status" value={<StatusBadge status={r.STATUS} />} />
            <Row label="Startdatum" value={formatDate(r.STARTDATUM)} />
            <Row label="Einddatum" value={r.EINDDATUM ? formatDate(r.EINDDATUM) : "—"} />
            <Row label="Database" value={<DbBadge db={r.DATABASE} />} />
            {r.OPMERKINGEN && (
              <>
                <Divider />
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Opmerkingen</p>
                  <p className="text-sm text-foreground leading-relaxed">{r.OPMERKINGEN}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Kosten */}
        <Card>
          <CardHeader><CardTitle><SectionTitle>Kosten</SectionTitle></CardTitle></CardHeader>
          <CardContent className="text-sm">
            <Row label="Directe kosten" value={formatCurrency(r.DIRECTE_KOSTEN)} />
            <Row label={`Indirecte kosten (${r.UREN_AANTAL} uur × €${r.UREN_TARIEF}/uur)`} value={formatCurrency(r.INDIRECTE_KOSTEN)} />
            <Row label={`Algemene kosten (${r.ALG_KOSTEN_PCT}% van directe kosten)`} value={formatCurrency(r.ALG_KOSTEN)} />
            <Divider />
            <Row label="Totale kosten" value={formatCurrency(r.TOTALE_KOSTEN)} bold />
            <Divider />
            <Row label="Brutomarge" value={formatCurrency(r.BRUTOMARGE)} bold green={r.BRUTOMARGE >= 0} orange={r.BRUTOMARGE < 0} />
            <Row label="Marge %" value={formatPercentage(r.MARGE_PCT)} green={r.MARGE_PCT >= 0} orange={r.MARGE_PCT < 0} />
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Opbrengsten */}
      <Card>
        <CardHeader><CardTitle><SectionTitle>Opbrengsten</SectionTitle></CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label="Aanneemsom" value={formatCurrency(r.AANNEEMSOM)} />
          <Row label="Meerwerk" value={formatCurrency(r.MEERWERK)} />
          <Row label="Totaal aanneemsom" value={formatCurrency(r.TOTAAL_AANNEEMSOM)} bold />
          <Divider />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1 pb-2">Termijnplan</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <Th>NR</Th><Th>Omschrijving</Th><Th right>Bedrag</Th><Th>Status</Th><Th>Verwacht</Th>
                </tr>
              </thead>
              <tbody>
                {r.TERMIJNEN.map((t) => (
                  <tr key={t.NR} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <Td className="text-muted-foreground">{t.NR}</Td>
                    <Td>{t.OMSCHRIJVING}</Td>
                    <Td right>{formatCurrency(t.BEDRAG)}</Td>
                    <Td>
                      {t.NOG_TE_VERSTUREN
                        ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30">Te versturen</span>
                        : <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30">Verstuurd</span>
                      }
                    </Td>
                    <Td className="text-muted-foreground">{t.DATUM_VERWACHT ? formatDate(t.DATUM_VERWACHT) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Divider />
          <Row label="Totaal gefactureerd" value={formatCurrency(r.GEFACTUREERD_TOTAAL)} />
          <Row label="Totaal betaald" value={formatCurrency(r.BETAALD_TOTAAL)} green />
          <Row label="Onbetaald" value={formatCurrency(r.ONBETAALD_TOTAAL)} bold orange={r.ONBETAALD_TOTAAL > 0} />
          <Row label="% betaald" value={formatPercentage(r.PCT_BETAALD)} />
        </CardContent>
      </Card>

      {/* Section 4: Facturen */}
      <Card>
        <CardHeader><CardTitle><SectionTitle>Facturen</SectionTitle></CardTitle></CardHeader>
        <CardContent className="p-0">
          {r.FACTUREN.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">Geen facturen gekoppeld</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <Th>Factuurnummer</Th><Th>Datum</Th><Th right>Bedrag excl.</Th>
                    <Th right>Betaald</Th><Th right>Openstaand</Th><Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.FACTUREN.map((f) => {
                    const open = Math.round((f.BEDRAG_EXCL - f.BETAALD_BEDRAG) * 100) / 100;
                    return (
                      <tr key={f.FACTUURNUMMER} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <Td className="font-mono text-xs text-muted-foreground">{f.FACTUURNUMMER}</Td>
                        <Td className="text-muted-foreground">{formatDate(f.DATUM)}</Td>
                        <Td right>{formatCurrency(f.BEDRAG_EXCL)}</Td>
                        <Td right className="text-emerald-600 dark:text-emerald-400">{formatCurrency(f.BETAALD_BEDRAG)}</Td>
                        <Td right className={open > 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground"}>{formatCurrency(open)}</Td>
                        <Td><StatusBadge status={f.STATUS} /></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Berekeningen aanpassen */}
      <BerekenenPanel rapport={r} projectId={id} database={activeDb} />
    </div>
  );
}
