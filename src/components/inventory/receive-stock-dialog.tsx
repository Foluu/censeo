"use client";

import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { receiveStock } from "@/lib/actions/inventory";
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

type Options = {
  products: { id: string; name: string; sku: string }[];
  warehouses: { id: string; code: string; name: string }[];
  suppliers: { id: string; name: string }[];
};

export function ReceiveStockDialog({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("COMPLETED");

  function submit() {
    if (!productId) return toast.error("Select a product");
    if (!warehouseId) return toast.error("Select a warehouse");
    if (quantity < 1) return toast.error("Quantity must be at least 1");

    startTransition(async () => {
      const result = await receiveStock({
        productId,
        warehouseId,
        supplierId: supplierId || undefined,
        quantity,
        unitCost,
        date: new Date(date),
        status: status as "COMPLETED" | "PENDING" | "CANCELLED",
      });
      if (result.ok) {
        toast.success("Stock received into warehouse");
        setOpen(false);
        setProductId("");
        setSupplierId("");
        setQuantity(1);
        setUnitCost(0);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">
          <PackagePlus className="size-4" /> Receive stock
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product…" />
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

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional…" />
                </SelectTrigger>
                <SelectContent>
                  {options.suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rcv-qty">Quantity</Label>
              <Input
                id="rcv-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcv-cost">Unit cost (₦)</Label>
              <Input
                id="rcv-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcv-date">Date</Label>
              <Input
                id="rcv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED">
                  Completed — add to stock now
                </SelectItem>
                <SelectItem value="PENDING">Pending — record only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={submit} disabled={pending} className="w-full font-semibold">
            {pending ? "Saving…" : "Receive stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
