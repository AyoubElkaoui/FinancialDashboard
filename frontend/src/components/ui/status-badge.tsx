const STYLES: Record<string, string> = {
  // Project
  ACTIEF:        "bg-emerald-500/15 text-emerald-600  dark:text-emerald-400  ring-1 ring-emerald-500/30",
  AFGEROND:      "bg-blue-500/15    text-blue-600     dark:text-blue-400     ring-1 ring-blue-500/30",
  GEANNULEERD:   "bg-red-500/15     text-red-600      dark:text-red-400      ring-1 ring-red-500/30",
  ON_HOLD:       "bg-slate-500/15   text-slate-600    dark:text-slate-400    ring-1 ring-slate-500/30",
  // Werkbon
  NIEUW:         "bg-blue-500/15    text-blue-600     dark:text-blue-400     ring-1 ring-blue-500/30",
  IN_UITVOERING: "bg-amber-500/15   text-amber-600    dark:text-amber-400    ring-1 ring-amber-500/30",
  GEFACTUREERD:  "bg-violet-500/15  text-violet-600   dark:text-violet-400   ring-1 ring-violet-500/30",
  // Factuur
  OPEN:          "bg-orange-500/15  text-orange-600   dark:text-orange-400   ring-1 ring-orange-500/30",
  BETAALD:       "bg-emerald-500/15 text-emerald-600  dark:text-emerald-400  ring-1 ring-emerald-500/30",
  DEELS_BETAALD: "bg-yellow-500/15  text-yellow-700   dark:text-yellow-400   ring-1 ring-yellow-500/30",
  ONINBAAR:      "bg-red-500/15     text-red-600      dark:text-red-400      ring-1 ring-red-500/30",
  GECREDITEERD:  "bg-slate-500/15   text-slate-600    dark:text-slate-400    ring-1 ring-slate-500/30",
  VERVALLEN:     "bg-red-500/15     text-red-600      dark:text-red-400      ring-1 ring-red-500/30",
  // Inkoop
  GEBOEKT:       "bg-slate-500/15   text-slate-600    dark:text-slate-400    ring-1 ring-slate-500/30",
};

const LABELS: Record<string, string> = {
  ACTIEF:        "Actief",
  AFGEROND:      "Afgerond",
  GEANNULEERD:   "Geannuleerd",
  ON_HOLD:       "On hold",
  NIEUW:         "Nieuw",
  IN_UITVOERING: "In uitvoering",
  GEFACTUREERD:  "Gefactureerd",
  OPEN:          "Open",
  BETAALD:       "Betaald",
  DEELS_BETAALD: "Deels betaald",
  ONINBAAR:      "Oninbaar",
  GECREDITEERD:  "Gecrediteerd",
  VERVALLEN:     "Vervallen",
  GEBOEKT:       "Geboekt",
};

function toLabel(status: string): string {
  return LABELS[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = STYLES[status] ?? "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/30";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style} ${className}`}>
      {toLabel(status)}
    </span>
  );
}
