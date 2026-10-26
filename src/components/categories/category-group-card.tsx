"use client";

import { useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCategoryOption,
  deleteCategoryGroup,
  deleteCategoryOption,
  moveCategoryGroup,
  updateCategoryGroup,
  updateCategoryOption,
} from "@/lib/actions/categories";
import type { CategoryGroupData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CategoryGroupDialog } from "./category-group-dialog";

type Option = CategoryGroupData["options"][number];

function OptionChip({ option }: { option: Option }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [color, setColorState] = useState(option.color);
  const colorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function remove() {
    // Options in use need a second tap so products aren't untagged by accident.
    if (option.productCount > 0 && !confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryOption(option.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  // The native picker streams values while dragging; save once it settles.
  function setColor(next: string) {
    setColorState(next);
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await updateCategoryOption(option.id, { name: option.name, color: next });
        if (!result.ok) toast.error(result.error);
      });
    }, 500);
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background/40 pl-1.5 pr-1 text-sm transition-opacity",
        pending && "opacity-50",
        confirming && "border-destructive/60 bg-destructive/10"
      )}
    >
      <label
        className="relative flex size-6 cursor-pointer items-center justify-center rounded-full"
        title="Set colour swatch"
      >
        <span
          className={cn(
            "size-3.5 rounded-full border",
            color ? "border-black/10" : "border-dashed border-muted-foreground/50"
          )}
          style={color ? { background: color } : undefined}
        />
        <input
          type="color"
          value={color ?? "#9ca3af"}
          onChange={(e) => setColor(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`Colour for ${option.name}`}
        />
      </label>
      <span className="font-medium">{option.name}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{option.productCount}</span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={confirming ? `Confirm removing ${option.name}` : `Remove ${option.name}`}
        className={cn(
          "flex h-7 items-center justify-center rounded-full px-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive",
          confirming && "text-destructive"
        )}
      >
        {confirming ? <span className="px-0.5 text-xs font-medium">Remove?</span> : <X className="size-3.5" />}
      </button>
    </span>
  );
}

function AddOptionForm({ groupId }: { groupId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const names = name.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    startTransition(async () => {
      for (const n of names) {
        const result = await createCategoryOption(groupId, { name: n });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      setName("");
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add options, e.g. Gold, Silver"
        className="h-9"
        disabled={pending}
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending || !name.trim()} className="h-9">
        <Plus className="size-4" /> Add
      </Button>
    </form>
  );
}

export function CategoryGroupCard({
  group,
  mainCategories,
  isFirst,
  isLast,
}: {
  group: CategoryGroupData;
  mainCategories: string[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (success) toast.success(success);
      } else toast.error(result.error ?? "Something went wrong");
    });
  }

  const rules = [
    {
      key: "multiSelect" as const,
      label: "Allow several",
      hint: "Products can have more than one option",
    },
    { key: "isRequired" as const, label: "Required", hint: "Products must have an option" },
    { key: "isFilterable" as const, label: "Filterable", hint: "Show in Products filters" },
  ];

  const usedBy = group.options.reduce((sum, o) => sum + o.productCount, 0);

  return (
    <Card className={cn("glass", pending && "opacity-70")}>
      <CardContent className="space-y-4 pt-6 max-sm:pt-0">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="whitespace-normal text-left">
                {group.appliesTo.length === 0
                  ? "Applies to all products"
                  : `Applies to: ${group.appliesTo.join(", ")}`}
              </Badge>
              <Badge variant="outline">
                {group.options.length} options · {usedBy} tags
              </Badge>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isFirst || pending}
              onClick={() => run(() => moveCategoryGroup(group.id, "up"))}
              aria-label="Move up"
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isLast || pending}
              onClick={() => run(() => moveCategoryGroup(group.id, "down"))}
              aria-label="Move down"
            >
              <ArrowDown className="size-4" />
            </Button>
            <DropdownMenu onOpenChange={(o) => !o && setConfirmDelete(false)}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Category actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit rules & name
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    if (!confirmDelete) {
                      e.preventDefault();
                      setConfirmDelete(true);
                      return;
                    }
                    run(() => deleteCategoryGroup(group.id), `“${group.name}” deleted`);
                  }}
                >
                  <Trash2 className="size-4" />
                  {confirmDelete ? `Tap again to delete (${usedBy} tags)` : "Delete category"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Rules: flip on/off in place */}
        <div className="grid gap-2 sm:grid-cols-3 max-sm:gap-0 max-sm:divide-y max-sm:divide-border/60 max-sm:overflow-hidden max-sm:rounded-xl max-sm:border max-sm:border-border/60 max-sm:bg-background/40">
          {rules.map((rule) => (
            <label
              key={rule.key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:py-2"
              title={rule.hint}
            >
              <span className="flex-1">
                <span className="block text-sm font-medium">{rule.label}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {rule.hint}
                </span>
              </span>
              <Switch
                checked={group[rule.key]}
                disabled={pending}
                onCheckedChange={(checked) =>
                  run(() => updateCategoryGroup(group.id, { [rule.key]: checked }))
                }
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {group.options.map((option) => (
            <OptionChip key={option.id} option={option} />
          ))}
          {group.options.length === 0 && (
            <p className="text-sm text-muted-foreground">No options yet — add some below.</p>
          )}
        </div>

        <AddOptionForm groupId={group.id} />
      </CardContent>

      {editOpen && (
        <CategoryGroupDialog
          group={group}
          mainCategories={mainCategories}
          open={editOpen}
          onOpenChange={setEditOpen}
          trigger={null}
        />
      )}
    </Card>
  );
}
