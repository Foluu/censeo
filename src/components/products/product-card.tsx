import Link from "next/link";
import { Star } from "lucide-react";
import type { CategoryGroupData, ProductLevel } from "@/lib/queries";
import { formatNaira, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductRowActions } from "./product-row-actions";

export function stockState(product: Pick<ProductLevel, "total" | "low">) {
  if (product.total <= 0) return { label: "Out of stock", tone: "destructive" as const };
  if (product.low) return { label: "Low stock", tone: "warning" as const };
  return { label: "In stock", tone: "success" as const };
}

const TONES = {
  destructive: { dot: "bg-destructive", text: "text-destructive", bar: "bg-destructive" },
  warning: { dot: "bg-warning", text: "text-warning", bar: "bg-warning" },
  success: { dot: "bg-success", text: "text-success", bar: "bg-success" },
};

export function OptionChips({
  options,
  groupNames,
  max = 4,
}: {
  options: ProductLevel["options"];
  groupNames: Map<string, string>;
  max?: number;
}) {
  if (options.length === 0) return null;
  const shown = options.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((option) => (
        <span
          key={option.id}
          title={`${groupNames.get(option.groupId) ?? "Category"}: ${option.name}`}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {option.color && (
            <span
              className="size-2 rounded-full border border-black/10"
              style={{ background: option.color }}
            />
          )}
          {option.name}
        </span>
      ))}
      {options.length > max && (
        <span className="rounded-md px-1 py-0.5 text-[11px] text-muted-foreground">
          +{options.length - max}
        </span>
      )}
    </div>
  );
}

/** Catalogue tile: everything important about a product in one glance. */
export function ProductCard({
  product,
  groups,
  mainCategories,
  groupNames,
}: {
  product: ProductLevel;
  groups: CategoryGroupData[];
  mainCategories: string[];
  groupNames: Map<string, string>;
}) {
  const state = stockState(product);
  const tone = TONES[state.tone];
  // Bar is "full" at 3× the reorder level — a rough sense of how much runway is left.
  const capacity = Math.max(product.reorderLevel * 3, 1);
  const fill = Math.min(100, Math.max(0, (product.total / capacity) * 100));

  return (
    <div
      className={cn(
        "glass group relative flex flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        !product.isActive && "opacity-55"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${product.productId}`}
            className="line-clamp-2 font-medium leading-snug after:absolute after:inset-0 after:rounded-2xl"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{product.sku}</p>
        </div>
        {product.isFeatured && (
          <Star className="mt-0.5 size-4 shrink-0 fill-primary text-primary" aria-label="Major product" />
        )}
        <ProductRowActions
          product={product}
          groups={groups}
          mainCategories={mainCategories}
          className="relative z-10 -mr-2 -mt-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{product.category}</Badge>
        {!product.isActive && <Badge variant="outline">Archived</Badge>}
      </div>

      <OptionChips options={product.options} groupNames={groupNames} />

      <div className="mt-auto space-y-2 pt-1">
        <div className="flex items-end justify-between gap-2">
          <p className="text-lg font-semibold tabular-nums">{formatNaira(product.unitPrice)}</p>
          <p className={cn("flex items-center gap-1.5 text-xs font-medium", tone.text)}>
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {product.isService ? "Service" : `${formatNumber(product.total)} in stock`}
          </p>
        </div>
        {!product.isService && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${fill}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
