import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-8 h-72 w-72 rounded-full bg-chart-3/10 blur-3xl" />
        <div className="absolute right-8 top-1/3 h-64 w-64 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="glow-amber flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <Boxes className="size-7 text-amber-950" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="text-gradient-amber">CountBook</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inventory intelligence for your business
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo access — <span className="font-mono">admin@censeo.app</span> /{" "}
          <span className="font-mono">Admin123!</span>
        </p>
      </div>
    </main>
  );
}
