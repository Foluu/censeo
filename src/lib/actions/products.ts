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
});

export type ProductInput = z.input<typeof productSchema>;

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = productSchema.parse(input);
    await db.product.create({ data });
    revalidatePath("/products");
    revalidatePath("/inventory");
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
    const data = productSchema.parse(input);
    await db.product.update({ where: { id }, data });
    revalidatePath("/products");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
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
    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
