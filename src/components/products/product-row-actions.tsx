"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { toggleProductActive } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDialog, type EditableProduct } from "./product-dialog";

type ProductRow = {
  productId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  reorderLevel: number;
  isActive: boolean;
  isSerialTracked: boolean;
  requiresExpiry: boolean;
  isService: boolean;
};

export function ProductRowActions({ product }: { product: ProductRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();

  const editable: EditableProduct = {
    id: product.productId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    unitPrice: product.unitPrice,
    costPrice: product.costPrice,
    reorderLevel: product.reorderLevel,
    isSerialTracked: product.isSerialTracked,
    requiresExpiry: product.requiresExpiry,
    isService: product.isService,
  };

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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
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
          product={editable}
          open={editOpen}
          onOpenChange={setEditOpen}
          trigger={null}
        />
      )}
    </>
  );
}
