"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createCategoryGroup,
  updateCategoryGroup,
  type CategoryGroupInput,
} from "@/lib/actions/categories";
import type { CategoryGroupData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FormState = Required<Omit<CategoryGroupInput, "description">> & {
  description: string;
  options: string;
};

const blank: FormState = {
  name: "",
  description: "",
  multiSelect: false,
  isRequired: false,
  isFilterable: true,
  appliesTo: [],
  options: "",
};

export function CategoryGroupDialog({
  group,
  mainCategories,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: {
  group?: CategoryGroupData;
  mainCategories: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode | null;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [pending, startTransition] = useTransition();
  const editing = !!group;
  const [form, setForm] = useState<FormState>(
    group
      ? {
          name: group.name,
          description: group.description,
          multiSelect: group.multiSelect,
          isRequired: group.isRequired,
          isFilterable: group.isFilterable,
          appliesTo: group.appliesTo,
          options: "",
        }
      : blank
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleApplies(category: string) {
    set(
      "appliesTo",
      form.appliesTo.includes(category)
        ? form.appliesTo.filter((c) => c !== category)
        : [...form.appliesTo, category]
    );
  }

  function submit() {
    if (!form.name.trim()) return toast.error("Give the category a name");
    const { options, ...rest } = form;
    startTransition(async () => {
      const result = editing
        ? await updateCategoryGroup(group.id, rest)
        : await createCategoryGroup({
            ...rest,
            options: options.split(/[,\n]/),
          });
      if (result.ok) {
        toast.success(editing ? "Category updated" : "Category created");
        if (!editing) setForm(blank);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const rules: {
    key: "isRequired" | "isFilterable";
    title: string;
    detail: string;
  }[] = [
    {
      key: "isRequired",
      title: "Required",
      detail: "Every product it applies to must have an option picked.",
    },
    {
      key: "isFilterable",
      title: "Show as a filter",
      detail: "Offer these options in the Products page filters.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="font-semibold">
              <Plus className="size-4" /> New category
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit “${group.name}”` : "New category"}</DialogTitle>
          <DialogDescription>
            A category is a way to group products — like Colour, Storage or Size.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cg-name">Name</Label>
            <Input
              id="cg-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Colour, Storage, Size"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cg-desc">Description</Label>
            <Input
              id="cg-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional"
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="cg-options">Options</Label>
              <Input
                id="cg-options"
                value={form.options}
                onChange={(e) => set("options", e.target.value)}
                placeholder="Black, White, Blue"
              />
              <p className="text-xs text-muted-foreground">
                Separate with commas. You can add more later.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Products can have</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, title: "One option", detail: "e.g. Storage: 128GB" },
                { value: true, title: "Several options", detail: "e.g. Colours: Red, Blue" },
              ].map((choice) => (
                <button
                  key={String(choice.value)}
                  type="button"
                  onClick={() => set("multiSelect", choice.value)}
                  aria-pressed={form.multiSelect === choice.value}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    form.multiSelect === choice.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="block text-sm font-medium">{choice.title}</span>
                  <span className="block text-xs text-muted-foreground">{choice.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40">
            {rules.map((rule) => (
              <label key={rule.key} className="flex cursor-pointer items-center gap-3 p-3">
                <span className="flex-1">
                  <span className="block text-sm font-medium">{rule.title}</span>
                  <span className="block text-xs text-muted-foreground">{rule.detail}</span>
                </span>
                <Switch
                  checked={form[rule.key]}
                  onCheckedChange={(checked) => set(rule.key, checked)}
                />
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Applies to</Label>
            <p className="text-xs text-muted-foreground">
              Limit this category to certain main categories. Leave all unselected
              to use it for every product.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("appliesTo", [])}
                className={cn(
                  "min-h-8 rounded-full border px-3 text-sm transition-colors",
                  form.appliesTo.length === 0
                    ? "border-primary bg-primary/15 font-medium"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All products
              </button>
              {[...new Set([...mainCategories, ...form.appliesTo])].map((category) => {
                const on = form.appliesTo.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleApplies(category)}
                    aria-pressed={on}
                    className={cn(
                      "min-h-8 rounded-full border px-3 text-sm transition-colors",
                      on
                        ? "border-primary bg-primary/15 font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : editing ? "Save changes" : "Create category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
