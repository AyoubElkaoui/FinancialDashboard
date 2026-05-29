"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LayoutDashboard, BarChart2, Users, Clock,
  FileText, CheckCircle2, Settings2, Wrench, Building2, TrendingUp, AlertCircle,
} from "lucide-react";
import { MAINT_PREFS_KEY, MAINT_WIDGETS } from "@/components/dashboard/maintenance-dashboard";

const DB_META: Record<string, { label: string; dot: string; color: string }> = {
  SERVICES:      { label: "Elmar Services",      dot: "bg-blue-500",    color: "text-blue-600 dark:text-blue-400" },
  MAINTENANCE:   { label: "Elmar Maintenance",   dot: "bg-violet-500",  color: "text-violet-600 dark:text-violet-400" },
  INTERNATIONAL: { label: "Elmar International", dot: "bg-emerald-500", color: "text-emerald-600 dark:text-emerald-400" },
  KEYSER:        { label: "Elmar Keyser",         dot: "bg-orange-500",  color: "text-orange-600 dark:text-orange-400" },
};

const PROJECT_WIDGETS = [
  { id: "financieel",      label: "Financiële KPIs",        description: "Omzet, debiteuren, projecten, werkbonnen",    icon: BarChart2 },
  { id: "uren",            label: "Uren & Personeel",        description: "Uren deze week, maand en actieve medewerkers", icon: Clock },
  { id: "omzet-grafiek",   label: "Omzet per maand",        description: "Area chart met 3-maands gemiddelde",          icon: BarChart2 },
  { id: "inkoop-grafiek",  label: "Inkoop per kostensoort", description: "Donut chart met kostenopbouw",                icon: FileText },
  { id: "uren-dag",        label: "Uren per dag",           description: "Staafdiagram laatste 2 weken",               icon: Clock },
  { id: "uren-medewerker", label: "Uren per medewerker",    description: "Horizontaal staafdiagram deze maand",         icon: Users },
  { id: "top-klanten",     label: "Top klanten op omzet",  description: "Horizontaal staafdiagram huidig jaar",        icon: LayoutDashboard },
  { id: "aging",           label: "Openstaande debiteuren", description: "Aging buckets met progressiebalk",           icon: FileText },
  { id: "uren-project",    label: "Uren per project",       description: "Top 8 projecten op uren deze maand",        icon: LayoutDashboard },
  { id: "recente-uren",    label: "Recente uren",           description: "Laatste geregistreerde uren",                icon: Clock },
  { id: "werkbonnen",      label: "Recente werkbonnen",     description: "Laatste 6 werkbonnen",                       icon: FileText },
  { id: "open-facturen",   label: "Openstaande facturen",   description: "Top 6 gesorteerd op overdue",                icon: FileText },
];

const MAINT_WIDGETS_DISPLAY = MAINT_WIDGETS.map((w, i) => ({
  ...w,
  icon: [Building2, TrendingUp, Wrench, AlertCircle][i] ?? BarChart2,
}));

