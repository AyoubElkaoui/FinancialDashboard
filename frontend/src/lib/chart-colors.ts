export const CHART_COLORS = [
  "hsl(220, 70%, 50%)",  // blauw
  "hsl(160, 60%, 45%)",  // groen
  "hsl(30, 80%, 55%)",   // oranje
  "hsl(280, 65%, 55%)",  // paars
  "hsl(340, 75%, 55%)",  // roze
  "hsl(200, 70%, 50%)",  // cyaan
  "hsl(60, 70%, 50%)",   // geel
  "hsl(10, 75%, 55%)",   // rood-oranje
  "hsl(120, 55%, 45%)",  // donkergroen
  "hsl(240, 65%, 60%)",  // indigo
];

export const STATUS_COLORS: Record<string, string> = {
  ACTIEF: "hsl(160, 60%, 45%)",
  AFGEROND: "hsl(220, 70%, 50%)",
  GEANNULEERD: "hsl(10, 75%, 55%)",
  OPEN: "hsl(30, 80%, 55%)",
  BETAALD: "hsl(160, 60%, 45%)",
  GEFACTUREERD: "hsl(220, 70%, 50%)",
};

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
