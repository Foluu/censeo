import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Star } from "lucide-react";
import {
  getCategoryGroups,
  getMainCategories,
  getProductDetail,
} from "@/lib/queries";
import { getSession } from "@/lib/session";
import { formatNaira, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/fade-in";
import { StatusBadge } from "@/components/status-badge";
import { stockState } from "@/components/products/product-card";
import { ProductRowActions } from "@/components/products/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);
  return { title: detail?.product.name ?? "Product" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const [detail, groups, mainCategories] = await Promise.all([
    getProductDetail(id),
    getCategoryGroups(),
    getMainCategories(),
  ]);
  if (!detail) notFound();

  const { product, recentSales, unitsSold } = detail;
  const state = stockState(product);
  const margin =
    product.unitPrice > 0
      ? ((product.unitPrice - product.costPrice) / product.unitPrice) * 100
      : 0;

  const stats = [
    { label: "Unit price", value: formatNaira(product.unitPrice) },
    { label: "Cost price", value: formatNaira(product.costPrice) },
    { label: "Margin", value: `${margin.toFixed(1)}%` },
    { label: "In stock", value: formatNumber(product.total) },
    { label: "Stock value", value: formatNaira(Math.max(product.total, 0) * product.costPrice) },
    { label: "Units sold", value: formatNumber(unitsSold) },
  ];

  // Selected options, organised by their category group.
  const assigned = groups
    .map((group) => ({
      group,
      options: product.options.filter((o) => o.groupId === group.id),
    }))
    .filter((entry) => entry.options.length > 0);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/products">
          <ArrowLeft className="size-4" /> Products
        </Link>
      </Button>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">{product.name}</span>
            {product.isFeatured && (
              <Star className="size-5 shrink-0 fill-primary text-primary" aria-label="Major product" />
            )}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-muted-foreground">{product.sku}</span>
            <Badge variant="secondary">{product.category}</Badge>
            <Badge
              className={cn(
                "border-transparent",
                state.tone === "success" && "bg-success/15 text-success",
                state.tone === "warning" && "bg-warning/15 text-warning",
                state.tone === "destructive" && "bg-destructive/15 text-destructive"
              )}
            >
              {state.label}
            </Badge>
            {!product.isActive && <Badge variant="outline">Archived</Badge>}
          </div>
          {product.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{product.description}</p>
          )}
        </div>
        <ProductRowActions
          product={product}
          groups={groups}
          mainCategories={mainCategories}
          showDetailsLink={false}
          className="size-10"
        />
      </div>

      <FadeIn>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass py-0 max-sm:py-0">
              <CardContent className="p-4 max-sm:px-3 max-sm:py-2.5">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 truncate text-lg font-semibold tabular-nums max-sm:text-base">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.06}>
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {assigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories assigned yet. Use Edit to tag this product.
                </p>
              ) : (
                <dl className="space-y-3">
                  {assigned.map(({ group, options }) => (
                    <div key={group.id} className="flex flex-wrap items-center gap-2">
                      <dt className="w-28 shrink-0 text-sm text-muted-foreground">{group.name}</dt>
                      {options.map((option) => (
                        <dd
                          key={option.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-sm"
                        >
                          {option.color && (
                            <span
                              className="size-2.5 rounded-full border border-black/10"
                              style={{ background: option.color }}
                            />
                          )}
                          {option.name}
                        </dd>
                      ))}
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="text-base">Stock by warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {product.byWarehouse.map((wh) => {
                  const share = product.total > 0 ? (Math.max(wh.quantity, 0) / product.total) * 100 : 0;
                  return (
                    <li key={wh.warehouseId} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span>
                          <span className="font-medium">{wh.code}</span>{" "}
                          <span className="text-muted-foreground">{wh.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{wh.quantity}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Reorder when total stock falls to {product.reorderLevel}.
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.14}>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                This product hasn’t been sold yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentSales.map((sale) => (
                  <li key={`${sale.saleId}-${sale.reference}`}>
                    <Link
                      href={`/sales/${sale.saleId}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sale.customer}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{sale.reference}</span> ·{" "}
                          {format(sale.date, "d MMM yy")} · {sale.quantity}{" "}
                          {sale.quantity === 1 ? "unit" : "units"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {formatNaira(sale.total)}
                        </span>
                        <StatusBadge status={sale.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
