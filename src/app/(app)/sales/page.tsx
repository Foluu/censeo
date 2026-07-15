import type { Metadata } from "next";
import { Search, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { getFormOptions, getSales } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { NewSaleDialog } from "@/components/sales/new-sale-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Sales" };

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Transfer",
  ONLINE: "Online",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [sales, options] = await Promise.all([getSales(q), getFormOptions()]);

  return (
    <div>
      <PageHeader
        title="Sales register"
        description="Every sale automatically deducts stock from the warehouse ledger."
      >
        <NewSaleDialog options={options} />
      </PageHeader>

      <FadeIn>
        <Card className="glass">
          <CardContent className="pt-6">
            <form className="mb-4 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search reference, customer or product…"
                  className="pl-9"
                />
              </div>
            </form>

            {sales.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={q ? "No sales match your search" : "No sales recorded yet"}
                description={
                  q
                    ? "Try a different reference, customer or product name."
                    : "Record your first sale to see it here."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-xs">
                          {sale.reference}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(sale.date, "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="max-w-44 truncate">
                          {sale.customer}
                        </TableCell>
                        <TableCell className="max-w-56">
                          <span
                            className="block truncate text-sm text-muted-foreground"
                            title={sale.items
                              .map((i) => `${i.quantity}× ${i.product}`)
                              .join(", ")}
                          >
                            {sale.items
                              .map((i) => `${i.quantity}× ${i.product}`)
                              .join(", ")}
                          </span>
                        </TableCell>
                        <TableCell>{sale.warehouse}</TableCell>
                        <TableCell>
                          {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatNaira(sale.total)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sale.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