const PROJECT_STORAGE_KEY = "elmar_dashboard_prefs";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
        checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function WidgetList({
  widgets,
  prefs,
  onToggle,
  onToggleAll,
}: {
  widgets: { id: string; label: string; description: string; icon: React.ElementType }[];
  prefs: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
  onToggleAll: () => void;
}) {
  const allOn = widgets.every(w => prefs[w.id] !== false);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Dashboard widgets</CardTitle>
            <CardDescription>Kies welke secties zichtbaar zijn op het dashboard.</CardDescription>
          </div>
          <button onClick={onToggleAll} className="text-xs text-blue-600 hover:underline font-medium">
            {allOn ? "Alles verbergen" : "Alles tonen"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {widgets.map((w, i) => {
          const Icon = w.icon;
          const checked = prefs[w.id] !== false;
          return (
            <div
              key={w.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${i % 2 === 0 ? "bg-muted/30" : ""} ${!checked ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${checked ? "bg-blue-500/10" : "bg-muted"}`}>
                  <Icon className={`h-4 w-4 ${checked ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{w.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.description}</p>
                </div>
              </div>
              <Toggle checked={checked} onChange={v => onToggle(w.id, v)} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function InstellingenPage() {
  const [activeDb, setActiveDb] = useState("SERVICES");
  const [projectPrefs, setProjectPrefs] = useState<Record<string, boolean>>({});
  const [maintPrefs,   setMaintPrefs]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const db = localStorage.getItem("elmar_active_db");
      if (db) setActiveDb(db);

      const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
      setProjectPrefs(raw ? (JSON.parse(raw) as Record<string, boolean>) : Object.fromEntries(PROJECT_WIDGETS.map(w => [w.id, true])));

      const rawM = localStorage.getItem(MAINT_PREFS_KEY);
      setMaintPrefs(rawM ? (JSON.parse(rawM) as Record<string, boolean>) : Object.fromEntries(MAINT_WIDGETS.map(w => [w.id, true])));
    } catch {}
  }, []);

  const isMaintenance = activeDb === "MAINTENANCE";
  const widgets = isMaintenance ? MAINT_WIDGETS_DISPLAY : PROJECT_WIDGETS;
  const prefs   = isMaintenance ? maintPrefs : projectPrefs;
  const key     = isMaintenance ? MAINT_PREFS_KEY : PROJECT_STORAGE_KEY;

  const setPrefs = (updated: Record<string, boolean>) => {
    if (isMaintenance) setMaintPrefs(updated);
    else setProjectPrefs(updated);
    try {
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("elmar-prefs-change"));
    } catch {}
  };

  const toggle = (id: string, value: boolean) => {
    setPrefs({ ...prefs, [id]: value });
    toast.success(`${value ? "Weergegeven" : "Verborgen"}: ${widgets.find(w => w.id === id)?.label}`);
  };

  const toggleAll = () => {
    const allOn = widgets.every(w => prefs[w.id] !== false);
    const updated = Object.fromEntries(widgets.map(w => [w.id, !allOn]));
    setPrefs(updated);
    toast.success(!allOn ? "Alle widgets weergegeven" : "Alle widgets verborgen");
  };

  const dbInfo = DB_META[activeDb];

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          Instellingen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pas uw dashboard aan en beheer uw voorkeuren.</p>
      </div>

      {/* Actieve database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actieve database</CardTitle>
          <CardDescription>Geselecteerd via de selector rechtsboven. Wordt opgeslagen in uw browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            isMaintenance ? "bg-violet-500/10 border-violet-500/20" : "bg-blue-500/10 border-blue-500/20"
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${dbInfo?.dot ?? "bg-slate-400"}`} />
            <span className={`font-semibold ${dbInfo?.color ?? ""}`}>{dbInfo?.label ?? activeDb}</span>
            <span className="text-sm text-muted-foreground ml-auto">Wissel via de selector rechtsboven</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(DB_META).map(([k, meta]) => (
              <div
                key={k}
                className={`rounded-lg p-2.5 text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                  k === activeDb ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} />
                {meta.label.replace("Elmar ", "")}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Widget toggles */}
      <WidgetList widgets={widgets} prefs={prefs} onToggle={toggle} onToggleAll={toggleAll} />

      {/* Help sectie — view-aware */}
      {isMaintenance ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-violet-500" />
              Maintenance — hoe het werkt
            </CardTitle>
            <CardDescription>Informatie over de Maintenance weergave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="grid gap-2">
              {[
                ["Klanten",     "Bekijk per klant de werkbon- en omzethistorie. Klik op een klant voor het volledig detail."],
                ["Werkbonnen",  "Overzicht van alle werkbonnen — filteren op status, klant en categorie."],
                ["Omzet",       "Week- en maand omzet gefilterd per klant of alle klanten gecombineerd."],
                ["Index",       "Jaar-op-jaar indexering van omzet en werkbonaantallen per klant."],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Projectberekeningen aanpassen
            </CardTitle>
            <CardDescription>Als projectleider kunt u per project de financiële invoerwaarden corrigeren.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Ga naar <span className="font-medium text-foreground">Projecten → klik een project</span> en scrol naar <span className="font-medium text-foreground">"Berekeningen aanpassen"</span> onderaan.</p>
            <div className="grid gap-2">
              {[
                ["Uren aantal",   "Totaal gewerkte uren op het project"],
                ["Uren tarief",   "Uurtarief waartegen uren worden doorbelast (€/uur)"],
                ["Alg. kosten %", "Percentage algemene kosten over de directe kosten"],
                ["Opmerkingen",   "Interne toelichting bij de aanpassingen"],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
