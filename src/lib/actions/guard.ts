import { db } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/session";

export class ActionError extends Error {}

/**
 * Every mutation re-checks the session server-side (defense in depth),
 * including that the account still exists and hasn't been deactivated —
 * session tokens live for 7 days, so the token alone isn't enough.
 */
export async function requireSession(adminOnly = false): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ActionError("You must be signed in.");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true, role: true },
  });
  if (!user?.isActive) throw new ActionError("Your account is no longer active.");
  // Use the current role, not the one baked into the token.
  if (adminOnly && user.role !== "ADMIN") {
    throw new ActionError("Only administrators can perform this action.");
  }
  return { ...session, role: user.role };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export function failure(error: unknown): ActionResult {
  if (error instanceof ActionError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
