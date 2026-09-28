import type { Metadata } from "next";
import { format } from "date-fns";
import { Search, Users } from "lucide-react";
import { getCustomers } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { NewCustomerDialog } from "@/components/customers/new-customer-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await getCustomers(q);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone you sell to, with lifetime value at a glance."
      >
        <NewCustomerDialog />
      </PageHeader>

      <FadeIn>
        <Card className="glass">
          <CardContent className="pt-6">
            <form className="mb-4 md:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search customers…"
                  type="search"
                  className="h-10 pl-9 md:h-9"
                />
              </div>
            </form>

            {customers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={q ? "No customers match your search" : "No customers yet"}
                description="Customers appear here when you add them or record sales."
              />
            ) : (
              <>
              <ul className="divide-y divide-border/60 md:hidden">
                {customers.map((customer) => (
                  <li key={customer.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {customer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{customer.name}</p>
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="block truncate text-xs text-primary"
                        >
                          {customer.phone}
                        </a>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">
                          {customer.email ?? "No contact details"}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatNaira(customer.lifetimeValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.orders} {customer.orders === 1 ? "order" : "orders"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Since</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Lifetime value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.phone ?? "—"}
                        </TableCell>
                        <TableCell>
                          {format(customer.createdAt, "MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {customer.orders}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatNaira(customer.lifetimeValue)}
                        </TableCell>
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
