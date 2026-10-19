import { format, startOfMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import { getStockLevels } from "@/lib/queries";

/**
 * Reports are built once as plain tabular data, then rendered on the page or
 * exported as CSV / PDF — so every format always shows the same numbers.
 */
export const REPORTS = [
  { id: "inventory-summary", label: "Inventory summary" },
  { id: "category", label: "Category breakdown" },
  { id: "sales-monthly", label: "Monthly sales" },
] as const;

export type ReportId = (typeof REPORTS)[number]["id"];

export type ReportColumn = {
  label: string;
  kind: "text" | "number" | "money";
  /** Highlight style on screen (e.g. margins in green). */
  tone?: "success";
  emphasis?: boolean;
};

export type ReportCell = string | number;

export type ReportTable = {
  id: ReportId;
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  /** Optional totals row; `null` cells render empty. */
  footer?: (ReportCell | null)[];
};

export function isReportId(value: string | undefined): value is ReportId {
  return REPORTS.some((r) => r.id === value);
}

async function inventorySummary(): Promise<ReportTable> {
  const { levels, warehouses } = await getStockLevels();
  const totalCost = levels.reduce((sum, l) => sum + l.total * l.costPrice, 0);
  const totalRetail = levels.reduce((sum, l) => sum + l.total * l.unitPrice, 0);
  const totalUnits = levels.reduce((sum, l) => sum + l.total, 0);

  return {
    id: "inventory-summary",
    title: "Inventory summary",
    subtitle: "Stock on hand per warehouse, valued at cost and retail",
    columns: [
      { label: "Product", kind: "text", emphasis: true },
      { label: "SKU", kind: "text" },
      ...warehouses.map((wh) => ({ label: wh.code, kind: "number" as const })),
      { label: "Total units", kind: "number", emphasis: true },
      { label: "Value (cost)", kind: "money" },
      { label: "Value (retail)", kind: "money" },
    ],
    rows: levels.map((level) => [
      level.name,
      level.sku,
      ...level.byWarehouse.map((wh) => wh.quantity),
      level.total,
      level.total * level.costPrice,
      level.total * level.unitPrice,
    ]),
    footer: [
      "Total",
      null,
      ...warehouses.map((wh) =>
        levels.reduce(
          (sum, l) => sum + (l.byWarehouse.find((w) => w.warehouseId === wh.id)?.quantity ?? 0),
          0
        )
      ),
      totalUnits,
      totalCost,
      totalRetail,
    ],
  };
}

async function categoryBreakdown(): Promise<ReportTable> {
  const { levels } = await getStockLevels();
  const categories = new Map<string, { products: number; units: number; cost: number; retail: number }>();
  for (const level of levels) {
    const entry = categories.get(level.category) ?? { products: 0, units: 0, cost: 0, retail: 0 };
    entry.products += 1;
    entry.units += level.total;
    entry.cost += level.total * level.costPrice;
    entry.retail += level.total * level.unitPrice;
    categories.set(level.category, entry);
  }
  const entries = [...categories.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sum = (key: "products" | "units" | "cost" | "retail") =>
    entries.reduce((total, [, e]) => total + e[key], 0);

  return {
    id: "category",
    title: "Category breakdown",
    subtitle: "Stock and potential margin by main category",
    columns: [
      { label: "Category", kind: "text", emphasis: true },
      { label: "Products", kind: "number" },
      { label: "Units in stock", kind: "number" },
      { label: "Value (cost)", kind: "money" },
      { label: "Value (retail)", kind: "money" },
      { label: "Potential margin", kind: "money", tone: "success", emphasis: true },
    ],
    rows: entries.map(([category, e]) => [
      category,
      e.products,
      e.units,
      e.cost,
      e.retail,
      e.retail - e.cost,
    ]),
    footer: ["Total", sum("products"), sum("units"), sum("cost"), sum("retail"), sum("retail") - sum("cost")],
  };
}

async function monthlySales(): Promise<ReportTable> {
  const now = new Date();
  const start = startOfMonth(subMonths(now, 11));
  const sales = await db.sale.findMany({
    where: { date: { gte: start }, status: "COMPLETED" },
    select: { date: true, total: true, items: { select: { quantity: true } } },
  });

  const months = new Map<string, { count: number; units: number; revenue: number }>();
  for (let i = 11; i >= 0; i--) {
    months.set(format(subMonths(now, i), "MMM yyyy"), { count: 0, units: 0, revenue: 0 });
  }
  for (const sale of sales) {
    const entry = months.get(format(sale.date, "MMM yyyy"));
    if (!entry) continue;
    entry.count += 1;
    entry.units += sale.items.reduce((sum, i) => sum + i.quantity, 0);
    entry.revenue += Number(sale.total);
  }
  const rows = [...months.entries()].filter(([, e]) => e.count > 0);
  const sum = (key: "count" | "units" | "revenue") => rows.reduce((t, [, e]) => t + e[key], 0);

  return {
    id: "sales-monthly",
    title: "Monthly sales",
    subtitle: "Completed sales over the last 12 months",
    columns: [
      { label: "Month", kind: "text", emphasis: true },
      { label: "Sales", kind: "number" },
      { label: "Units sold", kind: "number" },
      { label: "Avg. sale", kind: "money" },
      { label: "Revenue", kind: "money", emphasis: true },
    ],
    rows: rows.map(([month, e]) => [month, e.count, e.units, e.count ? e.revenue / e.count : 0, e.revenue]),
    footer: ["Total", sum("count"), sum("units"), sum("count") ? sum("revenue") / sum("count") : 0, sum("revenue")],
  };
}

export async function buildReport(id: ReportId): Promise<ReportTable> {
  switch (id) {
    case "inventory-summary":
      return inventorySummary();
    case "category":
      return categoryBreakdown();
    case "sales-monthly":
      return monthlySales();
  }
}
