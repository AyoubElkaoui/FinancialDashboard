"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { rapportagesApi } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const RAPPORT_BESCHRIJVINGEN: Record<string, string> = {
  "omzet-project": "Totale omzet per project, gefilterd op factuurdatum",
  "openstaande-debiteuren": "Alle openstaande facturen gesorteerd op overdue-dagen",
  "marge-projectleider": "Omzet, kosten en marge per projectleider",
  "inkoop-kostensoort": "Inkoopkosten uitgesplitst per kostensoort",
};

function RapportCard({ id, title }: { id: string; title: string }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = rapportagesApi.exportUrl(id, "xlsx");
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Export mislukt");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${id}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      toast.success(`${title} gedownload`);
    } catch {
      toast.error("Export mislukt — probeer opnieuw");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {RAPPORT_BESCHRIJVINGEN[id] ?? ""}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">Excel</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Datum van</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Datum tot</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs" />
          </div>
        </div>
        <Button size="sm" className="w-full gap-2" onClick={handleDownload} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Downloaden als Excel
        </Button>
      </CardContent>
    </Card>
  );
}

function RapportagesInner() {
  const { data: rapporten, isLoading } = useQuery({
    queryKey: ["rapportages"],
    queryFn: rapportagesApi.list,
    staleTime: Infinity,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapportages</h1>
        <p className="text-sm text-muted-foreground mt-1">Genereer en download voorgedefinieerde rapportages als Excel-bestand.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-44 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {(rapporten ?? []).map(r => (
            <RapportCard key={r.id} id={r.id} title={r.title} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RapportagesPage() {
  return <Suspense><RapportagesInner /></Suspense>;
}
