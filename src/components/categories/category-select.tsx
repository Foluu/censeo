"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createCategory } from "@/lib/actions/category-tree";
import { MAX_CATEGORY_DEPTH, type CategoryNode } from "@/lib/category-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

/**
 * Pick a category from the tree. Optionally lets the user create a new
 * category (top-level or under the current one) without leaving the form.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  allowNone = true,
  noneLabel = "Uncategorized",
  excludeIds = [],
  allowCreate = false,
  onCreated,
  placeholder = "Choose a category…",
  id,
}: {
  categories: CategoryNode[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  /** Hide these (e.g. a category and its children when moving it). */
  excludeIds?: string[];
  allowCreate?: boolean;
  onCreated?: (node: { id: string; name: string; parentId: string | null }) => void;
  placeholder?: string;
  id?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = categories.filter((c) => !excludeIds.includes(c.id));
  const selected = categories.find((c) => c.id === value);

  function startCreate() {
    // Default the new category under the currently selected one, if it can nest.
    setParentId(selected && selected.depth + 1 < MAX_CATEGORY_DEPTH ? selected.id : null);
    setName("");
    setCreating(true);
  }

  function create() {
    if (!name.trim()) return toast.error("Enter a category name");
    startTransition(async () => {
      const result = await createCategory({ name, parentId });
      if (result.ok && result.id) {
        onCreated?.({ id: result.id, name: name.trim(), parentId });
        onChange(result.id);
        setCreating(false);
        toast.success(`“${name.trim()}” created`);
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select
          value={value ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? null : v)}
        >
          <SelectTrigger id={id} className="h-10 min-w-0 flex-1 md:h-9">
            <SelectValue placeholder={placeholder}>
              {selected ? selected.path : value === null && allowNone ? noneLabel : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {allowNone && (
              <>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">{noneLabel}</span>
                </SelectItem>
                {options.length > 0 && <SelectSeparator />}
              </>
            )}
            {options.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span style={{ paddingLeft: `${c.depth * 0.9}rem` }} className="flex items-center gap-1.5">
                  {c.depth > 0 && <span className="text-muted-foreground">└</span>}
                  <span className={c.depth === 0 ? "font-medium" : undefined}>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allowCreate && !creating && (
          <Button type="button" variant="outline" className="h-10 shrink-0 md:h-9" onClick={startCreate}>
            <Plus className="size-4" /> <span className="max-sm:sr-only">New</span>
          </Button>
        )}
      </div>

      {creating && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">New category</p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="e.g. Apple, Chargers, Leather cases"
            className="h-10 md:h-9"
          />
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">Inside</span>
            <div className="min-w-0 flex-1">
              <CategorySelect
                categories={categories.filter((c) => c.depth + 1 < MAX_CATEGORY_DEPTH)}
                value={parentId}
                onChange={setParentId}
                noneLabel="Top level (no parent)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              <X className="size-4" /> Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={create}>
              <Check className="size-4" /> {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
