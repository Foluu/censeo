"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { requestTransfer } from "@/lib/actions/transfers";
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
};

export function NewTransferDialog({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [quantity, setQuantity] = useState(1);

  function submit() {
    if (!productId) return toast.error("Select a product");
    if (!fromId || !toId) return toast.error("Select both warehouses");
    if (fromId === toId) return toast.error("Source and destination must differ");
    if (quantity < 1) return toast.error("Quantity must be at least 1");

    startTransition(async () => {
      const result = await requestTransfer({
        productId,
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        quantity,
      });
      if (result.ok) {
        toast.success("Transfer requested");
        setOpen(false);
        setProductId("");
        setFromId("");
        setToId("");
        setQuantity(1);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">
          <ArrowLeftRight className="size-4" /> Request transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request stock transfer</DialogTitle>
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
              <Label>From</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger>
                  <SelectValue placeholder="Source…" />
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
              <Label>To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination…" />
                </SelectTrigger>
                <SelectContent>
                  {options.warehouses
                    .filter((w) => w.id !== fromId)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-qty">Quantity</Label>
            <Input
              id="t-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <Button onClick={submit} disabled={pending} className="w-full font-semibold">
            {pending ? "Requesting…" : "Request transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
