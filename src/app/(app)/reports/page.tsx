import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, startOfMonth, subMonths } from "date-fns";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getStockLevels } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { id: "inventory-summary", label: "Inventory summary" },
  { id: "category", label: "Category breakdown" },
  { id: "sales-monthly", label: "Monthly sales" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

async function InventorySummary() {
  const { levels, warehouses } = await getStockLevels();
  const totalCost = levels.reduce((sum, l) => sum + l.total * l.costPrice, 0);
  const totalRetail = levels.reduce((sum, l) => sum + l.total * l.unitPrice, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          {warehouses.map((wh) => (
            <TableHead key={wh.id} className="text-right">
              {wh.code}
            </TableHead>
          ))}
          <TableHead className="text-right">Total units</TableHead>
          <TableHead className="text-right">Value (cost)</TableHead>
          <TableHead className="text-right">Value (retail)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {levels.map((level) => (
          <TableRow key={level.productId}>
            <TableCell className="font-medium">{level.name}</TableCell>
            {level.byWarehouse.map((wh) => (
              <TableCell key={wh.warehouseId} className="text-right tabular-nums">
                {wh.quantity}
              </TableCell>
            ))}
            <TableCell className="text-right font-medium tabular-nums">
              {level.total}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNaira(level.total * level.costPrice)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNaira(level.total * level.unitPrice)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={warehouses.length + 2} className="font-semibold">
            Total stock value
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {formatNaira(totalCost)}
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {formatNaira(totalRetail)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

async function CategoryBreakdown() {
  const { levels } = await getStockLevels();
  const categories = new Map<
    string,
    { products: number; units: number; cost: number; retail: number }
  >();
  for (const level of levels) {
    const entry = categories.get(level.category) ?? {
      products: 0,
      units: 0,
      cost: 0,
      retail: 0,
    };
    entry.products += 1;
    entry.units += level.total;
    entry.cost += level.total * level.costPrice;
    entry.retail += level.total * level.unitPrice;
    categories.set(level.category, entry);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Products</TableHead>
          <TableHead className="text-right">Units in stock</TableHead>
          <TableHead className="text-right">Value (cost)</TableHead>
          <TableHead className="text-right">Value (retail)</TableHead>
          <TableHead className="text-right">Potential margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...categories.entries()].map(([category, entry]) => (
          <TableRow key={category}>
            <TableCell className="font-medium">{category}</TableCell>
            <TableCell className="text-right tabular-nums">{entry.products}</TableCell>
            <TableCell className="text-right tabular-nums">{entry.units}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNaira(entry.cost)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNaira(entry.retail)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums text-success">
              {formatNaira(entry.retail - entry.cost)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function MonthlySales() {
  const start = startOfMonth(subMonths(new Date(), 11));
  const sales = await db.sale.findMany({
    where: { date: { gte: start }, status: "COMPLETED" },
    select: { date: true, total: true, items: { select: { quantity: true } } },
  });

  const months = new Map<string, { count: number; units: number; revenue: number }>();
  for (let i = 11; i >= 0; i--) {
    months.set(format(subMonths(new Date(), i), "MMM yyyy"), {
      count: 0,
      units: 0,
      revenue: 0,
    });
  }
  for (const sale of sales) {
    const key = format(sale.date, "MMM yyyy");
    const entry = months.get(key);
    if (!entry) continue;
    entry.count += 1;
    entry.units += sale.items.reduce((sum, i) => sum + i.quantity, 0);
    entry.revenue += Number(sale.total);
  }

  const rows = [...months.entries()].filter(([, e]) => e.count > 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Sales</TableHead>
          <TableHead className="text-right">Units sold</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([month, entry]) => (
          <TableRow key={month}>
            <TableCell className="font-medium">{month}</TableCell>
            <TableCell className="text-right tabular-nums">{entry.count}</TableCell>
            <TableCell className="text-right tabular-nums">{entry.units}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatNaira(entry.revenue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const { type } = await searchParams;
  const active: ReportId = REPORTS.some((r) => r.id === type)
    ? (type as ReportId)
    : "inventory-summary";

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generated live from the ledger — always current, never stale."
      />

      <FadeIn>
        <div className="mb-4 flex flex-wrap gap-2">
          {REPORTS.map((report) => (
            <Link
              key={report.id}
              href={`/reports?type=${report.id}`}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active === report.id
                  ? "border-transparent bg-primary text-primary-foreground shadow"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {report.label}
            </Link>
          ))}
        </div>

        <Card className="glass">
          <CardContent className="overflow-x-auto pt-6">
            {active === "inventory-summary" && <InventorySummary />}
            {active === "category" && <CategoryBreakdown />}
            {active === "sales-monthly" && <MonthlySales />}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
