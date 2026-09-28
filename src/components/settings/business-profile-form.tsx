"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateBusinessProfile,
  type BusinessProfileInput,
} from "@/lib/actions/business";
import type { BusinessProfileData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: {
  key: keyof BusinessProfileInput;
  label: string;
  placeholder: string;
  type?: string;
  wide?: boolean;
}[] = [
  { key: "name", label: "Business name", placeholder: "Acme Distribution Ltd", wide: true },
  { key: "tagline", label: "Tagline", placeholder: "Wholesale skincare & pharma", wide: true },
  { key: "address", label: "Address", placeholder: "12 Allen Avenue, Ikeja, Lagos", wide: true },
  { key: "phone", label: "Phone", placeholder: "+234 800 000 0000", type: "tel" },
  { key: "email", label: "Email", placeholder: "hello@acme.ng", type: "email" },
  { key: "website", label: "Website", placeholder: "acme.ng" },
  { key: "taxId", label: "TIN / RC number", placeholder: "RC 1234567" },
  {
    key: "receiptFooter",
    label: "Receipt footer",
    placeholder: "Thank you for your business! Goods sold are not returnable.",
    wide: true,
  },
];

export function BusinessProfileForm({
  profile,
  canEdit,
}: {
  profile: BusinessProfileData;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<BusinessProfileInput>(profile);
  const [pending, startTransition] = useTransition();

  function save() {
    if ((form.name ?? "").trim().length < 2) return toast.error("Enter your business name");
    startTransition(async () => {
      const result = await updateBusinessProfile(form);
      if (result.ok) toast.success("Business details saved");
      else toast.error(result.error);
    });
  }

  return (
    <Card className="glass max-w-2xl">
      <CardHeader className="flex flex-row items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <CardTitle className="text-base">Business details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Printed at the top of every customer receipt.{" "}
          <Link href="/sales" className="font-medium text-primary hover:underline">
            Open a sale
          </Link>{" "}
          to preview one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
              <Label htmlFor={`biz-${field.key}`}>{field.label}</Label>
              <Input
                id={`biz-${field.key}`}
                type={field.type ?? "text"}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                disabled={!canEdit}
                className="h-10 md:h-9"
              />
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button onClick={save} disabled={pending} className="w-full font-semibold sm:w-auto">
            {pending ? "Saving…" : "Save business details"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only administrators can change business details.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
