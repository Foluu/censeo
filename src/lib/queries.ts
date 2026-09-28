import { endOfDay, startOfDay, startOfMonth, subMonths, format } from "date-fns";
import type { PaymentMethod, Prisma, TxStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** Stock on hand per product/warehouse, derived from the movement ledger. */
export async function getStockLevels() {
  const [sums, products, warehouses] = await Promise.all([
    db.stockMovement.groupBy({
      by: ["productId", "warehouseId"],
      _sum: { quantity: true },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      include: {
        categories: {
          select: {
            option: {
              select: { id: true, name: true, color: true, groupId: true },
            },
          },
        },
      },
    }),
    db.warehouse.findMany({ orderBy: { code: "asc" } }),
  ]);

  const byKey = new Map<string, number>();
  for (const row of sums) {
    byKey.set(`${row.productId}:${row.warehouseId}`, row._sum.quantity ?? 0);
  }

  const levels = products.map((product) => {
    const byWarehouse = warehouses.map((wh) => ({
      warehouseId: wh.id,
      code: wh.code,
      name: wh.name,
      quantity: byKey.get(`${product.id}:${wh.id}`) ?? 0,
    }));
    const total = byWarehouse.reduce((sum, w) => sum + w.quantity, 0);
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      unitPrice: Number(product.unitPrice),
      costPrice: Number(product.costPrice),
      reorderLevel: product.reorderLevel,
      isActive: product.isActive,
      isSerialTracked: product.isSerialTracked,
      requiresExpiry: product.requiresExpiry,
      isService: product.isService,
      isFeatured: product.isFeatured,
      options: product.categories.map((c) => c.option),
      byWarehouse,
      total,
      low: total <= product.reorderLevel,
    };
  });

  return { levels, warehouses };
}

