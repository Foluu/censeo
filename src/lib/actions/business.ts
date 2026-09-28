"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { failure, requireSession, type ActionResult } from "@/lib/actions/guard";

const optional = (max: number) => z.string().trim().max(max).optional();

const businessSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(80),
  tagline: optional(120),
  address: optional(240),
  phone: optional(40),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
  website: optional(120),
  taxId: optional(40),
  receiptFooter: optional(240),
});

export type BusinessProfileInput = z.input<typeof businessSchema>;

export async function updateBusinessProfile(
  input: BusinessProfileInput
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const parsed = businessSchema.parse(input);
    const data = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value || null])
    ) as Record<keyof typeof parsed, string | null> & { name: string };
    await db.businessProfile.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
    revalidatePath("/settings");
    revalidatePath("/sales", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
