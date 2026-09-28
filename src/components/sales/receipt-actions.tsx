"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReceiptActions({
  reference,
  businessName,
  summary,
}: {
  reference: string;
  businessName: string;
  summary: string;
}) {
  async function share() {
    const data = {
      title: `${businessName} — Receipt ${reference}`,
      text: summary,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(`${summary}\n${data.url}`);
        toast.success("Receipt details copied to clipboard");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast.error("Couldn't share this receipt");
      }
    }
  }

  return (
    <div className="mb-5 flex items-center gap-2 print:hidden">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/sales">
          <ArrowLeft className="size-4" /> Sales
        </Link>
      </Button>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={share} className="h-9">
          <Share2 className="size-4" /> Share
        </Button>
        <Button size="sm" onClick={() => window.print()} className="h-9 font-semibold">
          <Printer className="size-4" /> Print
        </Button>
      </div>
    </div>
  );
}
