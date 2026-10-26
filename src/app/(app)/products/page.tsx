import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Banknote, Boxes, Package, Star, Tags } from "lucide-react";
import {
  getCategoryGroups,
  getCategoryTree,
  getProducts,
  type CategoryGroupData,
  type ProductLevel,
} from "@/lib/queries";
import { getSession } from "@/lib/session";
import { subtreeIds, type CategoryNode } from "@/lib/category-tree";
import { formatNaira, formatNairaCompact, formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { FilterBar, type FilterField } from "@/components/filters/filter-bar";
import { OptionChips, ProductCard, ProductListItem, stockState } from "@/components/products/product-card";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductRowActions } from "@/components/products/product-row-actions";
import { ViewToggle } from "@/components/products/view-toggle";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = { title: "Products" };

type ProductSearchParams = {
  q?: string;
  cat?: string;
  status?: string;
  stock?: string;
  featured?: string;
  opt?: string | string[];
  sort?: string;
  group?: string;
  view?: string;
};

const SORTS: Record<string, (a: ProductLevel, b: ProductLevel) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  "price-desc": (a, b) => b.unitPrice - a.unitPrice,
  "price-asc": (a, b) => a.unitPrice - b.unitPrice,
  "stock-asc": (a, b) => a.total - b.total,
  "stock-desc": (a, b) => b.total - a.total,
  value: (a, b) => b.total * b.costPrice - a.total * a.costPrice,
};

function applyFilters(
  products: ProductLevel[],
  params: ProductSearchParams,
  groups: CategoryGroupData[],
  tree: CategoryNode[]
) {
  // A category filter includes everything beneath it; "none" = uncategorised.
  const inCategory =
    params.cat && params.cat !== "none" ? new Set(subtreeIds(tree, params.cat)) : null;
  const q = params.q?.trim().toLowerCase();
  const optionIds = [params.opt ?? []].flat();

  // Options in the same group are OR-ed ("Red or Blue"); different groups are
  // AND-ed ("Red and 128GB").
  const optionGroup = new Map(groups.flatMap((g) => g.options.map((o) => [o.id, g.id])));
  const byGroup = new Map<string, Set<string>>();
  for (const id of optionIds) {
    const groupId = optionGroup.get(id);
    if (!groupId) continue;
    byGroup.set(groupId, (byGroup.get(groupId) ?? new Set()).add(id));
  }

  return products
    .filter((p) => {
      if (q && !`${p.name} ${p.sku} ${p.description}`.toLowerCase().includes(q)) return false;
      if (params.cat === "none" && p.categoryId) return false;
      if (inCategory && !(p.categoryId && inCategory.has(p.categoryId))) return false;
      if (params.status === "active" && !p.isActive) return false;
      if (params.status === "archived" && p.isActive) return false;
      if (params.featured === "1" && !p.isFeatured) return false;
      if (params.stock) {
        const state = stockState(p).tone;
        if (params.stock === "in" && state !== "success") return false;
        if (params.stock === "low" && state !== "warning") return false;
        if (params.stock === "out" && state !== "destructive") return false;
      }
      for (const wanted of byGroup.values()) {
        if (!p.options.some((o) => wanted.has(o.id))) return false;
      }
      return true;
    })
    .sort(SORTS[params.sort ?? "name"] ?? SORTS.name);
}

type Section = { key: string; title: string; swatch?: string | null; products: ProductLevel[] };

