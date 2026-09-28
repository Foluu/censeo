import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Tags } from "lucide-react";
import { getCategoryGroups, getMainCategories } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { CategoryGroupCard } from "@/components/categories/category-group-card";
import { CategoryGroupDialog } from "@/components/categories/category-group-dialog";
import { CategoryTemplates } from "@/components/categories/category-templates";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const [groups, mainCategories] = await Promise.all([
    getCategoryGroups(),
    getMainCategories(),
  ]);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/products">
          <ArrowLeft className="size-4" /> Products
        </Link>
      </Button>

      <PageHeader
        title="Categories"
        description="Create your own ways to group products — colour, storage, size, anything — and set the rules for each."
      >
        <CategoryGroupDialog mainCategories={mainCategories} />
      </PageHeader>

      <CategoryTemplates existing={groups.map((g) => g.name)} />

      {groups.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Start from a quick-start template above, or create your own. Then tag products from the product editor."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group, i) => (
            <FadeIn key={group.id} delay={i * 0.04}>
              <CategoryGroupCard
                group={group}
                mainCategories={mainCategories}
                isFirst={i === 0}
                isLast={i === groups.length - 1}
              />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
