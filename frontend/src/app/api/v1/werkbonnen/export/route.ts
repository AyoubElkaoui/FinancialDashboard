import type { NextRequest } from "next/server";
import { mockWerkbonnenExportData } from "@/lib/mock/handlers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  const rows = mockWerkbonnenExportData({
    search:    s.get("search")    ?? undefined,
    status:    s.get("status")    ?? undefined,
    klantId:   s.get("klantId")   ? Number(s.get("klantId"))   : undefined,
    projectId: s.get("projectId") ? Number(s.get("projectId")) : undefined,
    dateFrom:  s.get("dateFrom")  ?? undefined,
    dateTo:    s.get("dateTo")    ?? undefined,
  });

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Syntess Rapport"; wb.created = new Date();

  const COLUMNS = [
    { key: "NUMMER",           header: "Nummer",            width: 16 },
    { key: "DATUM",            header: "Datum",             width: 12, type: "date" },
    { key: "OMSCHRIJVING",     header: "Omschrijving",      width: 40 },
    { key: "TYPE",             header: "Type",              width: 16 },
    { key: "MOEDERRELATIE",    header: "Moederrelatie",     width: 32 },
    { key: "OBJECTLOCATIE",    header: "Objectlocatie",     width: 28 },
    { key: "ADRES",            header: "Adres",             width: 32 },
    { key: "FASE",             header: "Fase",              width: 14 },
    { key: "UITVOERINGSDATUM", header: "Uitvoeringsdatum",  width: 16, type: "date" },
    { key: "COORDINATOR",      header: "Coordinator",       width: 18 },
    { key: "KOSTEN",           header: "Kosten",            width: 14, type: "currency" },
    { key: "INDIRECT",         header: "Indirect € 7,5",   width: 14, type: "currency" },
    { key: "ALGEMEEN",         header: "Algemeen 5%",       width: 14, type: "currency" },
    { key: "TOTALE_KOSTEN",    header: "Totale kosten",     width: 14, type: "currency" },
    { key: "OPBRENGSTEN",      header: "Opbrengsten",       width: 14, type: "currency" },
    { key: "B_MARGE",          header: "B Marge",           width: 14, type: "currency" },
    { key: "MARGE_PCT",        header: "%",                 width: 8,  type: "pct" },
    { key: "FACTUURNUMMER",    header: "Factuurnummer",     width: 16 },
    { key: "FACTUURDATUM",     header: "Factuurdatum",      width: 14, type: "date" },
    { key: "BETAALD",          header: "Betaald",           width: 10 },
  ] as const;

  const margeColor = (pct: number) => pct >= 25 ? "FFE2EFDA" : pct >= 10 ? "FFFFF2CC" : pct >= 0 ? "FFFCE4D6" : "FFFF0000";

  const ws = wb.addWorksheet("Werkbonnen", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 } });
  ws.mergeCells(1, 1, 1, COLUMNS.length);
  const tc = ws.getCell("A1");
  tc.value = `Werkbonnen overzicht — gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`;
  tc.font = { bold: true, size: 12, color: { argb: "FF1F3864" } };
  ws.getRow(1).height = 22;

  const hr = ws.getRow(2);
  COLUMNS.forEach((col, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getColumn(i + 1).width = col.width;
  });
  hr.height = 20;

  rows.forEach((row, ri) => {
    const wsRow = ws.getRow(ri + 3);
    const isEven = ri % 2 === 1;
    COLUMNS.forEach((col, ci) => {
      const cell = wsRow.getCell(ci + 1);
      const val = row[col.key as keyof typeof row] ?? "";
      if ("type" in col) {
        if (col.type === "currency") {
          cell.value = val !== "" ? Number(val) : null; cell.numFmt = '€ #,##0.00;[Red]-€ #,##0.00'; cell.alignment = { horizontal: "right" };
          if (col.key === "B_MARGE") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: margeColor(Number(row["MARGE_PCT"] ?? 0)) } };
          else if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
        } else if (col.type === "pct") {
          cell.value = val !== "" ? Number(val) : null; cell.numFmt = '#,##0.0"%"'; cell.alignment = { horizontal: "right" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: margeColor(Number(val ?? 0)) } }; cell.font = { bold: true, size: 10 };
        } else if (col.type === "date" && val) {
          cell.value = new Date(String(val)); cell.numFmt = "DD-MM-YYYY"; cell.alignment = { horizontal: "center" };
          if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
        }
      } else {
        cell.value = String(val ?? "");
        if (col.key === "BETAALD") { if (val === "Ja") cell.font = { color: { argb: "FF107C41" }, bold: true, size: 10 }; else if (val === "Nee") cell.font = { color: { argb: "FFCC0000" }, size: 10 }; }
        if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
      }
      cell.border = { bottom: { style: "hair", color: { argb: "FFBFC7D3" } } };
    });
  });

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const filename = `werkbonnen-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
