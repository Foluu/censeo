"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { failure, requireSession, type ActionResult } from "@/lib/actions/guard";

const receiptSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  warehouseId: z.string().min(1, "Select a warehouse"),
  supplierId: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitCost: z.number().nonnegative(),
  date: z.coerce.date(),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]).default("COMPLETED"),
});

export type ReceiptInput = z.input<typeof receiptSchema>;

export async function receiveStock(input: ReceiptInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = receiptSchema.parse(input);

    await db.$transaction(async (tx) => {
      const receipt = await tx.stockReceipt.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          supplierId: data.supplierId || null,
          quantity: data.quantity,
          unitCost: data.unitCost,
          date: data.date,
          status: data.status,
          createdById: session.userId,
        },
      });

      // Only completed receipts hit the stock ledger.
      if (data.status === "COMPLETED") {
        await tx.stockMovement.create({
          data: {
            productId: data.productId,
            warehouseId: data.warehouseId,
            type: "RECEIPT",
            quantity: data.quantity,
            reference: receipt.id,
            createdById: session.userId,
            createdAt: data.date,
          },
        });
      }
    });

    for (const path of ["/inventory", "/dashboard", "/products", "/reports"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
