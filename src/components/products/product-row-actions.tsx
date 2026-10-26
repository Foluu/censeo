"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Eye,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { toggleProductActive, toggleProductFeatured } from "@/lib/actions/products";
import type { CategoryGroupData, ProductLevel } from "@/lib/queries";
import type { CategoryNode } from "@/lib/category-tree";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDialog, type EditableProduct } from "./product-dialog";

export function toEditable(product: ProductLevel): EditableProduct {
  return {
    id: product.productId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    unitPrice: product.unitPrice,
    costPrice: product.costPrice,
    reorderLevel: product.reorderLevel,
    isSerialTracked: product.isSerialTracked,
    requiresExpiry: product.requiresExpiry,
    isService: product.isService,
    isFeatured: product.isFeatured,
    optionIds: product.options.map((o) => o.id),
  };
}

export function ProductRowActions({
  product,
  groups,
  categories,
  showDetailsLink = true,
  className,
}: {
  product: ProductLevel;
  groups: CategoryGroupData[];
  categories: CategoryNode[];
  showDetailsLink?: boolean;
  className?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await toggleProductActive(product.productId);
      if (result.ok) {
        toast.success(product.isActive ? "Product archived" : "Product restored");
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleFeatured() {
    startTransition(async () => {
      const result = await toggleProductFeatured(product.productId);
      if (result.ok) {
        toast.success(
          product.isFeatured ? "Removed from major products" : "Pinned as a major product"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", className)}
            aria-label={`Actions for ${product.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showDetailsLink && (
            <DropdownMenuItem asChild>
              <Link href={`/products/${product.productId}`}>
                <Eye className="size-4" /> View details
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFeatured}>
            {product.isFeatured ? (
              <>
                <StarOff className="size-4" /> Unpin major product
              </>
            ) : (
              <>
                <Star className="size-4" /> Pin as major product
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={toggleActive}>
            {product.isActive ? (
              <>
                <Archive className="size-4" /> Archive
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" /> Restore
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <ProductDialog
          product={toEditable(product)}
          groups={groups}
          categories={categories}
          open={editOpen}
          onOpenChange={setEditOpen}
          trigger={null}
        />
      )}
    </>
  );
}
