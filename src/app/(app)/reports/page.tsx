import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";
import { getSession } from "@/lib/session";
import { buildReport, isReportId, REPORTS, type ReportCell, type ReportColumn } from "@/lib/reports";
import { formatNaira } from "@/lib/format";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Reports" };

function display(value: ReportCell | null, column: ReportColumn) {
  if (value === null) return "";
  if (typeof value === "number" && column.kind === "money") return formatNaira(value);
  return value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const { type } = await searchParams;
  const active = isReportId(type) ? type : "inventory-summary";
  const report = await buildReport(active);
  const exportHref = (fmt: "csv" | "pdf") => `/api/reports/export?type=${active}&format=${fmt}`;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generated live from the ledger — always current, never stale."
      >
        {/* Plain links: the browser handles the file download. */}
        <Button asChild variant="outline" className="max-sm:flex-1">
          <a href={exportHref("csv")} download>
            <FileSpreadsheet className="size-4" /> Export CSV
          </a>
        </Button>
        <Button asChild className="font-semibold max-sm:flex-1">
          <a href={exportHref("pdf")} download>
            <FileText className="size-4" /> Export PDF
          </a>
        </Button>
      </PageHeader>

      <FadeIn>
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {REPORTS.map((r) => (
            <Link
              key={r.id}
              href={`/reports?type=${r.id}`}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active === r.id
                  ? "border-transparent bg-primary text-primary-foreground shadow"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>

        <p className="mb-3 text-sm text-muted-foreground md:hidden">{report.subtitle}</p>

        {/* Phones: totals first, then one compact card per row */}
        <div className="space-y-2.5 md:hidden">
          {report.footer && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="font-semibold">Totals</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {report.footer.map((value, i) =>
                  i === 0 || value === null ? null : (
                    <div key={i} className="min-w-0">
                      <dt className="truncate text-xs text-muted-foreground">{report.columns[i].label}</dt>
                      <dd className="truncate text-sm font-semibold tabular-nums">
                        {display(value, report.columns[i])}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            </div>
          )}
          {report.rows.map((row, r) => (
            <div key={r} className="glass rounded-2xl p-4">
              <p className="font-medium leading-snug">{row[0]}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {row.slice(1).map((value, j) => {
                  const column = report.columns[j + 1];
                  return (
                    <div key={j} className="min-w-0">
                      <dt className="truncate text-xs text-muted-foreground">{column.label}</dt>
                      <dd
                        className={cn(
                          "truncate text-sm tabular-nums",
                          column.emphasis && "font-semibold",
                          column.tone === "success" && "text-success",
                          column.label === "SKU" && "font-mono text-xs"
                        )}
                      >
                        {display(value, column)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>

        {/* Tablets & desktop: full table */}
        <Card className="glass hidden md:flex">
          <CardContent className="overflow-x-auto pt-6">
            <p className="mb-3 text-sm text-muted-foreground">{report.subtitle}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  {report.columns.map((column) => (
                    <TableHead
                      key={column.label}
                      className={column.kind === "text" ? undefined : "text-right"}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row, r) => (
                  <TableRow key={r}>
                    {row.map((value, i) => {
                      const column = report.columns[i];
                      return (
                        <TableCell
                          key={i}
                          className={cn(
                            column.kind !== "text" && "text-right tabular-nums",
                            column.emphasis && "font-medium",
                            column.tone === "success" && "text-success",
                            column.label === "SKU" && "font-mono text-xs text-muted-foreground"
                          )}
                        >
                          {display(value, column)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              {report.footer && (
                <TableFooter>
                  <TableRow>
                    {report.footer.map((value, i) => {
                      const column = report.columns[i];
                      return (
                        <TableCell
                          key={i}
                          className={cn(
                            "font-semibold",
                            column.kind !== "text" && "text-right tabular-nums"
                          )}
                        >
                          {display(value, column)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
