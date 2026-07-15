"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createCustomer } from "@/lib/actions/customers";
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

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function submit() {
    if (name.trim().length < 2) return toast.error("Enter the customer's name");
    startTransition(async () => {
      const result = await createCustomer({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (result.ok) {
        toast.success("Customer added");
        setName("");
        setEmail("");
        setPhone("");
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
          <UserPlus className="size-4" /> New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Full name / business name</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HealthPlus Pharmacy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button onClick={submit} disabled={pending} className="w-full font-semibold">
            {pending ? "Saving…" : "Add customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
