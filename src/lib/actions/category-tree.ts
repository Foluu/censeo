"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  buildCategoryTree,
  MAX_CATEGORY_DEPTH,
  subtreeIds,
} from "@/lib/category-tree";
import {
  ActionError,
  failure,
  requireSession,
  type ActionResult,
} from "@/lib/actions/guard";

type Tx = Prisma.TransactionClient;

const nameSchema = z.string().trim().min(1, "Enter a name").max(60, "Keep it under 60 characters");
const descriptionSchema = z.string().trim().max(200).optional();

async function loadTree(tx: Tx) {
  const records = await tx.category.findMany({
    select: { id: true, name: true, parentId: true, sortOrder: true, description: true },
  });
  return buildCategoryTree(records);
}

/** Sibling names must be unique (case-insensitive), including at top level. */
async function assertUniqueName(tx: Tx, name: string, parentId: string | null, exceptId?: string) {
  const clash = await tx.category.findFirst({
    where: {
      parentId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId && { id: { not: exceptId } }),
    },
    select: { id: true },
  });
  if (clash) {
    throw new ActionError(
      parentId ? `There's already a “${name}” in that category.` : `There's already a top-level “${name}”.`
    );
  }
}

/** Keeps each product's denormalised top-level category name in sync. */
async function syncProductCategoryNames(tx: Tx) {
  const tree = await loadTree(tx);
  for (const root of tree.filter((n) => n.depth === 0)) {
    await tx.product.updateMany({
      where: { categoryId: { in: subtreeIds(tree, root.id) }, NOT: { category: root.name } },
      data: { category: root.name },
    });
  }
  await tx.product.updateMany({
    where: { categoryId: null, NOT: { category: "Uncategorized" } },
    data: { category: "Uncategorized" },
  });
}

function revalidateCategories() {
  revalidatePath("/products", "layout");
  revalidatePath("/inventory");
  revalidatePath("/reports");
}

export async function createCategory(input: {
  name: string;
  parentId?: string | null;
  description?: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    await requireSession(true);
    const name = nameSchema.parse(input.name);
    const description = descriptionSchema.parse(input.description);
    const parentId = input.parentId || null;

    const id = await db.$transaction(async (tx) => {
      if (parentId) {
        const tree = await loadTree(tx);
        const parent = tree.find((n) => n.id === parentId);
        if (!parent) throw new ActionError("That parent category no longer exists.");
        if (parent.depth + 1 >= MAX_CATEGORY_DEPTH) {
          throw new ActionError(`Categories can be nested up to ${MAX_CATEGORY_DEPTH} levels deep.`);
        }
      }
      await assertUniqueName(tx, name, parentId);
      const last = await tx.category.aggregate({ where: { parentId }, _max: { sortOrder: true } });
      const created = await tx.category.create({
        data: { name, parentId, description: description || null, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      return created.id;
    });
    revalidateCategories();
    return { ok: true, id };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCategory(
  id: string,
  input: { name: string; description?: string }
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const name = nameSchema.parse(input.name);
    const description = descriptionSchema.parse(input.description);
    await db.$transaction(async (tx) => {
      const current = await tx.category.findUnique({ where: { id }, select: { parentId: true } });
      if (!current) throw new ActionError("That category no longer exists.");
      await assertUniqueName(tx, name, current.parentId, id);
      await tx.category.update({ where: { id }, data: { name, description: description || null } });
      await syncProductCategoryNames(tx);
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Moves a category (with everything under it) to a new parent, or to the top level. */
export async function moveCategory(id: string, newParentId: string | null): Promise<ActionResult> {
  try {
    await requireSession(true);
    await db.$transaction(async (tx) => {
      const tree = await loadTree(tx);
      const node = tree.find((n) => n.id === id);
      if (!node) throw new ActionError("That category no longer exists.");
      const subtree = subtreeIds(tree, id);
      if (newParentId && subtree.includes(newParentId)) {
        throw new ActionError("A category can't be moved inside itself.");
      }
      const parentDepth = newParentId ? (tree.find((n) => n.id === newParentId)?.depth ?? 0) : -1;
      const height = Math.max(...tree.filter((n) => subtree.includes(n.id)).map((n) => n.depth - node.depth));
      if (parentDepth + 1 + height >= MAX_CATEGORY_DEPTH) {
        throw new ActionError(`That would nest categories more than ${MAX_CATEGORY_DEPTH} levels deep.`);
      }
      await assertUniqueName(tx, node.name, newParentId, id);
      const last = await tx.category.aggregate({ where: { parentId: newParentId }, _max: { sortOrder: true } });
      await tx.category.update({
        where: { id },
        data: { parentId: newParentId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      await syncProductCategoryNames(tx);
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Swaps a category with its neighbour among its siblings. */
export async function reorderCategory(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    await requireSession(true);
    await db.$transaction(async (tx) => {
      const node = await tx.category.findUnique({ where: { id }, select: { parentId: true } });
      if (!node) throw new ActionError("That category no longer exists.");
      const siblings = await tx.category.findMany({
        where: { parentId: node.parentId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true },
      });
      const index = siblings.findIndex((s) => s.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= siblings.length) return;
      [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
      for (const [i, s] of siblings.entries()) {
        await tx.category.update({ where: { id: s.id }, data: { sortOrder: i } });
      }
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Deletes a category. Its products and sub-categories move up to its parent
 * (or become uncategorised / top-level), so nothing is lost.
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    await db.$transaction(async (tx) => {
      const node = await tx.category.findUnique({
        where: { id },
        select: { parentId: true, children: { select: { id: true, name: true } } },
      });
      if (!node) throw new ActionError("That category no longer exists.");
      for (const child of node.children) {
        await assertUniqueName(tx, child.name, node.parentId, child.id);
      }
      await tx.category.updateMany({ where: { parentId: id }, data: { parentId: node.parentId } });
      await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: node.parentId } });
      // Drop it from any attribute "applies to" lists.
      const groups = await tx.categoryGroup.findMany({
        where: { appliesTo: { has: id } },
        select: { id: true, appliesTo: true },
      });
      for (const g of groups) {
        await tx.categoryGroup.update({
          where: { id: g.id },
          data: { appliesTo: g.appliesTo.filter((c) => c !== id) },
        });
      }
      await tx.category.delete({ where: { id } });
      await syncProductCategoryNames(tx);
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
