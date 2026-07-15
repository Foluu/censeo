import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  COMPLETED: "border-transparent bg-success/15 text-success",
  PENDING: "border-transparent bg-warning/15 text-warning",
  CANCELLED: "border-transparent bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", STYLES[status] ?? "")}
    >
      {status.toLowerCase()}
    </Badge>
  );
}
