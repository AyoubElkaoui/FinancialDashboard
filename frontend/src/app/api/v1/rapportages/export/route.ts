import type { NextRequest } from "next/server";
import {
  mockRapportOmzetProject, mockRapportOpenDebiteuren,
  mockRapportMargeProjectleider, mockRapportInkoopKostensoort,
} from "@/lib/mock/handlers";

export const runtime = "nodejs";

type ColDef = { key: string; header: string; type?: "currency" | "number" | "date" };

const REPORTS: Record<string, { title: string; cols: ColDef[]; getData: (f?: string, t?: string) => Record<string, unknown>[] }> = {
  "omzet-project": {
    title: "Omzet per project",
    cols: [{ key:"PROJECTNUMMER",header:"Projectnummer" },{ key:"NAAM",header:"Naam" },{ key:"OMZET",header:"Omzet (excl. BTW)",type:"currency" }],
    getData: (f,t) => mockRapportOmzetProject(f,t) as Record<string,unknown>[],
  },
  "openstaande-debiteuren": {
    title: "Openstaande debiteuren",
    cols: [{ key:"KLANT",header:"Klant" },{ key:"FACTUURNUMMER",header:"Factuurnummer" },{ key:"DATUM",header:"Factuurdatum",type:"date" },{ key:"VERVALDATUM",header:"Vervaldatum",type:"date" },{ key:"TOTAALBEDRAG",header:"Totaalbedrag",type:"currency" },{ key:"OPENSTAAND",header:"Openstaand",type:"currency" },{ key:"DAGEN_OVERDUE",header:"Dagen overdue",type:"number" }],
    getData: () => mockRapportOpenDebiteuren() as Record<string,unknown>[],
  },
  "marge-projectleider": {
    title: "Marge per projectleider",
    cols: [{ key:"PROJECTLEIDER",header:"Projectleider" },{ key:"PROJECTEN",header:"Aantal projecten",type:"number" },{ key:"OMZET",header:"Omzet",type:"currency" },{ key:"KOSTEN",header:"Kosten",type:"currency" },{ key:"MARGE",header:"Marge",type:"currency" }],
    getData: (f,t) => mockRapportMargeProjectleider(f,t) as Record<string,unknown>[],
  },
  "inkoop-kostensoort": {
    title: "Inkoop per kostensoort",
    cols: [{ key:"KOSTENSOORT",header:"Kostensoort" },{ key:"FACTUREN",header:"Aantal facturen",type:"number" },{ key:"BEDRAG_EXCL",header:"Bedrag excl. BTW",type:"currency" },{ key:"BTW",header:"BTW",type:"currency" },{ key:"TOTAAL",header:"Totaal",type:"currency" }],
    getData: (f,t) => mockRapportInkoopKostensoort(f,t) as Record<string,unknown>[],
  },
};

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  const type = s.get("type") ?? "";
  const def = REPORTS[type];
  if (!def) return Response.json({ error: "Rapport niet gevonden" }, { status: 404 });

  const dateFrom = s.get("dateFrom") ?? undefined;
  const dateTo   = s.get("dateTo")   ?? undefined;
  const data = def.getData(dateFrom, dateTo);

  if (s.get("format") !== "xlsx") return Response.json({ report: type, title: def.title, generatedAt: new Date().toISOString(), data });

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook(); wb.creator = "Syntess Rapport"; wb.created = new Date();
  const ws = wb.addWorksheet(def.title, { pageSetup: { orientation: "landscape", fitToPage: true } });

  ws.mergeCells(1, 1, 1, def.cols.length);
  const tc = ws.getCell(1,1);
  tc.value = `${def.title} — gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`;
  tc.font = { bold: true, size: 13 }; tc.alignment = { horizontal: "left" };

  ws.addRow(def.cols.map(c => c.header));
  const hr = ws.getRow(2);
  hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B4A6B" } };
  hr.alignment = { horizontal: "center" };

  for (const row of data) ws.addRow(def.cols.map(c => row[c.key] ?? ""));

  def.cols.forEach((col, idx) => {
    const wc = ws.getColumn(idx + 1); wc.width = Math.max(15, col.header.length + 4);
    if (col.type === "currency") { wc.numFmt = '€ #,##0.00;[Red]-€ #,##0.00'; wc.alignment = { horizontal: "right" }; }
    else if (col.type === "number") { wc.numFmt = "#,##0"; wc.alignment = { horizontal: "right" }; }
    else if (col.type === "date")   { wc.numFmt = "dd-mm-yyyy"; }
  });

  for (let r = 3; r <= data.length + 2; r++)
    if (r % 2 === 0) ws.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: def.cols.length } };
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}
