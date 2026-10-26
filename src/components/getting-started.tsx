import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = { key: string; label: string; href: string; done: boolean };

/** Checklist shown to admins on a new workspace until every step is done. */
export function GettingStarted({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Card className="glass border-primary/30">
      <CardHeader className="flex flex-row items-center gap-2">
        <Rocket className="size-4 text-primary" />
        <CardTitle className="flex-1 text-base">Getting started</CardTitle>
        <span className="text-sm text-muted-foreground tabular-nums">
          {done} of {steps.length} done
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
        <ol className="divide-y divide-border/60">
          {steps.map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary"
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={cn("flex-1", step.done && "text-muted-foreground line-through")}>
                  {step.label}
                </span>
                {!step.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