function groupProducts(
  products: ProductLevel[],
  groupBy: string | undefined,
  groups: CategoryGroupData[]
): Section[] {
  if (!groupBy) return [{ key: "all", title: "", products }];

  if (groupBy === "main" || groupBy === "category") {
    // "main" = top-level category; "category" = full path incl. sub-categories.
    const label = (p: ProductLevel) => (groupBy === "main" ? p.category : p.categoryPath);
    const map = new Map<string, ProductLevel[]>();
    for (const p of products) map.set(label(p), [...(map.get(label(p)) ?? []), p]);
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, items]) => ({ key: title, title, products: items }));
  }

  const group = groups.find((g) => g.id === groupBy);
  if (!group) return [{ key: "all", title: "", products }];
  const sections: Section[] = group.options.map((option) => ({
    key: option.id,
    title: option.name,
    swatch: option.color,
    products: products.filter((p) => p.options.some((o) => o.id === option.id)),
  }));
  const unassigned = products.filter(
    (p) => !p.options.some((o) => o.groupId === group.id)
  );
  sections.push({ key: "none", title: `No ${group.name.toLowerCase()}`, products: unassigned });
  return sections.filter((s) => s.products.length > 0);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const [products, groups, tree] = await Promise.all([
    getProducts(),
    getCategoryGroups(),
    getCategoryTree(),
  ]);

  const view = params.view === "grid" ? "grid" : "table";
  const visible = applyFilters(products, params, groups, tree);
  const sections = groupProducts(visible, params.group, groups);
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  const active = products.filter((p) => p.isActive);
  const stocked = active.filter((p) => !p.isService);
  const summary = [
    {
      label: "Products",
      value: formatNumber(active.length),
      detail: `${products.length - active.length} archived`,
      icon: Package,
      chip: "from-amber-400 to-amber-600 text-amber-950",
    },
    {
      label: "Units in stock",
      value: formatNumber(stocked.reduce((s, p) => s + Math.max(p.total, 0), 0)),
      detail: `${tree.filter((c) => c.depth === 0).length} categories · ${tree.filter((c) => c.depth > 0).length} sub`,
      icon: Boxes,
      chip: "from-teal-400 to-teal-600 text-teal-950",
    },
    {
      label: "Stock value",
      value: formatNairaCompact(stocked.reduce((s, p) => s + Math.max(p.total, 0) * p.costPrice, 0)),
      detail: `${formatNairaCompact(stocked.reduce((s, p) => s + Math.max(p.total, 0) * p.unitPrice, 0))} at retail`,
      icon: Banknote,
      chip: "from-violet-400 to-violet-600 text-violet-950",
    },
    {
      label: "Need restock",
      value: formatNumber(stocked.filter((p) => p.low).length),
      detail: `${stocked.filter((p) => p.total <= 0).length} out of stock`,
      icon: AlertTriangle,
      chip: "from-rose-400 to-rose-600 text-rose-950",
    },
  ];

  const filterableGroups = groups.filter((g) => g.isFilterable && g.options.length > 0);
  const fields: FilterField[] = [
    {
      type: "select",
      key: "cat",
      label: "Category",
      defaultValue: "all",
      options: [
        { value: "all", label: "All categories" },
        // Indented so the tree shape shows in the dropdown; includes sub-categories.
        ...tree.map((c) => ({
          value: c.id,
          label: `${"\u00a0\u00a0\u00a0".repeat(c.depth)}${c.depth ? "└ " : ""}${c.name} (${c.totalProducts})`,
        })),
        { value: "none", label: "Uncategorized" },
      ],
    },
    {
      type: "select",
      key: "stock",
      label: "Stock",
      defaultValue: "all",
      options: [
        { value: "all", label: "Any stock level" },
        { value: "in", label: "In stock" },
        { value: "low", label: "Low stock" },
        { value: "out", label: "Out of stock" },
      ],
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      defaultValue: "all",
      options: [
        { value: "all", label: "Active & archived" },
        { value: "active", label: "Active only" },
        { value: "archived", label: "Archived only" },
      ],
    },
    {
      type: "select",
      key: "featured",
      label: "Major products",
      defaultValue: "all",
      options: [
        { value: "all", label: "All products" },
        { value: "1", label: "Major products only" },
      ],
    },
    ...(filterableGroups.length > 0
      ? [
          {
            type: "chips" as const,
            key: "opt",
            label: "Categories",
            groups: filterableGroups.map((g) => ({
              id: g.id,
              label: g.name,
              options: g.options.map((o) => ({ value: o.id, label: o.name, color: o.color })),
            })),
          },
        ]
      : []),
    {
      type: "select",
      key: "group",
      label: "Group by",
      defaultValue: "none",
      options: [
        { value: "none", label: "No grouping" },
        { value: "main", label: "Top-level category" },
        { value: "category", label: "Category & sub-category" },
        ...groups.map((g) => ({ value: g.id, label: g.name })),
      ],
    },
    {
      type: "select",
      key: "sort",
      label: "Sort by",
      defaultValue: "name",
      hideChip: true,
      options: [
        { value: "name", label: "Name (A–Z)" },
        { value: "price-desc", label: "Price (high → low)" },
        { value: "price-asc", label: "Price (low → high)" },
        { value: "stock-asc", label: "Stock (lowest first)" },
        { value: "stock-desc", label: "Stock (highest first)" },
        { value: "value", label: "Stock value" },
      ],
    },
  ];

  const table = (items: ProductLevel[]) => (
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
          {items.map((product) => (
            <TableRow
              key={product.productId}
              className={!product.isActive ? "opacity-50" : undefined}
            >
              <TableCell>
                <Link
                  href={`/products/${product.productId}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
                >
                  {product.name}
                  {product.isFeatured && (
                    <Star className="size-3.5 fill-primary text-primary" />
                  )}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="secondary">{product.category}</Badge>
                  <OptionChips options={product.options} groupNames={groupNames} max={3} />
                </div>
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
                  <Badge className="border-transparent bg-success/15 text-success">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <ProductRowActions
                  product={product}
                  groups={groups}
                  categories={tree}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const cards = (items: ProductLevel[], className?: string) => (
    <div className={className}>
      {items.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          groups={groups}
          categories={tree}
          groupNames={groupNames}
        />
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Product catalogue"
        description="The item master — SKUs, pricing, categories and tracking rules."
      >
        <Button asChild variant="outline">
          <Link href="/products/categories">
            <Tags className="size-4" /> Categories
          </Link>
        </Button>
        <ProductDialog groups={groups} categories={tree} />
      </PageHeader>

      {/* At-a-glance summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map((item, i) => (
          <FadeIn key={item.label} delay={i * 0.04}>
            <Card className="glass h-full py-0 max-sm:py-0">
              <CardContent className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground sm:text-sm">{item.label}</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                    {item.value}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <div
                  className={`hidden size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md sm:flex ${item.chip}`}
                >
                  <item.icon className="size-4.5" />
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.1}>
        <Card className="glass max-md:border-0 max-md:bg-transparent max-md:py-0 max-sm:py-0 max-md:shadow-none max-md:backdrop-blur-none">
          <CardContent className="pt-6 max-md:px-0 max-sm:px-0 max-md:pt-0">
            <FilterBar fields={fields} searchPlaceholder="Search name, SKU or description…">
              <ViewToggle view={view} />
            </FilterBar>

            {products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Create your first product to start tracking inventory."
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products match your filters"
                description="Try a different search or clear some filters."
              />
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">{visible.length}</span> of{" "}
                  {products.length} products
                </p>
                {sections.map((section) => (
                  <section key={section.key} className="space-y-3">
                    {section.title && (
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        {section.swatch && (
                          <span
                            className="size-3 rounded-full border border-black/10"
                            style={{ background: section.swatch }}
                          />
                        )}
                        {section.title}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {section.products.length}
                        </span>
                      </h3>
                    )}
                    {/* Phones: compact rows */}
                    <div className="grid gap-2 sm:grid-cols-2 md:hidden">
                      {section.products.map((product) => (
                        <ProductListItem
                          key={product.productId}
                          product={product}
                          groups={groups}
                          categories={tree}
                          groupNames={groupNames}
                        />
                      ))}
                    </div>
                    {/* Tablet/desktop: table (default) or catalogue grid */}
                    {view === "grid"
                      ? cards(
                          section.products,
                          "hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                        )
                      : <div className="hidden md:block">{table(section.products)}</div>}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
