"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ActionError,
  failure,
  requireSession,
  type ActionResult,
} from "@/lib/actions/guard";

const productSchema = z.object({
  sku: z.string().trim().min(2, "SKU is required").max(32),
  name: z.string().trim().min(2, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(1, "Category is required").max(60),
  unitPrice: z.number().nonnegative("Price cannot be negative"),
  costPrice: z.number().nonnegative("Cost cannot be negative"),
  reorderLevel: z.number().int().nonnegative(),
  isSerialTracked: z.boolean().default(false),
  requiresExpiry: z.boolean().default(false),
  isService: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  optionIds: z.array(z.string().min(1)).max(200).default([]),
});

export type ProductInput = z.input<typeof productSchema>;

/**
 * Enforces the rules configured on each category group: options must belong
 * to groups that apply to this product's main category, single-select groups
 * take at most one option, and required groups need at least one.
 */
async function validateOptions(mainCategory: string, optionIds: string[]) {
  const groups = await db.categoryGroup.findMany({
    include: { options: { select: { id: true } } },
  });
  const applies = (appliesTo: string[]) =>
    appliesTo.length === 0 ||
    appliesTo.some((c) => c.toLowerCase() === mainCategory.toLowerCase());

  const selected = new Set(optionIds);
  const valid: string[] = [];
  for (const group of groups) {
    const chosen = group.options.filter((o) => selected.has(o.id)).map((o) => o.id);
    if (!applies(group.appliesTo)) continue; // silently drop options for groups that don't apply
    if (!group.multiSelect && chosen.length > 1) {
      throw new ActionError(`Choose only one option for “${group.name}”.`);
    }
    if (group.isRequired && chosen.length === 0) {
      throw new ActionError(`“${group.name}” is required for this product.`);
    }
    valid.push(...chosen);
  }
  return valid;
}

function revalidateProducts() {
  revalidatePath("/products", "layout");
  revalidatePath("/inventory");
  // The sidebar's major-products list lives in the shared app layout.
  revalidatePath("/", "layout");
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const { optionIds, ...data } = productSchema.parse(input);
    const valid = await validateOptions(data.category, optionIds);
    await db.product.create({
      data: {
        ...data,
        categories: { create: valid.map((optionId) => ({ optionId })) },
      },
    });
    revalidateProducts();
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure(new ActionError("A product with this SKU already exists."));
    }
    return failure(error);
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const { optionIds, ...data } = productSchema.parse(input);
    const valid = await validateOptions(data.category, optionIds);
    await db.$transaction([
      db.productCategory.deleteMany({ where: { productId: id } }),
      db.product.update({
        where: { id },
        data: {
          ...data,
          categories: { create: valid.map((optionId) => ({ optionId })) },
        },
      }),
    ]);
    revalidateProducts();
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure(new ActionError("A product with this SKU already exists."));
    }
    return failure(error);
  }
}

export async function toggleProductActive(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new ActionError("Product not found.");
    await db.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
    revalidateProducts();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleProductFeatured(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new ActionError("Product not found.");
    await db.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
    });
    revalidateProducts();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
