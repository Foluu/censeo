"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { createCategoryOption } from "@/lib/actions/categories";
import type { CategoryGroupData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PickerGroup = Pick<
  CategoryGroupData,
  "id" | "name" | "multiSelect" | "isRequired" | "appliesTo"
> & { options: { id: string; name: string; color: string | null }[] };

export function groupAppliesTo(group: { appliesTo: string[] }, mainCategory: string) {
  return (
    group.appliesTo.length === 0 ||
    group.appliesTo.some((c) => c.toLowerCase() === mainCategory.trim().toLowerCase())
  );
}

/** Returns the name of the first required group left empty, if any. */
export function missingRequiredGroup(
  groups: PickerGroup[],
  mainCategory: string,
  selected: string[]
) {
  const chosen = new Set(selected);
  return groups.find(
    (g) =>
      g.isRequired &&
      groupAppliesTo(g, mainCategory) &&
      !g.options.some((o) => chosen.has(o.id))
  )?.name;
}

function AddOption({
  groupId,
  onAdded,
}: {
  groupId: string;
  onAdded: (option: NewOption) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return setAdding(false);
    startTransition(async () => {
      const result = await createCategoryOption(groupId, { name: name.trim() });
      if (result.ok && result.option) {
        onAdded(result.option);
        setName("");
        setAdding(false);
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
      >
        <Plus className="size-3.5" /> Add
      </button>
    );
  }
  return (
    <Input
      autoFocus
      value={name}
      disabled={pending}
      onChange={(e) => setName(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") setAdding(false);
      }}
      placeholder="New option"
      className="h-8 w-32 rounded-full text-xs md:text-xs"
    />
  );
}

type NewOption = { id: string; name: string; color: string | null };

export function CategoryPicker({
  groups,
  mainCategory,
  value,
  onChange,
  onOptionAdded,
}: {
  groups: PickerGroup[];
  mainCategory: string;
  value: string[];
  onChange: (optionIds: string[]) => void;
  onOptionAdded: (groupId: string, option: NewOption) => void;
}) {
  const applicable = groups.filter((g) => groupAppliesTo(g, mainCategory));
  const selected = new Set(value);

  function toggle(group: PickerGroup, optionId: string) {
    const next = new Set(value);
    if (next.has(optionId)) {
      next.delete(optionId);
    } else {
      if (!group.multiSelect) group.options.forEach((o) => next.delete(o.id));
      next.add(optionId);
    }
    onChange([...next]);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Categories
        </Label>
        <Link
          href="/products/categories"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Settings2 className="size-3.5" /> Manage
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Group products by colour, size, storage or anything else.{" "}
          <Link href="/products/categories" className="font-medium text-primary hover:underline">
            Create your first category
          </Link>
          .
        </p>
      ) : applicable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories apply to “{mainCategory || "this main category"}”.
        </p>
      ) : (
        applicable.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-medium">
              {group.name}
              {group.isRequired && <span className="text-destructive"> *</span>}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {group.multiSelect ? "choose any" : "choose one"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const on = selected.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(group, option.id)}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                      on
                        ? "border-primary bg-primary/15 font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {on ? (
                      <Check className="size-3.5 text-primary" />
                    ) : option.color ? (
                      <span
                        className="size-3 rounded-full border border-black/10"
                        style={{ background: option.color }}
                      />
                    ) : null}
                    {option.name}
                  </button>
                );
              })}
              <AddOption
                groupId={group.id}
                onAdded={(option) => {
                  onOptionAdded(group.id, option);
                  toggle({ ...group, options: [...group.options, option] }, option.id);
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
