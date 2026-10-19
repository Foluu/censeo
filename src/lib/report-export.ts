import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { ReportCell, ReportColumn, ReportTable } from "@/lib/reports";

// ————— CSV —————

function csvEscape(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Raw numbers (no currency symbols) so spreadsheets can sum the columns. */
function csvCell(value: ReportCell | null, column: ReportColumn) {
  if (value === null) return "";
  if (typeof value === "number") return column.kind === "money" ? value.toFixed(2) : String(value);
  return csvEscape(value);
}

export function reportToCsv(report: ReportTable) {
  const header = report.columns.map((c) =>
    csvEscape(c.kind === "money" ? `${c.label} (NGN)` : c.label)
  );
  const lines = [
    header.join(","),
    ...report.rows.map((row) => row.map((v, i) => csvCell(v, report.columns[i])).join(",")),
  ];
  if (report.footer) {
    lines.push(report.footer.map((v, i) => csvCell(v, report.columns[i])).join(","));
  }
  // BOM so Excel opens UTF-8 (product names with “—” etc.) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ————— PDF —————

// Helvetica (the built-in PDF font) has no ₦ glyph, so amounts use "NGN".
const money = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-NG");

function pdfCell(value: ReportCell | null, column: ReportColumn) {
  if (value === null) return "";
  if (typeof value === "number") {
    return column.kind === "money" ? `NGN ${money.format(value)}` : integer.format(value);
  }
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "-");
}

export function reportToPdf(
  report: ReportTable,
  meta: { businessName: string; generatedBy: string }
) {
  const wide = report.columns.length > 6;
  const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const amber: [number, number, number] = [217, 119, 6];

  // Header
  doc.setFillColor(...amber);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27);
  doc.text(pdfCell(meta.businessName, { label: "", kind: "text" }), margin, 40);
  doc.setFontSize(12);
  doc.text(report.title, margin, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(report.subtitle, margin, 74);
  doc.text(
    `Generated ${format(new Date(), "d MMM yyyy, HH:mm")} by ${pdfCell(meta.generatedBy, { label: "", kind: "text" })}`,
    pageWidth - margin,
    40,
    { align: "right" }
  );

  const align = (c: ReportColumn) => (c.kind === "text" ? "left" : "right");
  autoTable(doc, {
    startY: 88,
    margin: { left: margin, right: margin },
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((row) => row.map((v, i) => pdfCell(v, report.columns[i]))),
    foot: report.footer
      ? [report.footer.map((v, i) => pdfCell(v, report.columns[i]))]
      : undefined,
    styles: { font: "helvetica", fontSize: wide ? 7.5 : 9, cellPadding: 5, textColor: [39, 39, 42] },
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [254, 243, 199], textColor: [24, 24, 27], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    columnStyles: Object.fromEntries(
      report.columns.map((c, i) => [
        i,
        { halign: align(c), fontStyle: c.emphasis ? "bold" : "normal" },
      ])
    ),
    didParseCell: (data) => {
      // Keep header/footer alignment in line with each column's body.
      if (data.section !== "body") data.cell.styles.halign = align(report.columns[data.column.index]);
    },
  });

  // Page numbers last, once the final page count is known.
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(`CountBook - Page ${page} of ${total}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, {
      align: "right",
    });
  }

  return doc.output("arraybuffer");
}
