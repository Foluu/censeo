import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
