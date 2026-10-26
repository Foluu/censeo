"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Option = { value: string; label: string; color?: string | null };

export type FilterField =
  | {
      type: "select";
      key: string;
      label: string;
      options: Option[];
      /** Value meaning "no filter"; kept out of the URL. */
      defaultValue: string;
      /** Don't render an active chip (e.g. sort order). */
      hideChip?: boolean;
    }
  | { type: "date"; key: string; label: string }
  | {
      /** Toggle chips grouped under headings; stored as repeated ?key=… params. */
      type: "chips";
      key: string;
      label: string;
      groups: { id: string; label: string; options: Option[] }[];
    };

type Draft = Record<string, string | string[]>;

function readDraft(fields: FilterField[], params: URLSearchParams): Draft {
  const draft: Draft = {};
  for (const field of fields) {
    if (field.type === "chips") draft[field.key] = params.getAll(field.key);
    else if (field.type === "select")
      draft[field.key] = params.get(field.key) ?? field.defaultValue;
    else draft[field.key] = params.get(field.key) ?? "";
  }
  return draft;
}

export function FilterBar({
  fields,
  searchPlaceholder = "Search…",
  children,
}: {
  fields: FilterField[];
  searchPlaceholder?: string;
  /** Extra controls rendered beside the Filters button (e.g. view toggle). */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => readDraft(fields, params));
  const firstRender = useRef(true);

  function navigate(next: URLSearchParams) {
    next.delete("new");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Debounced live search.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      if (next.toString() !== params.toString()) navigate(next);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function openSheet() {
    setDraft(readDraft(fields, params));
    setSheetOpen(true);
  }

  function apply(values: Draft) {
    const next = new URLSearchParams(params.toString());
    for (const field of fields) {
      next.delete(field.key);
      const value = values[field.key];
      if (field.type === "chips") {
        for (const v of value as string[]) next.append(field.key, v);
      } else if (field.type === "select") {
        if (value && value !== field.defaultValue) next.set(field.key, value as string);
      } else if (value) {
        next.set(field.key, value as string);
      }
    }
    navigate(next);
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString());
    for (const field of fields) next.delete(field.key);
    navigate(next);
    setSheetOpen(false);
  }

  function removeChip(key: string, value?: string) {
    const next = new URLSearchParams(params.toString());
    if (value === undefined) next.delete(key);
    else next.delete(key, value);
    navigate(next);
  }

  // Active filters, as removable chips.
  const chips = useMemo(() => {
    const out: { id: string; label: string; key: string; value?: string }[] = [];
    for (const field of fields) {
      if (field.type === "chips") {
        for (const value of params.getAll(field.key)) {
          for (const group of field.groups) {
            const option = group.options.find((o) => o.value === value);
            if (option)
              out.push({
                id: `${field.key}:${value}`,
                label: `${group.label}: ${option.label}`,
                key: field.key,
                value,
              });
          }
        }
      } else if (field.type === "select") {
        const value = params.get(field.key);
        if (!value || value === field.defaultValue || field.hideChip) continue;
        const option = field.options.find((o) => o.value === value);
        out.push({
          id: field.key,
          // Drop tree indentation / counts used inside the dropdown.
          label: `${field.label}: ${(option?.label ?? value).replace(/^[\s └]+/, "").replace(/ \(\d+\)$/, "")}`,
          key: field.key,
        });
      } else {
        const value = params.get(field.key);
        if (value) out.push({ id: field.key, label: `${field.label}: ${value}`, key: field.key });
      }
    }
    return out;
  }, [fields, params]);

  const activeCount = chips.length;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          {pending ? (
            <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9 md:h-9"
            enterKeyHint="search"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={openSheet}
          className="relative h-10 shrink-0 md:h-9"
        >
          <SlidersHorizontal className="size-4" />
          <span className="max-sm:sr-only">Filters</span>
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground max-sm:absolute max-sm:-right-1.5 max-sm:-top-1.5">
              {activeCount}
            </span>
          )}
        </Button>
        {children}
      </div>

      {activeCount > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeChip(chip.key, chip.value)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-2 text-xs font-medium text-foreground transition-colors hover:bg-primary/20"
            >
              {chip.label}
              <X className="size-3.5 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "glass-strong gap-0",
            isMobile
              ? "max-h-[88dvh] rounded-t-3xl pb-safe"
              : "w-full sm:max-w-md"
          )}
        >
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow down what you see.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {fields.map((field) => {
              if (field.type === "select") {
                return (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Select
                      value={draft[field.key] as string}
                      onValueChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (field.type === "date") {
                return (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`f-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`f-${field.key}`}
                      type="date"
                      className="h-10"
                      value={draft[field.key] as string}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                      }
                    />
                  </div>
                );
              }
              const selected = new Set(draft[field.key] as string[]);
              return (
                <div key={field.key} className="space-y-4">
                  {field.groups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <Label>{group.label}</Label>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((option) => {
                          const on = selected.has(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setDraft((d) => {
                                  const set = new Set(d[field.key] as string[]);
                                  if (on) set.delete(option.value);
                                  else set.add(option.value);
                                  return { ...d, [field.key]: [...set] };
                                })
                              }
                              className={cn(
                                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                                on
                                  ? "border-primary bg-primary/15 font-medium text-foreground"
                                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {option.color && (
                                <span
                                  className="size-3 rounded-full border border-black/10"
                                  style={{ background: option.color }}
                                />
                              )}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <SheetFooter className="flex-row gap-2 border-t border-border/60">
            <Button variant="outline" className="h-11 flex-1" onClick={clearAll}>
              Reset
            </Button>
            <Button
              className="h-11 flex-1 font-semibold"
              onClick={() => {
                apply(draft);
                setSheetOpen(false);
              }}
            >
              Show results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
