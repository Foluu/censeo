import { getSession, type SessionPayload } from "@/lib/session";

export class ActionError extends Error {}

/** Every mutation re-checks the session server-side (defense in depth). */
export async function requireSession(adminOnly = false): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ActionError("You must be signed in.");
  if (adminOnly && session.role !== "ADMIN") {
    throw new ActionError("Only administrators can perform this action.");
  }
  return session;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export function failure(error: unknown): ActionResult {
  if (error instanceof ActionError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
