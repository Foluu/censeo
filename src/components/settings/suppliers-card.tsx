"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/actions/suppliers";
import type { SupplierSummary } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier?: SupplierSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!supplier;
  const [name, setName] = useState(supplier?.name ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (name.trim().length < 2) return toast.error("Enter the supplier's name");
    startTransition(async () => {
      const input = { name, email: email.trim(), phone };
      const result = editing ? await updateSupplier(supplier.id, input) : await createSupplier(input);
      if (result.ok) {
        toast.success(editing ? "Supplier updated" : `${name.trim()} added`);
        if (!editing) {
          setName("");
          setEmail("");
          setPhone("");
        }
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${supplier.name}` : "Add a supplier"}</DialogTitle>
          <DialogDescription>Who you buy stock from. Pick them when receiving stock.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">Supplier name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Otigba Wholesale" className="h-10 md:h-9" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="h-10 md:h-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className="h-10 md:h-9" />
            </div>
          </div>
          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : editing ? "Save changes" : "Add supplier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SupplierRow({ supplier }: { supplier: SupplierSummary }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if (result.ok) toast.success(`${supplier.name} deleted`);
      else toast.error(result.error);
    });
  }

  const contact = [supplier.phone, supplier.email].filter(Boolean).join(" · ");
  return (
    <li className={`flex items-center gap-3 py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{supplier.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {contact || "No contact details"} · {supplier.receipts} receipts
        </p>
      </div>
      <DropdownMenu onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`Manage ${supplier.name}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-64">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {supplier.receipts > 0 ? (
            <DropdownMenuItem disabled className="whitespace-normal text-xs">
              <Trash2 className="size-4" /> Can&apos;t delete — used on stock receipts
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                if (!confirmDelete) {
                  e.preventDefault();
                  setConfirmDelete(true);
                  return;
                }
                remove();
              }}
            >
              <Trash2 className="size-4" /> {confirmDelete ? "Tap again to delete" : "Delete"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {editing && <SupplierDialog supplier={supplier} open onOpenChange={setEditing} />}
    </li>
  );
}

export function SuppliersCard({ suppliers }: { suppliers: SupplierSummary[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <Truck className="size-4 text-primary" />
        <CardTitle className="flex-1 text-base">Suppliers</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add supplier
        </Button>
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No suppliers yet. Add the people you buy stock from, then pick them when receiving stock.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {suppliers.map((supplier) => (
              <SupplierRow key={supplier.id} supplier={supplier} />
            ))}
          </ul>
        )}
      </CardContent>
      <SupplierDialog open={adding} onOpenChange={setAdding} />
    </Card>
  );
}
