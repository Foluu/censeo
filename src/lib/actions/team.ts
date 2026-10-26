"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ActionError,
  failure,
  requireSession,
  type ActionResult,
} from "@/lib/actions/guard";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's name").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: z.enum(["ADMIN", "STAFF"]),
  password,
});

const updateSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's name").max(80),
  role: z.enum(["ADMIN", "STAFF"]),
});

export type CreateMemberInput = z.input<typeof createSchema>;
export type UpdateMemberInput = z.input<typeof updateSchema>;

function revalidateTeam() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Refuses changes that would leave the business with no active admin. */
async function assertKeepsAnAdmin(userId: string) {
  const otherAdmins = await db.user.count({
    where: { role: "ADMIN", isActive: true, id: { not: userId } },
  });
  if (otherAdmins === 0) {
    throw new ActionError("You need at least one other active admin first.");
  }
}

export async function createMember(input: CreateMemberInput): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = createSchema.parse(input);
    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
    });
    revalidateTeam();
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(new ActionError("Someone already uses that email address."));
    }
    return failure(error);
  }
}

export async function updateMember(
  id: string,
  input: UpdateMemberInput
): Promise<ActionResult> {
  try {
    const session = await requireSession(true);
    const data = updateSchema.parse(input);
    if (data.role !== "ADMIN") {
      if (id === session.userId) throw new ActionError("You can't remove your own admin access.");
      await assertKeepsAnAdmin(id);
    }
    await db.user.update({ where: { id }, data });
    revalidateTeam();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function resetMemberPassword(id: string, newPassword: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    const parsed = password.parse(newPassword);
    await db.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed, 10) },
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setMemberActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession(true);
    if (!active) {
      if (id === session.userId) throw new ActionError("You can't deactivate your own account.");
      await assertKeepsAnAdmin(id);
    }
    await db.user.update({ where: { id }, data: { isActive: active } });
    revalidateTeam();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Deletes an account. Anyone with sales, stock or transfer history is
 * deactivated instead, so their name stays on past records.
 */
export async function deleteMember(
  id: string
): Promise<ActionResult & { outcome?: "deleted" | "deactivated" }> {
  try {
    const session = await requireSession(true);
    if (id === session.userId) throw new ActionError("You can't delete your own account.");
    await assertKeepsAnAdmin(id);

    const user = await db.user.findUnique({
      where: { id },
      select: {
        _count: { select: { sales: true, receipts: true, movements: true, transfers: true } },
      },
    });
    if (!user) throw new ActionError("That account no longer exists.");
    const history = Object.values(user._count).some((n) => n > 0);

    if (history) {
      await db.user.update({ where: { id }, data: { isActive: false } });
    } else {
      await db.user.delete({ where: { id } });
    }
    revalidateTeam();
    return { ok: true, outcome: history ? "deactivated" : "deleted" };
  } catch (error) {
    return failure(error);
  }
}
