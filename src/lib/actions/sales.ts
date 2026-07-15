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

const saleSchema = z.object({
  warehouseId: z.string().min(1, "Select a warehouse"),
  customerId: z.string().optional(),
  customerName: z.string().trim().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "ONLINE"]),
  date: z.coerce.date(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1, "Add at least one product"),
});

export type SaleInput = z.infer<typeof saleSchema>;

export async function createSale(input: SaleInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = saleSchema.parse(input);

    if (!data.customerId && !data.customerName) {
      throw new ActionError("Choose a customer or enter a name.");
    }

    await db.$transaction(async (tx) => {
      // Verify availability from the ledger before committing anything.
      for (const item of data.items) {
        const agg = await tx.stockMovement.aggregate({
          where: { productId: item.productId, warehouseId: data.warehouseId },
          _sum: { quantity: true },
        });
        const available = agg._sum.quantity ?? 0;
        if (item.quantity > available) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          throw new ActionError(
            `Insufficient stock for ${product?.name ?? "product"}: ${available} available in this warehouse.`
          );
        }
      }

      const count = await tx.sale.count();
      const reference = `CB-${String(count + 1).padStart(5, "0")}`;
      const total = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      await tx.sale.create({
        data: {
          reference,
          warehouseId: data.warehouseId,
          customerId: data.customerId || null,
          customerName: data.customerId ? null : data.customerName || null,
          paymentMethod: data.paymentMethod,
          date: data.date,
          status: "COMPLETED",
          total,
          createdById: session.userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });

      await tx.stockMovement.createMany({
        data: data.items.map((item) => ({
          productId: item.productId,
          warehouseId: data.warehouseId,
          type: "SALE" as const,
          quantity: -item.quantity,
          reference,
          createdById: session.userId,
          createdAt: data.date,
        })),
      });
    });

    for (const path of ["/sales", "/dashboard", "/inventory", "/reports"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
