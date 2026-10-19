"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { AVATAR_COLORS } from "@/lib/avatar";
import { failure, requireSession, type ActionResult } from "@/lib/actions/guard";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  // A client-resized photo (≈20–60 KB). Capped well below the action body limit.
  avatarUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Unsupported image")
    .max(400_000, "Image is too large")
    .nullable(),
  avatarColor: z.enum(Object.keys(AVATAR_COLORS) as [string, ...string[]]),
});

export type ProfileInput = z.input<typeof profileSchema>;

/** Users can edit their own display name and avatar. */
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = profileSchema.parse(input);
    const user = await db.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    // The name is carried in the session token, so re-issue it.
    await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
