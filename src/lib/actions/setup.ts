"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

const setupSchema = z
  .object({
    setupCode: z.string().trim(),
    businessName: z.string().trim().min(2, "Enter your business name").max(80),
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
    warehouseName: z.string().trim().min(2, "Name your first store or warehouse").max(60),
    warehouseCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "Warehouse code must be 2–8 characters")
      .max(8, "Warehouse code must be 2–8 characters")
      .regex(/^[A-Z0-9-]+$/, "Warehouse code: letters, numbers or dashes"),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export type SetupState = { error?: string };

function codeMatches(given: string) {
  const expected = process.env.SETUP_CODE;
  if (!expected) return true; // no code configured
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Creates the first admin, the business profile and the first warehouse.
 * Only works while there are no users, so it can't be used to take over an
 * account once the client has set up.
 */
export async function completeSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  if (!codeMatches(data.setupCode)) return { error: "That setup code isn't right." };

  let user;
  try {
    user = await db.$transaction(async (tx) => {
      if ((await tx.user.count()) > 0) throw new Error("ALREADY_SET_UP");
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: "ADMIN",
          passwordHash: await bcrypt.hash(data.password, 10),
        },
      });
      await tx.businessProfile.upsert({
        where: { id: "default" },
        create: { id: "default", name: data.businessName },
        update: { name: data.businessName },
      });
      await tx.warehouse.create({
        data: { code: data.warehouseCode, name: data.warehouseName },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SET_UP") {
      return { error: "This workspace is already set up. Sign in instead." };
    }
    console.error(error);
    return { error: "Setup failed. Please try again." };
  }

  await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
  redirect("/dashboard?welcome=1");
}
