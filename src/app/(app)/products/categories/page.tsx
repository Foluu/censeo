import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FolderTree, SlidersHorizontal, Tags } from "lucide-react";
import { getCategoryGroups, getCategoryTree } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { CategoryGroupCard } from "@/components/categories/category-group-card";
import { CategoryGroupDialog } from "@/components/categories/category-group-dialog";
import { CategoryTemplates } from "@/components/categories/category-templates";
import { CategoryTreeManager } from "@/components/categories/category-tree-manager";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const { tab } = await searchParams;
  const active = tab === "attributes" ? "attributes" : "categories";
  const [tree, groups] = await Promise.all([getCategoryTree(), getCategoryGroups()]);

  const tabs = [
    { id: "categories", label: "Categories", icon: FolderTree, count: tree.length },
    { id: "attributes", label: "Attributes", icon: SlidersHorizontal, count: groups.length },
  ];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/products">
          <ArrowLeft className="size-4" /> Products
        </Link>
      </Button>

      <PageHeader
        title={active === "categories" ? "Categories" : "Attributes"}
        description={
          active === "categories"
            ? "Organise products into categories and sub-categories, e.g. Phones › Apple › iPhone."
            : "Describe products with attributes like Colour, Storage or Grade — and decide which categories each applies to."
        }
      >
        {active === "attributes" && <CategoryGroupDialog categories={tree} />}
      </PageHeader>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/40 p-1 sm:inline-grid sm:w-auto">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "categories" ? "/products/categories" : "/products/categories?tab=attributes"}
            aria-current={active === t.id ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                active === t.id ? "bg-black/10" : "bg-muted"
              )}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {active === "categories" ? (
        <FadeIn>
          <CategoryTreeManager tree={tree} />
        </FadeIn>
      ) : (
        <>
          <CategoryTemplates existing={groups.map((g) => g.name)} />
          {groups.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No attributes yet"
              description="Start from a quick-start template above, or create your own. Then tag products from the product editor."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {groups.map((group, i) => (
                <FadeIn key={group.id} delay={i * 0.04}>
                  <CategoryGroupCard
                    group={group}
                    categories={tree}
                    isFirst={i === 0}
                    isLast={i === groups.length - 1}
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
