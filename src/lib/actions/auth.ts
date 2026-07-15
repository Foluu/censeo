"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Compare against a dummy hash when the user is unknown so response
  // timing does not reveal which emails exist.
  const hash =
    user?.passwordHash ??
    "$2b$10$CwTycUXWue0Thq9StjUM0uJ8ZLGzM3rQx1bU3P1eF3hI6yq7pW9Ei";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid || !user.isActive) {
    return { error: "Invalid email or password" };
  }

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
