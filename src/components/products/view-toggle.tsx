"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

/** Table ↔ catalogue grid switch (tablet/desktop; phones always get cards). */
export function ViewToggle({ view }: { view: "table" | "grid" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(next: "table" | "grid") {
    const qs = new URLSearchParams(params.toString());
    if (next === "table") qs.delete("view");
    else qs.set("view", next);
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const options = [
    { value: "table" as const, label: "Table", icon: List },
    { value: "grid" as const, label: "Catalogue", icon: LayoutGrid },
  ];

  return (
    <div className="hidden h-9 items-center rounded-lg border border-border bg-background/40 p-0.5 md:flex">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => select(option.value)}
          aria-pressed={view === option.value}
          className={cn(
            "flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
            view === option.value
              ? "bg-primary/15 font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <option.icon className="size-4" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
