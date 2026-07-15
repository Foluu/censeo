"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { failure, requireSession, type ActionResult } from "@/lib/actions/guard";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
  phone: z.string().trim().max(32).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult & { customerId?: string }> {
  try {
    await requireSession();
    const data = customerSchema.parse(input);
    const customer = await db.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      },
    });
    revalidatePath("/customers");
    revalidatePath("/sales");
    return { ok: true, customerId: customer.id };
  } catch (error) {
    return failure(error);
  }
}
