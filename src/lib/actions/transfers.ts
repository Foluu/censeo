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

const transferSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    fromWarehouseId: z.string().min(1, "Select a source warehouse"),
    toWarehouseId: z.string().min(1, "Select a destination warehouse"),
    quantity: z.number().int().positive("Quantity must be at least 1"),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination must differ",
    path: ["toWarehouseId"],
  });

export type TransferInput = z.infer<typeof transferSchema>;

async function availableIn(productId: string, warehouseId: string) {
  const agg = await db.stockMovement.aggregate({
    where: { productId, warehouseId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function requestTransfer(input: TransferInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = transferSchema.parse(input);

    const available = await availableIn(data.productId, data.fromWarehouseId);
    if (data.quantity > available) {
      throw new ActionError(
        `Only ${available} unit(s) available in the source warehouse.`
      );
    }

    await db.stockTransfer.create({
      data: { ...data, requestedById: session.userId },
    });
    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function completeTransfer(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession(true);

    await db.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id } });
      if (!transfer) throw new ActionError("Transfer not found.");
      if (transfer.status !== "PENDING") {
        throw new ActionError("This transfer has already been resolved.");
      }

      const agg = await tx.stockMovement.aggregate({
        where: {
          productId: transfer.productId,
          warehouseId: transfer.fromWarehouseId,
        },
        _sum: { quantity: true },
      });
      const available = agg._sum.quantity ?? 0;
      if (transfer.quantity > available) {
        throw new ActionError(
          `Insufficient stock: only ${available} unit(s) left in the source warehouse.`
        );
      }

      const completedAt = new Date();
      await tx.stockMovement.createMany({
        data: [
          {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            type: "TRANSFER_OUT",
            quantity: -transfer.quantity,
            reference: transfer.id,
            createdById: session.userId,
            createdAt: completedAt,
          },
          {
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
            type: "TRANSFER_IN",
            quantity: transfer.quantity,
            reference: transfer.id,
            createdById: session.userId,
            createdAt: completedAt,
          },
        ],
      });
      await tx.stockTransfer.update({
        where: { id },
        data: { status: "COMPLETED", completedAt },
      });
    });

    for (const path of ["/transfers", "/inventory", "/dashboard"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelTransfer(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const transfer = await db.stockTransfer.findUnique({ where: { id } });
    if (!transfer) throw new ActionError("Transfer not found.");
    if (transfer.status !== "PENDING") {
      throw new ActionError("Only pending transfers can be cancelled.");
    }
    await db.stockTransfer.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
