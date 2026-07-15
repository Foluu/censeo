"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSale } from "@/lib/actions/sales";
import { createCustomer } from "@/lib/actions/customers";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Options = {
  products: { id: string; name: string; sku: string; unitPrice: number }[];
  warehouses: { id: string; code: string; name: string }[];
  customers: { id: string; name: string }[];
};

type Line = { productId: string; quantity: number; unitPrice: number };

const emptyLine: Line = { productId: "", quantity: 1, unitPrice: 0 };

export function NewSaleDialog({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [lines]
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = options.products.find((p) => p.id === productId);
    updateLine(index, {
      productId,
      unitPrice: product?.unitPrice ?? 0,
    });
  }

  function reset() {
    setCustomerMode("existing");
    setCustomerId("");
    setCustomerName("");
    setWarehouseId("");
    setPaymentMethod("CASH");
    setDate(new Date().toISOString().slice(0, 10));
    setLines([{ ...emptyLine }]);
  }

  function submit() {
    if (!warehouseId) return toast.error("Select a warehouse");
    if (customerMode === "existing" && !customerId)
      return toast.error("Select a customer");
    if (customerMode === "new" && customerName.trim().length < 2)
      return toast.error("Enter the customer's name");
    if (lines.some((l) => !l.productId))
      return toast.error("Every line needs a product");
    if (lines.some((l) => l.quantity < 1))
      return toast.error("Quantities must be at least 1");

    startTransition(async () => {
      // "New customer" entries become real customer records first.
      let resolvedCustomerId = customerMode === "existing" ? customerId : "";
      if (customerMode === "new") {
        const created = await createCustomer({ name: customerName.trim() });
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        resolvedCustomerId = created.customerId ?? "";
      }

      const result = await createSale({
        warehouseId,
        customerId: resolvedCustomerId || undefined,
        customerName: undefined,
        paymentMethod: paymentMethod as "CASH" | "CARD" | "TRANSFER" | "ONLINE",
        date: new Date(date),
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      if (result.ok) {
        toast.success("Sale recorded — stock updated");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">
          <Plus className="size-4" /> New sale
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Tabs
              value={customerMode}
              onValueChange={(v) => setCustomerMode(v as "existing" | "new")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing customer</TabsTrigger>
                <TabsTrigger value="new">New customer</TabsTrigger>
              </TabsList>
            </Tabs>
            {customerMode === "existing" ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {options.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            )}
          </div>

          {/* Warehouse / date / payment */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {options.warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-date">Date</Label>
              <Input
                id="sale-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
              >
                <Plus className="size-3.5" /> Add line
              </Button>
            </div>

            {lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_80px_110px_36px] items-end gap-2 rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <Select
                    value={line.productId}
                    onValueChange={(v) => selectProduct(index, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose product…" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Unit price (₦)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(index, { unitPrice: Number(e.target.value) })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total + submit */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatNaira(total, true)}
            </span>
          </div>

          <Button
            onClick={submit}
            disabled={pending}
            className="w-full font-semibold"
          >
            {pending ? "Recording…" : "Record sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
