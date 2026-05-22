"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { klantenApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Mail, Phone, Euro, FolderKanban, FileText, AlertCircle } from "lucide-react";

export default function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["klanten", id],
    queryFn: () => klantenApi.detail(Number(id)),
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
        {/* Contact */}
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

        {/* Projecten */}
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

        {/* Recente facturen */}
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
