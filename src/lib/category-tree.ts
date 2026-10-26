/**
 * Pure helpers for the product category tree (safe on server and client).
 * Categories nest via parentId, e.g. Phones › Apple › iPhone.
 */

export const MAX_CATEGORY_DEPTH = 4; // Phones › Apple › iPhone › Pro Max

export type CategoryRecord = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  description?: string | null;
};

export type CategoryNode = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  depth: number; // 0 = top level
  path: string; // "Phones › Apple"
  ancestorIds: string[]; // root first, excluding self
  childCount: number;
  /** Products directly in this category. */
  ownProducts: number;
  /** Products in this category and everything under it. */
  totalProducts: number;
};

export const PATH_SEPARATOR = " › ";

/**
 * Returns the tree flattened in display order (each parent followed by its
 * children), with depth, path and product counts filled in.
 */
export function buildCategoryTree(
  records: CategoryRecord[],
  productCounts: Map<string, number> = new Map()
): CategoryNode[] {
  const children = new Map<string | null, CategoryRecord[]>();
  for (const r of records) {
    const key = r.parentId ?? null;
    children.set(key, [...(children.get(key) ?? []), r]);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const out: CategoryNode[] = [];
  const visit = (parentId: string | null, depth: number, ancestors: CategoryRecord[]) => {
    for (const r of children.get(parentId) ?? []) {
      if (ancestors.some((a) => a.id === r.id)) continue; // guard against cycles
      const node: CategoryNode = {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        parentId: r.parentId,
        sortOrder: r.sortOrder,
        depth,
        path: [...ancestors.map((a) => a.name), r.name].join(PATH_SEPARATOR),
        ancestorIds: ancestors.map((a) => a.id),
        childCount: children.get(r.id)?.length ?? 0,
        ownProducts: productCounts.get(r.id) ?? 0,
        totalProducts: 0,
      };
      out.push(node);
      visit(r.id, depth + 1, [...ancestors, r]);
    }
  };
  visit(null, 0, []);

  // Roll product counts up to every ancestor.
  const byId = new Map(out.map((n) => [n.id, n]));
  for (const n of out) {
    n.totalProducts += n.ownProducts;
    for (const a of n.ancestorIds) {
      const anc = byId.get(a);
      if (anc) anc.totalProducts += n.ownProducts;
    }
  }
  return out;
}

/** The category and every category beneath it. */
export function subtreeIds(tree: CategoryNode[], id: string): string[] {
  return tree.filter((n) => n.id === id || n.ancestorIds.includes(id)).map((n) => n.id);
}

/** Root-first ids for a category, including itself. */
export function lineageIds(tree: CategoryNode[], id: string | null | undefined): string[] {
  if (!id) return [];
  const node = tree.find((n) => n.id === id);
  return node ? [...node.ancestorIds, node.id] : [];
}

/**
 * Does an attribute with these `appliesTo` category ids apply to a product in
 * `categoryId`? Applies when unrestricted, or when the product's category or
 * any of its parents is listed.
 */
export function appliesToCategory(
  appliesTo: string[],
  tree: CategoryNode[],
  categoryId: string | null | undefined
) {
  if (appliesTo.length === 0) return true;
  const lineage = lineageIds(tree, categoryId);
  return lineage.some((id) => appliesTo.includes(id));
}
