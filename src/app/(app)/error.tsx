"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle, DatabaseZap, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Sits inside (app)/layout.tsx, so the sidebar and topbar stay mounted when a
// page throws — the user can still navigate away instead of losing the whole UI.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server Component errors are redacted in production, so this only narrows
  // the copy in development — the fallback below is accurate either way.
  const isDbDown = /Can't reach database server|PrismaClientInitializationError/i.test(
    error.message
  );

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            {isDbDown ? (
              <DatabaseZap className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {isDbDown ? "Can't reach the database" : "Something went wrong"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isDbDown
                ? "The database server isn't responding. Start it with `npm run db:dev`, then retry — your session and the rest of the app are still fine."
                : "This page failed to load. You can retry, or use the menu to go somewhere else."}
            </p>
          </div>

          <Button onClick={() => unstable_retry()}>
            <RotateCw className="size-4" />
            Try again
          </Button>

          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
