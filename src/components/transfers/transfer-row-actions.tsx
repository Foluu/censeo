"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cancelTransfer, completeTransfer } from "@/lib/actions/transfers";
import { Button } from "@/components/ui/button";

export function TransferRowActions({ transferId }: { transferId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: "complete" | "cancel") {
    startTransition(async () => {
      const result =
        action === "complete"
          ? await completeTransfer(transferId)
          : await cancelTransfer(transferId);
      if (result.ok) {
        toast.success(
          action === "complete" ? "Transfer completed — stock moved" : "Transfer cancelled"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("complete")}
        className="h-8 border-success/40 text-success hover:bg-success/10 hover:text-success"
      >
        <Check className="size-3.5" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("cancel")}
        className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
