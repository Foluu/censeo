"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createCategoryGroup } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";

const TEMPLATES = [
  { name: "Colour", multiSelect: true, options: ["Black", "White", "Blue", "Red", "Gold"] },
  { name: "Storage", multiSelect: false, options: ["64GB", "128GB", "256GB", "512GB"] },
  { name: "Size", multiSelect: false, options: ["Small", "Medium", "Large"] },
  { name: "Brand", multiSelect: false, options: [] },
  { name: "Condition", multiSelect: false, options: ["New", "Refurbished", "Used"] },
];

/** One-tap starters so a new user doesn't face a blank page. */
export function CategoryTemplates({ existing }: { existing: string[] }) {
  const [pending, startTransition] = useTransition();
  const available = TEMPLATES.filter(
    (t) => !existing.some((name) => name.toLowerCase() === t.name.toLowerCase())
  );
  if (available.length === 0) return null;

  function add(template: (typeof TEMPLATES)[number]) {
    startTransition(async () => {
      const result = await createCategoryGroup({
        name: template.name,
        multiSelect: template.multiSelect,
        options: template.options,
      });
      if (result.ok) toast.success(`“${template.name}” added — edit it to fit your products`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" /> Quick start:
      </span>
      {available.map((template) => (
        <Button
          key={template.name}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => add(template)}
          className="rounded-full"
        >
          + {template.name}
        </Button>
      ))}
    </div>
  );
}
