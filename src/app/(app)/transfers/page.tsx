import type { Metadata } from "next";
import { format } from "date-fns";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { getFormOptions, getTransfers } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { NewTransferDialog } from "@/components/transfers/new-transfer-dialog";
import { TransferRowActions } from "@/components/transfers/transfer-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Transfers" };

export default async function TransfersPage() {
  const [transfers, options, session] = await Promise.all([
    getTransfers(),
    getFormOptions(),
    getSession(),
  ]);
  const isAdmin = session?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Stock transfers"
        description="Move inventory between warehouses with a full audit trail."
      >
        <NewTransferDialog options={options} />
      </PageHeader>

      <FadeIn>
        <Card className="glass">
          <CardContent className="pt-6">
            {transfers.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No transfers yet"
                description="Request a transfer to move stock between warehouses."
              />
            ) : (
              <>
              <ul className="divide-y divide-border/60 md:hidden">
                {transfers.map((transfer) => (
                  <li key={transfer.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{transfer.product}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(transfer.createdAt, "d MMM yyyy")} · {transfer.requestedBy}
                        </p>
                      </div>
                      <StatusBadge status={transfer.status} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        {transfer.from}
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        {transfer.to}
                        <span className="ml-1 text-muted-foreground tabular-nums">
                          × {transfer.quantity}
                        </span>
                      </span>
                      {isAdmin && transfer.status === "PENDING" && (
                        <TransferRowActions transferId={transfer.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Requested by</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="w-32" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(transfer.createdAt, "d MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{transfer.product}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {transfer.sku}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {transfer.quantity}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {transfer.from}
                            <ArrowRight className="size-3.5 text-muted-foreground" />
                            {transfer.to}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-36 truncate">
                          {transfer.requestedBy}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={transfer.status} />
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {transfer.status === "PENDING" && (
                              <TransferRowActions transferId={transfer.id} />
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
