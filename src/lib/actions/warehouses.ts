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

const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code must be 2–8 characters")
    .max(8, "Code must be 2–8 characters")
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers or dashes"),
  name: z.string().trim().min(2, "Enter a name").max(60),
  location: z.string().trim().max(120).optional(),
});

export type WarehouseInput = z.input<typeof warehouseSchema>;

function revalidateWarehouses() {
  // Warehouses appear in every stock/sales form and report.
  revalidatePath("/", "layout");
}

function duplicateCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return failure(new ActionError("Another warehouse already uses that code."));
  }
  return failure(error);
}

export async function createWarehouse(input: WarehouseInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = warehouseSchema.parse(input);
    await db.warehouse.create({ data: { ...data, location: data.location || null } });
    revalidateWarehouses();
    return { ok: true };
  } catch (error) {
    return duplicateCode(error);
  }
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = warehouseSchema.parse(input);
    await db.warehouse.update({
      where: { id },
      data: { ...data, location: data.location || null },
    });
    revalidateWarehouses();
    return { ok: true };
  } catch (error) {
    return duplicateCode(error);
  }
}

/** Only warehouses with no stock, sales or transfer history can be deleted. */
export async function deleteWarehouse(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const warehouse = await db.warehouse.findUnique({
      where: { id },
      select: {
        name: true,
        _count: {
          select: {
            movements: true,
            sales: true,
            receipts: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });
    if (!warehouse) throw new ActionError("That warehouse no longer exists.");
    if (Object.values(warehouse._count).some((n) => n > 0)) {
      throw new ActionError(
        `${warehouse.name} has stock or sales history, so it can't be deleted. Rename it instead, or transfer its stock out.`
      );
    }
    if ((await db.warehouse.count()) <= 1) {
      throw new ActionError("You need at least one warehouse.");
    }
    await db.warehouse.delete({ where: { id } });
    revalidateWarehouses();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
