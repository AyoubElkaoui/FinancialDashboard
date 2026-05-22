import ExcelJS from "exceljs";

const COLUMNS = [
  { key: "NUMMER",          header: "Nummer",            width: 16 },
  { key: "DATUM",           header: "Datum",             width: 12, type: "date" },
  { key: "OMSCHRIJVING",    header: "Omschrijving",      width: 40 },
  { key: "TYPE",            header: "Type",              width: 16 },
  { key: "MOEDERRELATIE",   header: "Moederrelatie",     width: 32 },
  { key: "OBJECTLOCATIE",   header: "Objectlocatie",     width: 28 },
  { key: "ADRES",           header: "Adres",             width: 32 },
  { key: "FASE",            header: "Fase",              width: 14 },
  { key: "UITVOERINGSDATUM",header: "Uitvoeringsdatum",  width: 16, type: "date" },
  { key: "COORDINATOR",     header: "Coordinator",       width: 18 },
  { key: "KOSTEN",          header: "Kosten",            width: 14, type: "currency" },
  { key: "INDIRECT",        header: "Indirect € 7,5",   width: 14, type: "currency" },
  { key: "ALGEMEEN",        header: "Algemeen 5%",       width: 14, type: "currency" },
  { key: "TOTALE_KOSTEN",   header: "Totale kosten",     width: 14, type: "currency" },
  { key: "OPBRENGSTEN",     header: "Opbrengsten",       width: 14, type: "currency" },
  { key: "B_MARGE",         header: "B Marge",           width: 14, type: "currency" },
  { key: "MARGE_PCT",       header: "%",                 width: 8,  type: "pct" },
  { key: "FACTUURNUMMER",   header: "Factuurnummer",     width: 16 },
  { key: "FACTUURDATUM",    header: "Factuurdatum",      width: 14, type: "date" },
  { key: "BETAALD",         header: "Betaald",           width: 10 },
] as const;

// Header colours — match Map1 style
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid",
  fgColor: { argb: "FF1F3864" },   // dark navy blue
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
const CURRENCY_FMT = '€ #,##0.00;[Red]-€ #,##0.00';
const PCT_FMT = '#,##0.0"%"';
const DATE_FMT = "DD-MM-YYYY";

function margeColor(pct: number): string {
  if (pct >= 25) return "FFE2EFDA"; // groen
  if (pct >= 10) return "FFFFF2CC"; // geel
  if (pct >= 0)  return "FFFCE4D6"; // oranje
  return "FFFF0000";                 // rood
}

export async function generateWerkbonnenExcel(rows: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Syntess Rapport";
  wb.created = new Date();

  const ws = wb.addWorksheet("Werkbonnen", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    properties: { defaultColWidth: 14 },
  });

  // ─── Title row ────────────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, COLUMNS.length);
  const titleCell = ws.getCell("A1");
  titleCell.value = `Werkbonnen overzicht — gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`;
  titleCell.font = { bold: true, size: 12, color: { argb: "FF1F3864" } };
  ws.getRow(1).height = 22;

  // ─── Header row ───────────────────────────────────────────────────────────────
  const headerRow = ws.getRow(2);
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FFFFFFFF" } },
    };
    ws.getColumn(i + 1).width = col.width;
  });
  headerRow.height = 20;

  // ─── Data rows ────────────────────────────────────────────────────────────────
  rows.forEach((row, ri) => {
    const wsRow = ws.getRow(ri + 3);
    const isEven = ri % 2 === 1;

    COLUMNS.forEach((col, ci) => {
      const cell = wsRow.getCell(ci + 1);
      let val = row[col.key] ?? "";

      if ("type" in col) {
        if (col.type === "currency") {
          cell.value = val !== "" ? Number(val) : null;
          cell.numFmt = CURRENCY_FMT;
          cell.alignment = { horizontal: "right" };
          // Kleur marge-kolommen
          if (col.key === "B_MARGE") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: margeColor(Number(row["MARGE_PCT"] ?? 0)) } };
          } else if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
          }
        } else if (col.type === "pct") {
          cell.value = val !== "" ? Number(val) : null;
          cell.numFmt = PCT_FMT;
          cell.alignment = { horizontal: "right" };
          const pct = Number(val ?? 0);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: margeColor(pct) } };
          cell.font = { bold: true, size: 10 };
        } else if (col.type === "date" && val) {
          cell.value = new Date(String(val));
          cell.numFmt = DATE_FMT;
          cell.alignment = { horizontal: "center" };
          if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
        }
      } else {
        cell.value = String(val ?? "");
        if (col.key === "BETAALD") {
          if (val === "Ja") {
            cell.font = { color: { argb: "FF107C41" }, bold: true, size: 10 };
          } else if (val === "Nee") {
            cell.font = { color: { argb: "FFCC0000" }, size: 10 };
          }
        }
        if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FF" } };
      }

      cell.border = {
        right: ci === COLUMNS.length - 1 ? { style: "thin", color: { argb: "FFBFC7D3" } } : undefined,
        bottom: { style: "hair", color: { argb: "FFBFC7D3" } },
      };
    });
  });

  // ─── Totaal-rij ───────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(rows.length + 3);
  const costCols = ["KOSTEN","INDIRECT","ALGEMEEN","TOTALE_KOSTEN","OPBRENGSTEN","B_MARGE"] as const;
  COLUMNS.forEach((col, ci) => {
    const cell = totalRow.getCell(ci + 1);
    if (ci === 0) { cell.value = `Totaal (${rows.length} werkbonnen)`; cell.font = { bold: true, size: 10 }; }
    if (costCols.includes(col.key as typeof costCols[number])) {
      const total = rows.reduce((s, r) => s + Number(r[col.key] ?? 0), 0);
      cell.value = total;
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: "right" };
      cell.font = { bold: true, size: 10 };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
    cell.border = { top: { style: "medium", color: { argb: "FF1F3864" } } };
  });

  // ─── Autofilter + frozen header ───────────────────────────────────────────────
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
