"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ActionError,
  failure,
  requireSession,
  type ActionResult,
} from "@/lib/actions/guard";

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name").max(80),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional(),
});

export type SupplierInput = z.input<typeof supplierSchema>;

function revalidateSuppliers() {
  revalidatePath("/settings");
  revalidatePath("/inventory");
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = supplierSchema.parse(input);
    await db.supplier.create({
      data: { name: data.name, email: data.email || null, phone: data.phone || null },
    });
    revalidateSuppliers();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = supplierSchema.parse(input);
    await db.supplier.update({
      where: { id },
      data: { name: data.name, email: data.email || null, phone: data.phone || null },
    });
    revalidateSuppliers();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Suppliers already on stock receipts are kept so the history stays intact. */
export async function deleteSupplier(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const receipts = await db.stockReceipt.count({ where: { supplierId: id } });
    if (receipts > 0) {
      throw new ActionError(
        `This supplier is on ${receipts} stock receipts, so it can't be deleted. Rename it instead.`
      );
    }
    await db.supplier.delete({ where: { id } });
    revalidateSuppliers();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
