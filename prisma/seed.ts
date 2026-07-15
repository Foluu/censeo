/**
 * Seed data for Censeo — realistic demo dataset reconstructed from the
 * legacy CountBook system (products, reps, warehouses, ₦ pricing).
 *
 * Run: npx prisma db seed
 */
import {
  PrismaClient,
  PaymentMethod,
  MovementType,
  type Product,
  type User,
  type Customer,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Deterministic RNG so the demo dataset is stable between reseeds.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260715);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

async function main() {
  console.log("Clearing existing data…");
  await db.stockMovement.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.stockTransfer.deleteMany();
  await db.stockReceipt.deleteMany();
  await db.product.deleteMany();
  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.warehouse.deleteMany();
  await db.user.deleteMany();

  console.log("Seeding users…");
  const password = await bcrypt.hash("Admin123!", 10);
  const staffPassword = await bcrypt.hash("Staff123!", 10);

  const admin = await db.user.create({
    data: {
      name: "Folusho Odunaiya",
      email: "admin@censeo.app",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const repNames: [string, string][] = [
    ["Emmanuel Dogo", "emmanuel@censeo.app"],
    ["Blessing Aivihenbhor", "blessing@censeo.app"],
    ["Glory Ezenwoke", "glory@censeo.app"],
    ["Olawale Olamilekan", "olawale@censeo.app"],
  ];
  const reps: User[] = [];
  for (const [name, email] of repNames) {
    reps.push(
      await db.user.create({
        data: { name, email, passwordHash: staffPassword, role: "STAFF" },
      })
    );
  }

  console.log("Seeding warehouses…");
  const wh1 = await db.warehouse.create({
    data: { code: "WH1", name: "Ikosi Main", location: "Ikosi, Lagos" },
  });
  const wh2 = await db.warehouse.create({
    data: { code: "WH2", name: "Ikeja Depot", location: "Ikeja, Lagos" },
  });
  const wh3 = await db.warehouse.create({
    data: { code: "WH3", name: "Abuja Store", location: "Wuse, Abuja" },
  });
  const warehouses = [wh1, wh2, wh3];

  console.log("Seeding suppliers…");
  const suppliers = await Promise.all(
    [
      { name: "Babaria Nigeria Distribution", email: "orders@babaria.ng", phone: "+234 801 555 0101" },
      { name: "Rescofer Pharma Ltd", email: "supply@rescofer.com", phone: "+234 802 555 022" },
      { name: "Fecord Cosmetics", email: "sales@fecord.ng", phone: "+234 803 555 0333" },
    ].map((s) => db.supplier.create({ data: s }))
  );

  console.log("Seeding products…");
  const productSpecs = [
    { sku: "RSC-001", name: "Rescofer Blood Tonic", category: "Pharmaceuticals", unitPrice: 3500, costPrice: 2100, reorderLevel: 40 },
    { sku: "BAB-001", name: "Babaria Coco Body Cream", category: "Skincare", unitPrice: 7200, costPrice: 4300, reorderLevel: 25 },
    { sku: "BAB-002", name: "Babaria Vitamin C Serum", category: "Skincare", unitPrice: 9800, costPrice: 5900, reorderLevel: 20 },
    { sku: "BAB-003", name: "Babaria Spray Pies", category: "Skincare", unitPrice: 4500, costPrice: 2700, reorderLevel: 30 },
    { sku: "BAB-004", name: "Babaria Glycolic Acid", category: "Skincare", unitPrice: 8500, costPrice: 5100, reorderLevel: 15 },
    { sku: "FEC-001", name: "Fecord Hair Cream", category: "Haircare", unitPrice: 2800, costPrice: 1650, reorderLevel: 50 },
  ];
  const products: Product[] = [];
  for (const p of productSpecs) {
    products.push(
      await db.product.create({
        data: { ...p, description: `${p.name} — distributed by Censeo.`, requiresExpiry: p.category === "Pharmaceuticals" },
      })
    );
  }

  console.log("Seeding customers…");
  const customerNames = [
    "HealthPlus Pharmacy", "MedMart Stores", "Adeola Beauty Supplies",
    "Chuks & Sons Ltd", "Zainab Cosmetics", "Grace Supermart",
    "Kunle Distribution", "Ngozi Beauty Hub",
  ];
  const customers: Customer[] = [];
  for (const name of customerNames) {
    customers.push(
      await db.customer.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
          phone: `+234 80${randInt(1, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
        },
      })
    );
  }

  console.log("Seeding stock receipts + opening inventory…");
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  for (const product of products) {
    for (const wh of warehouses) {
      const qty = randInt(80, 300);
      const supplier = pick(suppliers);
      const date = daysAgo(randInt(150, 200));
      const receipt = await db.stockReceipt.create({
        data: {
          productId: product.id,
          warehouseId: wh.id,
          supplierId: supplier.id,
          quantity: qty,
          unitCost: product.costPrice,
          date,
          status: "COMPLETED",
          createdById: admin.id,
        },
      });
      await db.stockMovement.create({
        data: {
          productId: product.id,
          warehouseId: wh.id,
          type: MovementType.RECEIPT,
          quantity: qty,
          reference: receipt.id,
          createdById: admin.id,
          createdAt: date,
        },
      });
    }
  }

  console.log("Seeding six months of sales…");
  const paymentMethods = [
    PaymentMethod.CASH, PaymentMethod.CARD,
    PaymentMethod.TRANSFER, PaymentMethod.ONLINE,
  ];

  let saleCounter = 0;
  for (let day = 179; day >= 0; day--) {
    const salesToday = randInt(0, 3);
    for (let s = 0; s < salesToday; s++) {
      saleCounter++;
      const rep = pick([...reps, admin]);
      const wh = pick(warehouses);
      const customer = rand() < 0.8 ? pick(customers) : null;
      const date = daysAgo(day);
      const lineCount = randInt(1, 3);
      const chosen = new Set<number>();
      while (chosen.size < lineCount) chosen.add(randInt(0, products.length - 1));

      const items = [...chosen].map((i) => {
        const product = products[i];
        return {
          productId: product.id,
          quantity: randInt(1, 12),
          unitPrice: Number(product.unitPrice),
        };
      });
      const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const reference = `CB-${String(saleCounter).padStart(5, "0")}`;

      await db.sale.create({
        data: {
          reference,
          customerId: customer?.id ?? null,
          customerName: customer ? null : "Walk-in Customer",
          warehouseId: wh.id,
          date,
          paymentMethod: pick(paymentMethods),
          status: "COMPLETED",
          total,
          createdById: rep.id,
          items: { create: items },
        },
      });

      for (const item of items) {
        await db.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: wh.id,
            type: MovementType.SALE,
            quantity: -item.quantity,
            reference,
            createdById: rep.id,
            createdAt: date,
          },
        });
      }
    }
  }

  console.log("Seeding stock transfers…");
  // One completed transfer (with ledger entries) and one pending request.
  const transferProduct = products[0];
  const completedAt = daysAgo(12);
  const completed = await db.stockTransfer.create({
    data: {
      productId: transferProduct.id,
      fromWarehouseId: wh3.id,
      toWarehouseId: wh1.id,
      quantity: 30,
      status: "COMPLETED",
      requestedById: reps[0].id,
      createdAt: daysAgo(14),
      completedAt,
    },
  });
  await db.stockMovement.createMany({
    data: [
      {
        productId: transferProduct.id, warehouseId: wh3.id,
        type: MovementType.TRANSFER_OUT, quantity: -30,
        reference: completed.id, createdById: admin.id, createdAt: completedAt,
      },
      {
        productId: transferProduct.id, warehouseId: wh1.id,
        type: MovementType.TRANSFER_IN, quantity: 30,
        reference: completed.id, createdById: admin.id, createdAt: completedAt,
      },
    ],
  });
  await db.stockTransfer.create({
    data: {
      productId: products[2].id,
      fromWarehouseId: wh2.id,
      toWarehouseId: wh1.id,
      quantity: 20,
      status: "PENDING",
      requestedById: reps[1].id,
      createdAt: daysAgo(2),
    },
  });

  const [users, sales, movements] = await Promise.all([
    db.user.count(), db.sale.count(), db.stockMovement.count(),
  ]);
  console.log(`Done: ${users} users, ${products.length} products, ${sales} sales, ${movements} ledger entries.`);
  console.log("Login: admin@censeo.app / Admin123!  |  staff: emmanuel@censeo.app / Staff123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
