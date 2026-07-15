import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductRowActions } from "@/components/products/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const products = await getProducts();

  return (
    <div>
      <PageHeader
        title="Product catalogue"
        description="The item master — SKUs, pricing, categories and tracking rules."
      >
        <ProductDialog />
      </PageHeader>

      <FadeIn>
        <Card className="glass">
          <CardContent className="pt-6">
            {products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Create your first product to start tracking inventory."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Cost price</TableHead>
                      <TableHead className="text-right">In stock</TableHead>
                      <TableHead className="text-right">Reorder at</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow
                        key={product.productId}
                        className={!product.isActive ? "opacity-50" : undefined}
                      >
                        <TableCell>
                          <p className="font-medium">{product.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {product.sku}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNaira(product.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatNaira(product.costPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {product.total}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {product.reorderLevel}
                        </TableCell>
                        <TableCell>
                          {product.isActive ? (
                            <Badge className="border-transparent bg-success/15 text-success">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <ProductRowActions product={product} />
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
