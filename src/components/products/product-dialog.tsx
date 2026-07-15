"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditableProduct = ProductInput & { id: string };

const blank: ProductInput = {
  sku: "",
  name: "",
  description: "",
  category: "General",
  unitPrice: 0,
  costPrice: 0,
  reorderLevel: 10,
  isSerialTracked: false,
  requiresExpiry: false,
  isService: false,
};

export function ProductDialog({
  product,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  product?: EditableProduct;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductInput>(product ?? blank);

  const editing = !!product;

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (form.sku.trim().length < 2) return toast.error("Enter a SKU");
    if (form.name.trim().length < 2) return toast.error("Enter a product name");

    startTransition(async () => {
      const result = editing
        ? await updateProduct(product.id, form)
        : await createProduct(form);
      if (result.ok) {
        toast.success(editing ? "Product updated" : "Product created");
        if (!editing) setForm(blank);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const flags: { key: "isSerialTracked" | "requiresExpiry" | "isService"; label: string }[] = [
    { key: "isSerialTracked", label: "Serial number tracking" },
    { key: "requiresExpiry", label: "Expiry date required" },
    { key: "isService", label: "Service item (no stock)" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="font-semibold">
              <Plus className="size-4" /> New product
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "Create product"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-sku">SKU</Label>
              <Input
                id="p-sku"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="BAB-005"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cat">Category</Label>
              <Input
                id="p-cat"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Skincare"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-name">Product name</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Babaria Aloe Vera Gel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Description</Label>
            <Input
              id="p-desc"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">Unit price (₦)</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cost">Cost price (₦)</Label>
              <Input
                id="p-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => set("costPrice", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-reorder">Reorder level</Label>
              <Input
                id="p-reorder"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border/60 bg-background/40 p-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Tracking rules
            </Label>
            {flags.map((flag) => (
              <label
                key={flag.key}
                className="flex cursor-pointer items-center gap-2.5 text-sm"
              >
                <Checkbox
                  checked={!!form[flag.key]}
                  onCheckedChange={(checked) => set(flag.key, checked === true)}
                />
                {flag.label}
              </label>
            ))}
          </div>

          <Button onClick={submit} disabled={pending} className="w-full font-semibold">
            {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
