import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { needsSetup } from "@/lib/queries";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your workspace" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // One-time page: once an account exists, it's just a sign-in.
  if (!(await needsSetup())) redirect("/login");

  return (
    <main className="relative flex min-h-screen flex-1 justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="glow-amber flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <Boxes className="size-7 text-amber-950" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome to <span className="text-gradient-amber">CountBook</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your workspace — it takes a minute. You&apos;ll be the admin and can
              add your team, products and stock right after.
            </p>
          </div>
        </div>

        <SetupForm requireCode={!!process.env.SETUP_CODE} />
      </div>
    </main>
  );
}
