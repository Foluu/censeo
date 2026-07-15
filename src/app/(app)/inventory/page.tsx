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
          <TabsList className="mb-4">
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
                  <div className="overflow-x-auto">
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
                  <div className="overflow-x-auto">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