/** Available quantity for one product in one warehouse. */
export async function getAvailableStock(productId: string, warehouseId: string) {
  const agg = await db.stockMovement.aggregate({
    where: { productId, warehouseId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function getDashboardData() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const chartStart = startOfMonth(subMonths(now, 5));

  const [
    salesThisMonth,
    salesLastMonth,
    chartSales,
    itemsThisMonth,
    repRows,
    warehouseRows,
    pendingTransfers,
    recentSales,
    stock,
  ] = await Promise.all([
    db.sale.aggregate({
      where: { date: { gte: monthStart }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { date: { gte: lastMonthStart, lt: monthStart }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.findMany({
      where: { date: { gte: chartStart }, status: "COMPLETED" },
      select: { date: true, total: true },
    }),
    db.saleItem.findMany({
      where: { sale: { date: { gte: monthStart }, status: "COMPLETED" } },
      select: { quantity: true, unitPrice: true, product: { select: { id: true, name: true } } },
    }),
    db.sale.groupBy({
      by: ["createdById"],
      where: { date: { gte: monthStart }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.groupBy({
      by: ["warehouseId"],
      where: { date: { gte: monthStart }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.stockTransfer.count({ where: { status: "PENDING" } }),
    db.sale.findMany({
      take: 8,
      orderBy: { date: "desc" },
      include: {
        customer: { select: { name: true } },
        warehouse: { select: { code: true } },
        createdBy: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),
    getStockLevels(),
  ]);

  // Revenue by month for the area chart.
  const monthBuckets = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    monthBuckets.set(format(subMonths(now, i), "MMM"), 0);
  }
  for (const sale of chartSales) {
    const key = format(sale.date, "MMM");
    if (monthBuckets.has(key)) {
      monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + Number(sale.total));
    }
  }
  const revenueByMonth = [...monthBuckets.entries()].map(([month, revenue]) => ({
    month,
    revenue: Math.round(revenue),
  }));

  // Product ranking (units + revenue this month).
  const productMap = new Map<string, { name: string; units: number; revenue: number }>();
  let unitsSold = 0;
  for (const item of itemsThisMonth) {
    unitsSold += item.quantity;
    const entry = productMap.get(item.product.id) ?? {
      name: item.product.name,
      units: 0,
      revenue: 0,
    };
    entry.units += item.quantity;
    entry.revenue += item.quantity * Number(item.unitPrice);
    productMap.set(item.product.id, entry);
  }
  const productRanking = [...productMap.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // Sales rep leaderboard.
  const repIds = repRows.map((r) => r.createdById).filter((id): id is string => !!id);
  const repUsers = await db.user.findMany({
    where: { id: { in: repIds } },
    select: { id: true, name: true },
  });
  const repNames = new Map(repUsers.map((u) => [u.id, u.name]));
  const repRanking = repRows
    .map((row) => ({
      name: row.createdById ? repNames.get(row.createdById) ?? "Unknown" : "Unknown",
      sales: row._count,
      revenue: Number(row._sum.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Warehouse ranking.
  const warehouseNames = new Map(stock.warehouses.map((w) => [w.id, `${w.code} — ${w.name}`]));
  const warehouseRanking = warehouseRows
    .map((row) => ({
      name: warehouseNames.get(row.warehouseId) ?? "Unknown",
      sales: row._count,
      revenue: Number(row._sum.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const lowStock = stock.levels.filter((l) => l.low && l.isActive);
  const stockUnits = stock.levels.reduce((sum, l) => sum + l.total, 0);
  const stockValue = stock.levels.reduce((sum, l) => sum + l.total * l.costPrice, 0);

  return {
    revenue: {
      thisMonth: Number(salesThisMonth._sum.total ?? 0),
      lastMonth: Number(salesLastMonth._sum.total ?? 0),
      count: salesThisMonth._count,
    },
    unitsSold,
    stockUnits,
    stockValue,
    pendingTransfers,
    revenueByMonth,
    productRanking,
    repRanking,
    warehouseRanking,
    lowStock: lowStock.map((l) => ({
      productId: l.productId,
      name: l.name,
      total: l.total,
      reorderLevel: l.reorderLevel,
    })),
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      reference: sale.reference,
      date: sale.date,
      customer: sale.customer?.name ?? sale.customerName ?? "Walk-in",
      warehouse: sale.warehouse.code,
      rep: sale.createdBy?.name ?? "—",
      units: sale.items.reduce((sum, i) => sum + i.quantity, 0),
      total: Number(sale.total),
      status: sale.status,
    })),
  };
}

export type SalesFilters = {
  q?: string;
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
  payment?: string;
  status?: string;
  warehouse?: string;
};

const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "ONLINE"];
const TX_STATUSES = ["COMPLETED", "PENDING", "CANCELLED"];

function parseDay(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getSales(filters: SalesFilters = {}) {
  const { q, payment, status, warehouse } = filters;
  const from = parseDay(filters.from);
  const to = parseDay(filters.to);

  const where: Prisma.SaleWhereInput = {};
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customerName: { contains: q, mode: "insensitive" } },
      { items: { some: { product: { name: { contains: q, mode: "insensitive" } } } } },
    ];
  }
  if (from || to) {
    where.date = {
      ...(from && { gte: startOfDay(from) }),
      ...(to && { lte: endOfDay(to) }),
    };
  }
  if (payment && PAYMENT_METHODS.includes(payment)) {
    where.paymentMethod = payment as PaymentMethod;
  }
  if (status && TX_STATUSES.includes(status)) {
    where.status = status as TxStatus;
  }
  if (warehouse) where.warehouseId = warehouse;

  const sales = await db.sale.findMany({
    where,
    orderBy: { date: "desc" },
    take: 200,
    include: {
      customer: { select: { name: true } },
      warehouse: { select: { code: true } },
      createdBy: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  return sales.map((sale) => ({
    id: sale.id,
    reference: sale.reference,
    date: sale.date,
    customer: sale.customer?.name ?? sale.customerName ?? "Walk-in",
    warehouse: sale.warehouse.code,
    rep: sale.createdBy?.name ?? "—",
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    total: Number(sale.total),
    items: sale.items.map((item) => ({
      product: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  }));
}

/** Everything needed to render a customer receipt for one sale. */
export async function getSaleReceipt(id: string) {
  const [sale, business] = await Promise.all([
    db.sale.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        warehouse: { select: { code: true, name: true, location: true } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    }),
    getBusinessProfile(),
  ]);
  if (!sale) return null;

  return {
    business,
    sale: {
      id: sale.id,
      reference: sale.reference,
      date: sale.date,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      total: Number(sale.total),
      customer: {
        name: sale.customer?.name ?? sale.customerName ?? "Walk-in customer",
        phone: sale.customer?.phone ?? null,
        email: sale.customer?.email ?? null,
      },
      warehouse: sale.warehouse,
      servedBy: sale.createdBy?.name ?? null,
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: item.quantity * Number(item.unitPrice),
      })),
    },
  };
}

export async function getBusinessProfile() {
  const profile = await db.businessProfile.findUnique({ where: { id: "default" } });
  return {
    name: profile?.name ?? "CountBook",
    tagline: profile?.tagline ?? "",
    address: profile?.address ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    taxId: profile?.taxId ?? "",
    receiptFooter: profile?.receiptFooter ?? "",
  };
}

export type BusinessProfileData = Awaited<ReturnType<typeof getBusinessProfile>>;

export async function getReceipts() {
  const receipts = await db.stockReceipt.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      product: { select: { name: true, sku: true } },
      supplier: { select: { name: true } },
      warehouse: { select: { code: true } },
      createdBy: { select: { name: true } },
    },
  });
  return receipts.map((r) => ({
    id: r.id,
    date: r.date,
    product: r.product.name,
    sku: r.product.sku,
    quantity: r.quantity,
    unitCost: Number(r.unitCost),
    supplier: r.supplier?.name ?? "—",
    warehouse: r.warehouse.code,
    status: r.status,
    createdBy: r.createdBy?.name ?? "—",
  }));
}

export async function getProducts() {
  const { levels } = await getStockLevels();
  return levels;
}

export type ProductLevel = Awaited<ReturnType<typeof getProducts>>[number];

/** Category groups with their options and how many products use each option. */
export async function getCategoryGroups() {
  const groups = await db.categoryGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      options: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      },
    },
  });
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    multiSelect: group.multiSelect,
    isRequired: group.isRequired,
    isFilterable: group.isFilterable,
    appliesTo: group.appliesTo,
    sortOrder: group.sortOrder,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      color: option.color,
      productCount: option._count.products,
    })),
  }));
}

export type CategoryGroupData = Awaited<ReturnType<typeof getCategoryGroups>>[number];

/** Distinct main categories in use, for suggestions and filters. */
export async function getMainCategories() {
  const rows = await db.product.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

/** Products flagged as "major", pinned under Products in the sidebar. */
export async function getMajorProducts() {
  return db.product.findMany({
    where: { isFeatured: true, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true },
    take: 12,
  });
}

export async function getProductDetail(id: string) {
  const [{ levels }, recentItems, unitsSold] = await Promise.all([
    getStockLevels(),
    db.saleItem.findMany({
      where: { productId: id },
      orderBy: { sale: { date: "desc" } },
      take: 10,
      include: {
        sale: {
          select: {
            id: true,
            reference: true,
            date: true,
            status: true,
            customerName: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    db.saleItem.aggregate({
      where: { productId: id, sale: { status: "COMPLETED" } },
      _sum: { quantity: true },
    }),
  ]);
  const product = levels.find((l) => l.productId === id);
  if (!product) return null;

  return {
    product,
    unitsSold: unitsSold._sum.quantity ?? 0,
    recentSales: recentItems.map((item) => ({
      saleId: item.sale.id,
      reference: item.sale.reference,
      date: item.sale.date,
      status: item.sale.status,
      customer: item.sale.customer?.name ?? item.sale.customerName ?? "Walk-in",
      quantity: item.quantity,
      total: item.quantity * Number(item.unitPrice),
    })),
  };
}

export async function getCustomers(query?: string) {
  const customers = await db.customer.findMany({
    where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    include: {
      sales: { select: { total: true }, where: { status: "COMPLETED" } },
    },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt,
    orders: c.sales.length,
    lifetimeValue: c.sales.reduce((sum, s) => sum + Number(s.total), 0),
  }));
}

export async function getTransfers() {
  const transfers = await db.stockTransfer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { name: true, sku: true } },
      fromWarehouse: { select: { code: true, name: true } },
      toWarehouse: { select: { code: true, name: true } },
      requestedBy: { select: { name: true } },
    },
  });
  return transfers.map((t) => ({
    id: t.id,
    product: t.product.name,
    sku: t.product.sku,
    quantity: t.quantity,
    from: t.fromWarehouse.code,
    to: t.toWarehouse.code,
    status: t.status,
    requestedBy: t.requestedBy?.name ?? "—",
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  }));
}

/** Reference data for forms. */
export async function getFormOptions() {
  const [products, warehouses, customers, suppliers] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, unitPrice: true },
    }),
    db.warehouse.findMany({ orderBy: { code: "asc" } }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    products: products.map((p) => ({ ...p, unitPrice: Number(p.unitPrice) })),
    warehouses,
    customers,
    suppliers,
  };
}
