"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatCurrency, formatPercentage } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Euro, TrendingUp, CheckCircle2, Calculator,
} from "lucide-react";
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({
  label, value, bold, green, orange,
}: {
  label: string;
  value: string | React.ReactNode;
  bold?: boolean;
  green?: boolean;
  orange?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? "font-semibold" : ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm tabular-nums ${
          bold ? "font-bold text-foreground" : ""
        } ${green ? "text-emerald-600 dark:text-emerald-400" : ""} ${
          orange ? "text-orange-600 dark:text-orange-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t my-2" />;
}

// ─── Table header ─────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`px-4 py-3 text-sm ${right ? "text-right tabular-nums" : ""} ${className}`}>
      {children}
    </td>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectRapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeDb, setActiveDb] = useState<string>("SERVICES");

  useEffect(() => {
    // Priority: ?database= query param, then localStorage, then default
    const qDb = searchParams.get("database");
    if (qDb) {
      setActiveDb(qDb);
    } else {
      try {
        const stored = localStorage.getItem("elmar_active_db");
        if (stored) setActiveDb(stored);
      } catch {
        // ignore localStorage errors (SSR, privacy mode)
      }
    }
  }, [searchParams]);

  const { data: rapport, isLoading, isError } = useQuery<ElmarRapport>({
    queryKey: ["project-rapport", id, activeDb],
    queryFn: () =>
      fetch(`/api/v1/projecten/${id}/rapport?database=${activeDb}`).then((r) => {
        if (!r.ok) throw new Error("Project niet gevonden");
        return r.json() as Promise<ElmarRapport>;
      }),
    enabled: !!id,
  });

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  // ─── Not found ──────────────────────────────────────────────────────────────

  if (isError || !rapport) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <p className="text-lg font-medium">Project niet gevonden</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Terug
        </Button>
      </div>
    );
  }

  const r = rapport;

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Terug
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {r.PROJECTNUMMER}
            </span>
            <StatusBadge status={r.STATUS} />
            <DbBadge db={r.DATABASE} />
          </div>
          <h1 className="text-2xl font-bold mt-1 leading-tight">{r.NAAM}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {r.KLANT}
            {r.PROJECTLEIDER ? ` · Projectleider: ${r.PROJECTLEIDER}` : ""}
          </p>
        </div>
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aanneemsom + Meerwerk"
          value={formatCurrency(r.TOTAAL_AANNEEMSOM)}
          sub={`incl. ${formatCurrency(r.MEERWERK)} meerwerk`}
          icon={Euro}
          color="blue"
        />
        <StatCard
          label="Brutomarge"
          value={formatCurrency(r.BRUTOMARGE)}
          sub={`${formatPercentage(r.MARGE_PCT)} van gefactureerd`}
          icon={TrendingUp}
          color={r.BRUTOMARGE >= 0 ? "green" : "red"}
        />
        <StatCard
          label="% Betaald"
          value={formatPercentage(r.PCT_BETAALD)}
          sub={`${formatCurrency(r.BETAALD_TOTAAL)} van ${formatCurrency(r.GEFACTUREERD_TOTAAL)}`}
          icon={CheckCircle2}
          color={r.PCT_BETAALD >= 90 ? "green" : r.PCT_BETAALD >= 50 ? "orange" : "red"}
        />
        <StatCard
          label="Totale Kosten"
          value={formatCurrency(r.TOTALE_KOSTEN)}
          sub="direct + indirect + alg."
          icon={Calculator}
          color="slate"
        />
      </div>

      {/* ─── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ─── Section 1: Projectbasis ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle>Projectinformatie</SectionTitle>
            </CardTitle>
          </CardHeader>
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
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                    Opmerkingen
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{r.OPMERKINGEN}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Section 3: Kosten ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle>Kosten</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Row label="Directe kosten" value={formatCurrency(r.DIRECTE_KOSTEN)} />
            <Row
              label={`Indirecte kosten (${r.UREN_AANTAL} uur × €${r.UREN_TARIEF}/uur)`}
              value={formatCurrency(r.INDIRECTE_KOSTEN)}
            />
            <Row
              label={`Algemene kosten (${r.ALG_KOSTEN_PCT}% van directe kosten)`}
              value={formatCurrency(r.ALG_KOSTEN)}
            />
            <Divider />
            <Row label="Totale kosten" value={formatCurrency(r.TOTALE_KOSTEN)} bold />
            <Divider />
            <Row
              label="Brutomarge"
              value={formatCurrency(r.BRUTOMARGE)}
              bold
              green={r.BRUTOMARGE >= 0}
              orange={r.BRUTOMARGE < 0}
            />
            <Row
              label="Marge %"
              value={formatPercentage(r.MARGE_PCT)}
              green={r.MARGE_PCT >= 0}
              orange={r.MARGE_PCT < 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 2: Opbrengsten ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle>Opbrengsten</SectionTitle>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label="Aanneemsom" value={formatCurrency(r.AANNEEMSOM)} />
          <Row label="Meerwerk" value={formatCurrency(r.MEERWERK)} />
          <Row label="Totaal aanneemsom" value={formatCurrency(r.TOTAAL_AANNEEMSOM)} bold />

          <Divider />

          {/* Termijnen */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1 pb-2">
            Termijnplan
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <Th>NR</Th>
                  <Th>Omschrijving</Th>
                  <Th right>Bedrag</Th>
                  <Th>Status</Th>
                  <Th>Verwacht</Th>
                </tr>
              </thead>
              <tbody>
                {r.TERMIJNEN.map((t) => (
                  <tr key={t.NR} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <Td className="text-muted-foreground">{t.NR}</Td>
                    <Td>{t.OMSCHRIJVING}</Td>
                    <Td right>{formatCurrency(t.BEDRAG)}</Td>
                    <Td>
                      {t.NOG_TE_VERSTUREN ? (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30">
                          Te versturen
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                          Verstuurd
                        </span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">
                      {t.DATUM_VERWACHT ? formatDate(t.DATUM_VERWACHT) : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider />

          {/* Factuuroverzicht */}
          <Row label="Totaal gefactureerd" value={formatCurrency(r.GEFACTUREERD_TOTAAL)} />
          <Row label="Totaal betaald" value={formatCurrency(r.BETAALD_TOTAAL)} green />
          <Row
            label="Onbetaald"
            value={formatCurrency(r.ONBETAALD_TOTAAL)}
            bold
            orange={r.ONBETAALD_TOTAAL > 0}
          />
          <Row label="% betaald" value={formatPercentage(r.PCT_BETAALD)} />
        </CardContent>
      </Card>

      {/* ─── Section 4: Facturen ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle>Facturen</SectionTitle>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {r.FACTUREN.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Geen facturen gekoppeld aan dit project
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <Th>Factuurnummer</Th>
                    <Th>Datum</Th>
                    <Th right>Bedrag excl.</Th>
                    <Th right>Betaald</Th>
                    <Th right>Openstaand</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.FACTUREN.map((f) => {
                    const openstaand = Math.round((f.BEDRAG_EXCL - f.BETAALD_BEDRAG) * 100) / 100;
                    return (
                      <tr
                        key={f.FACTUURNUMMER}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <Td className="font-mono text-xs text-muted-foreground">{f.FACTUURNUMMER}</Td>
                        <Td className="text-muted-foreground">{formatDate(f.DATUM)}</Td>
                        <Td right>{formatCurrency(f.BEDRAG_EXCL)}</Td>
                        <Td right className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(f.BETAALD_BEDRAG)}
                        </Td>
                        <Td
                          right
                          className={
                            openstaand > 0
                              ? "text-orange-600 dark:text-orange-400 font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {formatCurrency(openstaand)}
                        </Td>
                        <Td>
                          <StatusBadge status={f.STATUS} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
