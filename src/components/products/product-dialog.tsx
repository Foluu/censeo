"use client";

import { useState, useTransition } from "react";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/actions/products";
import type { CategoryGroupData } from "@/lib/queries";
import type { CategoryNode } from "@/lib/category-tree";
import { CategorySelect } from "@/components/categories/category-select";
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
import { Switch } from "@/components/ui/switch";
import { CategoryPicker, missingRequiredGroup } from "./category-picker";

export type EditableProduct = ProductInput & { id: string };

type FormState = Required<Pick<ProductInput, "optionIds" | "isFeatured">> & ProductInput;

const blank: FormState = {
  sku: "",
  name: "",
  description: "",
  categoryId: null,
  unitPrice: 0,
  costPrice: 0,
  reorderLevel: 10,
  isSerialTracked: false,
  requiresExpiry: false,
  isService: false,
  isFeatured: false,
  optionIds: [],
};

export function ProductDialog({
  product,
  groups,
  categories,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  product?: EditableProduct;
  groups: CategoryGroupData[];
  categories: CategoryNode[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(
    product ? { ...blank, ...product } : blank
  );

  // Local copy so options added inline in the picker are known here too.
  const [localGroups, setLocalGroups] = useState(groups);

  const editing = !!product;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (form.sku.trim().length < 2) return toast.error("Enter a SKU");
    if (form.name.trim().length < 2) return toast.error("Enter a product name");
    const missing = missingRequiredGroup(localGroups, categories, form.categoryId ?? null, form.optionIds);
    if (missing) return toast.error(`Choose an option for “${missing}”`);

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
          <div className="space-y-2">
            <Label htmlFor="p-sku">SKU</Label>
            <Input
              id="p-sku"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="BAB-005"
              autoCapitalize="characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-cat">Category</Label>
            <CategorySelect
              id="p-cat"
              categories={categories}
              value={form.categoryId ?? null}
              onChange={(id) => set("categoryId", id)}
              allowCreate
            />
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">Unit price (₦)</Label>
              <Input
                id="p-price"
                type="number"
                inputMode="decimal"
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
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => set("costPrice", Number(e.target.value))}
              />
            </div>
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="p-reorder">Reorder level</Label>
              <Input
                id="p-reorder"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", Number(e.target.value))}
              />
            </div>
          </div>

          <CategoryPicker
            groups={localGroups}
            onOptionAdded={(groupId, option) =>
              setLocalGroups((prev) =>
                prev.map((g) =>
                  g.id === groupId
                    ? { ...g, options: [...g.options, { ...option, productCount: 0 }] }
                    : g
                )
              )
            }
            tree={categories}
            categoryId={form.categoryId ?? null}
            value={form.optionIds}
            onChange={(ids) => set("optionIds", ids)}
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
            <Star className="size-4 shrink-0 text-primary" />
            <span className="flex-1">
              <span className="block text-sm font-medium">Major product</span>
              <span className="block text-xs text-muted-foreground">
                Pin to the Products dropdown in the sidebar
              </span>
            </span>
            <Switch
              checked={form.isFeatured}
              onCheckedChange={(checked) => set("isFeatured", checked)}
            />
          </label>

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

          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
