import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Receipt, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { getFormOptions, getSales } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FilterBar, type FilterField } from "@/components/filters/filter-bar";
import { NewSaleDialog } from "@/components/sales/new-sale-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type SalesSearchParams = {
  q?: string;
  from?: string;
  to?: string;
  payment?: string;
  status?: string;
  warehouse?: string;
  new?: string;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SalesSearchParams>;
}) {
  const params = await searchParams;
  const [sales, options] = await Promise.all([getSales(params), getFormOptions()]);

  const filtered = Boolean(
    params.q || params.from || params.to || params.payment || params.status || params.warehouse
  );
  const totalValue = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.total, 0);

  const fields: FilterField[] = [
    { type: "date", key: "from", label: "From date" },
    { type: "date", key: "to", label: "To date" },
    {
      type: "select",
      key: "payment",
      label: "Payment",
      defaultValue: "all",
      options: [
        { value: "all", label: "Any payment method" },
        ...Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label })),
      ],
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      defaultValue: "all",
      options: [
        { value: "all", label: "Any status" },
        { value: "COMPLETED", label: "Completed" },
        { value: "PENDING", label: "Pending" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
    {
      type: "select",
      key: "warehouse",
      label: "Warehouse",
      defaultValue: "all",
      options: [
        { value: "all", label: "All warehouses" },
        ...options.warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })),
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales register"
        description="Every sale automatically deducts stock from the warehouse ledger."
      >
        <NewSaleDialog options={options} defaultOpen={params.new === "1"} />
      </PageHeader>

      <FadeIn>
        <Card className="glass max-md:border-0 max-md:bg-transparent max-md:shadow-none max-md:backdrop-blur-none max-md:py-0">
          <CardContent className="pt-6 max-md:px-0 max-md:pt-0">
            <FilterBar
              fields={fields}
              searchPlaceholder="Search reference, customer or product…"
            />

            {sales.length > 0 && (
              <p className="mb-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{sales.length}</span>{" "}
                {sales.length === 1 ? "sale" : "sales"}
                {filtered ? " match" : ""} ·{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatNaira(totalValue)}
                </span>{" "}
                completed
              </p>
            )}

            {sales.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={filtered ? "No sales match your filters" : "No sales recorded yet"}
                description={
                  filtered
                    ? "Try a different search, date range or filter."
                    : "Record your first sale to see it here."
                }
              />
            ) : (
              <>
                {/* Phones: tappable cards */}
                <ul className="space-y-2.5 md:hidden">
                  {sales.map((sale) => (
                    <li key={sale.id}>
                      <Link
                        href={`/sales/${sale.id}`}
                        className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors active:bg-accent"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium">{sale.customer}</p>
                            <p className="shrink-0 font-semibold tabular-nums">
                              {formatNaira(sale.total)}
                            </p>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {sale.items
                              .map((i) => `${i.quantity}× ${i.product}`)
                              .join(", ")}
                          </p>
                          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{sale.reference}</span>
                            <span>·</span>
                            <span>{format(sale.date, "d MMM")}</span>
                            <span>·</span>
                            <span>{PAYMENT_LABELS[sale.paymentMethod]}</span>
                            <span className="ml-auto">
                              <StatusBadge status={sale.status} />
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Tablets & desktop: full register */}
                <div className="hidden overflow-x-auto md:block">
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
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-xs">
                            <Link
                              href={`/sales/${sale.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {sale.reference}
                            </Link>
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
                          <TableCell>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="View receipt"
                            >
                              <Link href={`/sales/${sale.id}`}>
                                <Receipt className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
