import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getSaleReceipt } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { ReceiptActions } from "@/components/sales/receipt-actions";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Bank transfer",
  ONLINE: "Online",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSaleReceipt(id);
  return { title: data ? `Receipt ${data.sale.reference}` : "Receipt" };
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSaleReceipt(id);
  if (!data) notFound();

  const { business, sale } = data;
  const units = sale.items.reduce((sum, i) => sum + i.quantity, 0);
  const contact = [business.phone, business.email, business.website].filter(Boolean);
  const summary = [
    `${business.name} — Receipt ${sale.reference}`,
    format(sale.date, "d MMM yyyy"),
    ...sale.items.map((i) => `${i.quantity}× ${i.name} — ${formatNaira(i.lineTotal, true)}`),
    `Total: ${formatNaira(sale.total, true)}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-xl">
      <ReceiptActions
        reference={sale.reference}
        businessName={business.name}
        summary={summary}
      />

      {/* The receipt itself is always "paper": dark ink on white, in any theme. */}
      <article className="relative overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl shadow-black/20 print:rounded-none print:shadow-none">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600 print:hidden" />

        <div className="space-y-6 p-6 sm:p-8">
          {/* Business header */}
          <header className="text-center">
            <h2 className="text-xl font-bold tracking-tight">{business.name}</h2>
            {business.tagline && (
              <p className="mt-0.5 text-sm text-zinc-500">{business.tagline}</p>
            )}
            {business.address && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-zinc-600">
                {business.address}
              </p>
            )}
            {contact.length > 0 && (
              <p className="mt-1 text-xs text-zinc-600">{contact.join(" · ")}</p>
            )}
            {business.taxId && (
              <p className="mt-1 text-xs text-zinc-500">TIN / RC: {business.taxId}</p>
            )}
          </header>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 border-t border-dashed border-zinc-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sales receipt
            </span>
            <div className="h-px flex-1 border-t border-dashed border-zinc-300" />
          </div>

          {/* Meta */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Receipt no.</dt>
              <dd className="font-mono font-semibold">{sale.reference}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-zinc-500">Date</dt>
              <dd className="font-medium">{format(sale.date, "d MMM yyyy")}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Billed to</dt>
              <dd className="font-medium">{sale.customer.name}</dd>
              {sale.customer.phone && (
                <dd className="text-xs text-zinc-600">{sale.customer.phone}</dd>
              )}
              {sale.customer.email && (
                <dd className="break-all text-xs text-zinc-600">{sale.customer.email}</dd>
              )}
            </div>
            <div className="text-right">
              <dt className="text-xs text-zinc-500">Payment</dt>
              <dd className="font-medium">
                {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
              </dd>
              {sale.status !== "COMPLETED" && (
                <dd className="mt-0.5 text-xs font-semibold uppercase text-red-600">
                  {sale.status.toLowerCase()}
                </dd>
              )}
            </div>
          </dl>

          {/* Items */}
          <div>
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-zinc-200 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>Item</span>
              <span className="text-right">Amount</span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {sale.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[1fr_auto] gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{item.name}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      {item.quantity} × {formatNaira(item.unitPrice, true)}
                      <span className="ml-2 font-mono">{item.sku}</span>
                    </p>
                  </div>
                  <p className="text-right font-medium tabular-nums">
                    {formatNaira(item.lineTotal, true)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t border-zinc-200 pt-4 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Items</span>
              <span className="tabular-nums">{units}</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatNaira(sale.total, true)}
              </span>
            </div>
          </div>

          <footer className="space-y-1 border-t border-dashed border-zinc-300 pt-4 text-center text-xs text-zinc-500">
            <p>
              {sale.warehouse.name}
              {sale.warehouse.location ? ` · ${sale.warehouse.location}` : ""}
              {sale.servedBy ? ` · Served by ${sale.servedBy}` : ""}
            </p>
            <p className="font-medium text-zinc-700">
              {business.receiptFooter || "Thank you for your business!"}
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
