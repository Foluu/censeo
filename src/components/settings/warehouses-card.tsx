"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/lib/actions/warehouses";
import { formatNumber } from "@/lib/format";
import type { WarehouseSummary } from "@/lib/queries";
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

function WarehouseDialog({
  warehouse,
  open,
  onOpenChange,
}: {
  warehouse?: WarehouseSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!warehouse;
  const [code, setCode] = useState(warehouse?.code ?? "");
  const [name, setName] = useState(warehouse?.name ?? "");
  const [location, setLocation] = useState(warehouse?.location ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (code.trim().length < 2) return toast.error("Enter a short code, e.g. IKJ");
    if (name.trim().length < 2) return toast.error("Enter a name");
    startTransition(async () => {
      const input = { code, name, location };
      const result = editing ? await updateWarehouse(warehouse.id, input) : await createWarehouse(input);
      if (result.ok) {
        toast.success(editing ? "Warehouse updated" : `${name.trim()} added`);
        if (!editing) {
          setCode("");
          setName("");
          setLocation("");
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
          <DialogTitle>{editing ? `Edit ${warehouse.name}` : "Add a warehouse"}</DialogTitle>
          <DialogDescription>
            A store, branch or depot that holds stock. It appears in sales, stock and transfer forms.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="w-code">Code</Label>
              <Input
                id="w-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="IKJ"
                maxLength={8}
                autoCapitalize="characters"
                className="h-10 font-mono uppercase md:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-name">Name</Label>
              <Input
                id="w-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ikeja Branch"
                className="h-10 md:h-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-location">Location</Label>
            <Input
              id="w-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street, area, city (optional)"
              className="h-10 md:h-9"
            />
          </div>
          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : editing ? "Save changes" : "Add warehouse"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WarehouseRow({ warehouse }: { warehouse: WarehouseSummary }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteWarehouse(warehouse.id);
      if (result.ok) toast.success(`${warehouse.name} deleted`);
      else toast.error(result.error);
    });
  }

  return (
    <li className={`flex items-center gap-3 py-3 ${pending ? "opacity-60" : ""}`}>
      <span className="flex h-10 min-w-12 shrink-0 items-center justify-center rounded-xl bg-muted px-2 font-mono text-xs font-semibold">
        {warehouse.code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{warehouse.name}</p>
        {warehouse.location && (
          <p className="truncate text-xs text-muted-foreground">{warehouse.location}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatNumber(warehouse.units)} units in stock · {warehouse.salesCount} sales
        </p>
      </div>
      <DropdownMenu onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`Manage ${warehouse.name}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-64">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {warehouse.hasHistory ? (
            <DropdownMenuItem disabled className="whitespace-normal text-xs">
              <Trash2 className="size-4" /> Can&apos;t delete — it has stock or sales history
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
      {editing && <WarehouseDialog warehouse={warehouse} open onOpenChange={setEditing} />}
    </li>
  );
}

export function WarehousesCard({ warehouses }: { warehouses: WarehouseSummary[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <Warehouse className="size-4 text-primary" />
        <CardTitle className="flex-1 text-base">Warehouses</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add warehouse
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60">
          {warehouses.map((warehouse) => (
            <WarehouseRow key={warehouse.id} warehouse={warehouse} />
          ))}
        </ul>
      </CardContent>
      <WarehouseDialog open={adding} onOpenChange={setAdding} />
    </Card>
  );
}
