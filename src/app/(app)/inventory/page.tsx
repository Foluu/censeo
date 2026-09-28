import type { Metadata } from "next";
import { format } from "date-fns";
import { Boxes } from "lucide-react";
import { getFormOptions, getReceipts, getStockLevels } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ReceiveStockDialog } from "@/components/inventory/receive-stock-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const [{ levels, warehouses }, receipts, options] = await Promise.all([
    getStockLevels(),
    getReceipts(),
    getFormOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Live stock levels derived from the movement ledger — nothing is ever overwritten."
      >
        <ReceiveStockDialog options={options} />
      </PageHeader>

      <FadeIn>
        <Tabs defaultValue="levels">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="levels">Stock levels</TabsTrigger>
            <TabsTrigger value="receipts">Receipts history</TabsTrigger>
          </TabsList>

          <TabsContent value="levels">
            <Card className="glass">
              <CardContent className="pt-6">
                {levels.length === 0 ? (
                  <EmptyState
                    icon={Boxes}
                    title="No products yet"
                    description="Create products first, then receive stock into a warehouse."
                  />
                ) : (
                  <>
                  <ul className="divide-y divide-border/60 md:hidden">
                    {levels.map((level) => (
                      <li
                        key={level.productId}
                        className={`space-y-2 py-3 first:pt-0 last:pb-0 ${!level.isActive ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{level.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {level.sku} · {level.category}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-semibold leading-none tabular-nums">
                              {level.total}
                            </p>
                            <p
                              className={`mt-1 text-xs font-medium ${
                                !level.isActive
                                  ? "text-muted-foreground"
                                  : level.low
                                    ? "text-warning"
                                    : "text-success"
                              }`}
                            >
                              {!level.isActive ? "Inactive" : level.low ? "Low stock" : "Healthy"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {level.byWarehouse.map((wh) => (
                            <span
                              key={wh.warehouseId}
                              className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">{wh.code}</span>{" "}
                              {wh.quantity}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          {warehouses.map((wh) => (
                            <TableHead key={wh.id} className="text-right">
                              {wh.code}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {levels.map((level) => (
                          <TableRow
                            key={level.productId}
                            className={!level.isActive ? "opacity-50" : undefined}
                          >
                            <TableCell>
                              <p className="font-medium">{level.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {level.sku}
                              </p>
                            </TableCell>
                            <TableCell>{level.category}</TableCell>
                            {level.byWarehouse.map((wh) => (
                              <TableCell
                                key={wh.warehouseId}
                                className="text-right tabular-nums"
                              >
                                {wh.quantity}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-semibold tabular-nums">
                              {level.total}
                            </TableCell>
                            <TableCell>
                              {!level.isActive ? (
                                <Badge variant="outline">Inactive</Badge>
                              ) : level.low ? (
                                <Badge className="border-transparent bg-warning/15 text-warning">
                                  Low stock
                                </Badge>
                              ) : (
                                <Badge className="border-transparent bg-success/15 text-success">
                                  Healthy
                                </Badge>
                              )}
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
          </TabsContent>

          <TabsContent value="receipts">
            <Card className="glass">
              <CardContent className="pt-6">
                {receipts.length === 0 ? (
                  <EmptyState
                    icon={Boxes}
                    title="No stock received yet"
                    description="Use “Receive stock” to log incoming goods from suppliers."
                  />
                ) : (
                  <>
                  <ul className="divide-y divide-border/60 md:hidden">
                    {receipts.map((receipt) => (
                      <li key={receipt.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{receipt.product}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {format(receipt.date, "d MMM yyyy")} · {receipt.warehouse} ·{" "}
                            {receipt.supplier}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold tabular-nums">+{receipt.quantity}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {formatNaira(receipt.quantity * receipt.unitCost)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipts.map((receipt) => (
                          <TableRow key={receipt.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(receipt.date, "d MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{receipt.product}</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {receipt.sku}
                              </p>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {receipt.quantity}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNaira(receipt.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatNaira(receipt.quantity * receipt.unitCost)}
                            </TableCell>
                            <TableCell className="max-w-44 truncate">
                              {receipt.supplier}
                            </TableCell>
                            <TableCell>{receipt.warehouse}</TableCell>
                            <TableCell>
                              <StatusBadge status={receipt.status} />
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
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
