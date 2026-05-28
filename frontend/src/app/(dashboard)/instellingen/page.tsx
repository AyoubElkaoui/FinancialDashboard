"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LayoutDashboard, BarChart2, Users, Clock,
  FileText, CheckCircle2, Settings2,
} from "lucide-react";

const DB_LABELS: Record<string, string> = {
  SERVICES:      "Elmar Services",
  MAINTENANCE:   "Elmar Maintenance",
  INTERNATIONAL: "Elmar International",
  KEYSER:        "Elmar Keyser",
};

const DASHBOARD_WIDGETS = [
  { id: "financieel",      label: "Financiële KPIs",          description: "Omzet, debiteuren, projecten, werkbonnen",     icon: BarChart2 },
  { id: "uren",            label: "Uren & Personeel",          description: "Uren deze week, maand en actieve medewerkers",  icon: Clock },
  { id: "omzet-grafiek",   label: "Omzet per maand grafiek",   description: "Area chart met 3-maands gemiddelde",           icon: BarChart2 },
  { id: "inkoop-grafiek",  label: "Inkoop per kostensoort",    description: "Donut chart met kostenopbouw",                 icon: FileText },
  { id: "uren-dag",        label: "Uren per dag grafiek",      description: "Staafdiagram laatste 2 weken",                 icon: Clock },
  { id: "uren-medewerker", label: "Uren per medewerker",       description: "Horizontaal staafdiagram deze maand",          icon: Users },
  { id: "top-klanten",     label: "Top klanten op omzet",      description: "Horizontaal staafdiagram huidig jaar",         icon: LayoutDashboard },
  { id: "aging",           label: "Openstaande debiteuren",    description: "Aging buckets met progressiebalk",             icon: FileText },
  { id: "uren-project",    label: "Uren per project",          description: "Top 8 projecten op uren deze maand",          icon: LayoutDashboard },
  { id: "recente-uren",    label: "Recente uren tabel",        description: "Laatste geregistreerde uren",                  icon: Clock },
  { id: "werkbonnen",      label: "Recente werkbonnen",        description: "Laatste 6 werkbonnen",                        icon: FileText },
  { id: "open-facturen",   label: "Openstaande facturen",      description: "Top 6 gesorteerd op overdue",                 icon: FileText },
];

const STORAGE_KEY = "elmar_dashboard_prefs";

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {}
  // Default: all visible
  return Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.id, true]));
}

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
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function InstellingenPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [activeDb, setActiveDb] = useState("SERVICES");

  useEffect(() => {
    setPrefs(loadPrefs());
    try {
      const db = localStorage.getItem("elmar_active_db");
      if (db) setActiveDb(db);
    } catch {}
  }, []);

  const toggle = (id: string, value: boolean) => {
    const updated = { ...prefs, [id]: value };
    setPrefs(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    toast.success(`${value ? "Weergegeven" : "Verborgen"}: ${DASHBOARD_WIDGETS.find((w) => w.id === id)?.label}`);
  };

  const allOn  = DASHBOARD_WIDGETS.every((w) => prefs[w.id] !== false);
  const allOff = DASHBOARD_WIDGETS.every((w) => prefs[w.id] === false);

  const toggleAll = () => {
    const newVal = !allOn;
    const updated = Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.id, newVal]));
    setPrefs(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    toast.success(newVal ? "Alle widgets weergegeven" : "Alle widgets verborgen");
  };

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          Instellingen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pas uw dashboard aan en beheer uw voorkeuren.</p>
      </div>

      {/* Actieve database info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actieve database</CardTitle>
          <CardDescription>
            Geselecteerd via de selector in de topbalk. Wordt opgeslagen in uw browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold text-blue-700 dark:text-blue-400">{DB_LABELS[activeDb] ?? activeDb}</span>
            <span className="text-sm text-muted-foreground ml-auto">
              Wissel via de database-selector rechtsboven
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(DB_LABELS).map(([key, label]) => (
              <div
                key={key}
                className={`rounded-md p-2 text-xs font-medium text-center transition-colors ${
                  key === activeDb
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard widget toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Dashboard widgets</CardTitle>
              <CardDescription>Kies welke secties zichtbaar zijn op het dashboard.</CardDescription>
            </div>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {allOn ? "Alles verbergen" : "Alles tonen"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {DASHBOARD_WIDGETS.map((w, i) => {
            const Icon = w.icon;
            const checked = prefs[w.id] !== false;
            return (
              <div
                key={w.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  i % 2 === 0 ? "bg-muted/30" : ""
                } ${!checked ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    checked ? "bg-blue-500/10" : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${checked ? "text-blue-600" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{w.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.description}</p>
                  </div>
                </div>
                <Toggle checked={checked} onChange={(v) => toggle(w.id, v)} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Projectberekeningen uitleg */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Projectberekeningen aanpassen
          </CardTitle>
          <CardDescription>
            Als projectleider kunt u per project de financiële invoerwaarden corrigeren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Ga naar <span className="font-medium text-foreground">Projecten → klik een project</span> en scrol naar de sectie <span className="font-medium text-foreground">"Berekeningen aanpassen"</span> onderaan de pagina.
          </p>
          <div className="grid gap-2">
            {[
              ["Uren aantal",        "Het totale aantal gewerkte uren op het project"],
              ["Uren tarief",        "Het uurtarief waartegen uren worden doorbelast (€ / uur)"],
              ["Alg. kosten %",     "Percentage algemene kosten over de directe kosten"],
              ["Opmerkingen",       "Interne toelichting bij de aanpassingen"],
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
          <p className="text-xs">
            Aanpassingen worden opgeslagen in de beveiligde database en zijn zichtbaar voor alle gebruikers met toegang tot die database. Een auditlog registreert wie wat heeft gewijzigd.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
