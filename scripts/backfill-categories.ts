/**
 * One-off, idempotent upgrade to the category tree. Safe to run on every start.
 *   1. Products without a category node get one from their old text category
 *      (created as a top-level category if needed).
 *   2. Attribute "applies to" lists that still hold category *names* are
 *      converted to category ids.
 *   3. Each product's denormalised `category` text is re-synced to its
 *      top-level category name.
 *
 * Run manually: npx tsx scripts/backfill-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  let changes = 0;

  // 1. Link products to category nodes.
  const unlinked = await db.product.groupBy({
    by: ["category"],
    where: { categoryId: null },
    _count: true,
  });
  for (const { category } of unlinked) {
    const name = category.trim();
    if (!name || name === "Uncategorized") continue;
    let node = await db.category.findFirst({ where: { parentId: null, name } });
    if (!node) {
      const last = await db.category.aggregate({ where: { parentId: null }, _max: { sortOrder: true } });
      node = await db.category.create({ data: { name, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    }
    const { count } = await db.product.updateMany({
      where: { categoryId: null, category },
      data: { categoryId: node.id },
    });
    changes += count;
  }

  // 2. appliesTo: names → ids.
  const categories = await db.category.findMany({ select: { id: true, name: true, parentId: true } });
  const ids = new Set(categories.map((c) => c.id));
  const topByName = new Map(categories.filter((c) => !c.parentId).map((c) => [c.name.toLowerCase(), c.id]));
  for (const group of await db.categoryGroup.findMany({ select: { id: true, appliesTo: true } })) {
    if (group.appliesTo.every((v) => ids.has(v))) continue;
    const converted = [
      ...new Set(
        group.appliesTo
          .map((v) => (ids.has(v) ? v : topByName.get(v.toLowerCase())))
          .filter((v): v is string => !!v)
      ),
    ];
    await db.categoryGroup.update({ where: { id: group.id }, data: { appliesTo: converted } });
    changes++;
  }

  // 3. Re-sync denormalised top-level names.
  const parent = new Map(categories.map((c) => [c.id, c.parentId]));
  const name = new Map(categories.map((c) => [c.id, c.name]));
  const rootOf = (id: string) => {
    let cur = id;
    for (let i = 0; i < 20 && parent.get(cur); i++) cur = parent.get(cur)!;
    return cur;
  };
  const byRoot = new Map<string, string[]>();
  for (const c of categories) byRoot.set(rootOf(c.id), [...(byRoot.get(rootOf(c.id)) ?? []), c.id]);
  for (const [root, members] of byRoot) {
    const { count } = await db.product.updateMany({
      where: { categoryId: { in: members }, NOT: { category: name.get(root)! } },
      data: { category: name.get(root)! },
    });
    changes += count;
  }
  const { count: orphans } = await db.product.updateMany({
    where: { categoryId: null, NOT: { category: "Uncategorized" } },
    data: { category: "Uncategorized" },
  });
  changes += orphans;

  console.log(changes ? `[categories] Upgraded ${changes} records to the category tree.` : "[categories] Category tree up to date.");
}

main()
  .catch((e) => {
    console.error("[categories] Backfill failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
