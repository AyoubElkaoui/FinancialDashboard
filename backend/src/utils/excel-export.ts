import ExcelJS from "exceljs";

interface ColumnDef {
  key: string;
  header: string;
  type?: "currency" | "number" | "date";
}

export async function generateExcel(
  title: string,
  columns: ColumnDef[],
  data: Record<string, unknown>[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Syntess Rapport";
  wb.created = new Date();

  const ws = wb.addWorksheet(title, {
    pageSetup: { orientation: "landscape", fitToPage: true },
  });

  // Title row
  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `${title} — gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "left" };

  // Header row
  ws.addRow(columns.map((c) => c.header));
  const headerRow = ws.getRow(2);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B4A6B" } };
  headerRow.alignment = { horizontal: "center" };

  // Data rows
  for (const row of data) {
    ws.addRow(columns.map((c) => row[c.key] ?? ""));
  }

  // Column formatting
  columns.forEach((col, idx) => {
    const wsCol = ws.getColumn(idx + 1);
    wsCol.width = Math.max(15, col.header.length + 4);

    if (col.type === "currency") {
      wsCol.numFmt = '€ #,##0.00;[Red]-€ #,##0.00';
      wsCol.alignment = { horizontal: "right" };
    } else if (col.type === "number") {
      wsCol.numFmt = "#,##0";
      wsCol.alignment = { horizontal: "right" };
    } else if (col.type === "date") {
      wsCol.numFmt = "dd-mm-yyyy";
    }
  });

  // Alternating row colors
  for (let r = 3; r <= data.length + 2; r++) {
    if (r % 2 === 0) {
      ws.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
    }
  }

  // Auto filter
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } };

  // Freeze header rows
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
