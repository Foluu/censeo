import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  PackageCheck,
  Trophy,
  Warehouse,
} from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { formatNaira, formatNairaCompact, formatNumber } from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { RevenueChart } from "@/components/revenue-chart";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Dashboard" };

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      {up ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function RankList({
  items,
}: {
  items: { name: string; detail: string; value: string }[];
}) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-3">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
              i === 0
                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{item.value}</span>
        </li>
      ))}
      {items.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No data this month yet
        </p>
      )}
    </ol>
  );
}

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardData(), getSession()]);
  const firstName = session?.name.split(" ")[0] ?? "there";

  const kpis = [
    {
      label: "Revenue this month",
      icon: Banknote,
      chip: "from-amber-400 to-amber-600 text-amber-950",
      value: (
        <AnimatedNumber value={data.revenue.thisMonth} format={formatNairaCompact} />
      ),
      extra: (
        <DeltaBadge
          current={data.revenue.thisMonth}
          previous={data.revenue.lastMonth}
        />
      ),
      detail: `${data.revenue.count} sales recorded`,
    },
    {
      label: "Units sold",
      icon: PackageCheck,
      chip: "from-teal-400 to-teal-600 text-teal-950",
      value: <AnimatedNumber value={data.unitsSold} />,
      detail: "across all warehouses",
    },
    {
      label: "Stock on hand",
      icon: Boxes,
      chip: "from-violet-400 to-violet-600 text-violet-950",
      value: <AnimatedNumber value={data.stockUnits} />,
      detail: `valued at ${formatNairaCompact(data.stockValue)} (cost)`,
    },
    {
      label: "Pending transfers",
      icon: ArrowLeftRight,
      chip: "from-sky-400 to-sky-600 text-sky-950",
      value: <AnimatedNumber value={data.pendingTransfers} />,
      detail: "awaiting approval",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={format(new Date(), "EEEE, d MMMM yyyy")}
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <FadeIn key={kpi.label} delay={i * 0.06}>
            <Card className="glass relative overflow-hidden">
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {kpi.extra}
                    {kpi.detail}
                  </p>
                </div>
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${kpi.chip}`}
                >
                  <kpi.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Chart + top products */}
      <div className="grid gap-4 xl:grid-cols-3">
        <FadeIn delay={0.1} className="xl:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Revenue — last 6 months</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={data.revenueByMonth} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.16}>
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top products</CardTitle>
              <Trophy className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <RankList
                items={data.productRanking.map((p) => ({
                  name: p.name,
                  detail: `${formatNumber(p.units)} units`,
                  value: formatNairaCompact(p.revenue),
                }))}
              />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Leaderboards + low stock */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <FadeIn delay={0.2}>
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sales rep leaderboard</CardTitle>
              <Trophy className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <RankList
                items={data.repRanking.map((r) => ({
                  name: r.name,
                  detail: `${r.sales} sales`,
                  value: formatNairaCompact(r.revenue),
                }))}
              />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.24}>
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Warehouse ranking</CardTitle>
              <Warehouse className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <RankList
                items={data.warehouseRanking.map((w) => ({
                  name: w.name,
                  detail: `${w.sales} sales`,
                  value: formatNairaCompact(w.revenue),
                }))}
              />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.28} className="lg:col-span-2 xl:col-span-1">
          <Card className="glass h-full border-warning/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Low stock alerts</CardTitle>
              <AlertTriangle className="size-4 text-warning" />
            </CardHeader>
            <CardContent>
              {data.lowStock.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  All stock levels are healthy 🎉
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.lowStock.slice(0, 5).map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center justify-between gap-3"
                    >
                      <p className="min-w-0 truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning tabular-nums">
                        {item.total} left · reorder at {item.reorderLevel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Recent sales */}
      <FadeIn delay={0.32}>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent sales</CardTitle>
            <Link
              href="/sales"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        {sale.reference}
                      </TableCell>
                      <TableCell>{format(sale.date, "d MMM yyyy")}</TableCell>
                      <TableCell className="max-w-40 truncate">
                        {sale.customer}
                      </TableCell>
                      <TableCell>{sale.warehouse}</TableCell>
                      <TableCell className="max-w-32 truncate">{sale.rep}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sale.units}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNaira(sale.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sale.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
