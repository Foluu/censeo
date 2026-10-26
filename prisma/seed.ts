/**
 * Seed data for CountBook — a medium-sized phone & accessories business with
 * three branches (Computer Village, Lekki, Abuja), UK-used / Nigerian-used /
 * brand-new phones, and a full accessories range. Six months of history.
 *
 * Every sellable variant is its own product (stock is counted per product);
 * brand, colour, storage, screen size, grade, material, connector and
 * compatibility are modelled with user-defined category groups.
 *
 * Run: npm run db:seed   (WIPES the database first)
 */
import { PrismaClient, PaymentMethod, MovementType, type User } from "@prisma/client";
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
const rand = mulberry32(20261019);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
function weighted<T>(items: T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, i) => sum + weight(i), 0);
  if (total <= 0) return undefined;
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// ————————————————————————————————————————————————————————————————
// Catalogue
// ————————————————————————————————————————————————————————————————

const PHONES = "Phones";
const CASES = "Cases & Protection";
const CHARGING = "Chargers & Cables";
const AUDIO = "Audio";
const POWER = "Power Banks";
const WATCHES = "Smartwatches";
const ACCESSORIES_CAT = "Accessories";

const COLOURS: Record<string, string> = {
  Black: "#1f2937",
  White: "#f5f5f4",
  Red: "#c8102e",
  Purple: "#b8a6d9",
  Pink: "#f4cfd6",
  Blue: "#3b6ea8",
  Brown: "#7b4b2a",
  Clear: "#e5e7eb",
  Midnight: "#1e2530",
  Graphite: "#54524f",
  "Pacific Blue": "#2d4e5f",
  "Deep Purple": "#5b4a6b",
  "Space Black": "#2b2b2e",
  "Natural Titanium": "#bab4a9",
  "Blue Titanium": "#3f4a5c",
  "Phantom Black": "#232323",
  Cream: "#efe6d3",
  Olive: "#6b6e4e",
  Obsidian: "#2a2a2a",
  "Blue Black": "#1c2a3a",
  "Basaltic Dark": "#2f3338",
  "Gravity Black": "#26282b",
  "Starlit Black": "#1b1d22",
  "Vintage Green": "#4f6f5a",
  "Midnight Black": "#15171c",
};

type Grade = "Brand New" | "UK Used" | "Nigerian Used";
const GRADE_CODE: Record<Grade, string> = { "Brand New": "NEW", "UK Used": "UKU", "Nigerian Used": "NGU" };
const GRADE_NOTE: Record<Grade, string> = {
  "Brand New": "Brand new, sealed in box. 1-year manufacturer warranty.",
  "UK Used": "UK Used, Grade A — clean body, battery health 85%+. 7-day shop warranty.",
  "Nigerian Used": "Nigerian Used — fully tested, minor signs of use. 3-day shop warranty.",
};

type PhoneModel = {
  brand: string;
  model: string;
  code: string;
  screen: string;
  popularity: number;
  variants: [storage: string, colour: string, grade: Grade, price: number][];
};

const PHONE_MODELS: PhoneModel[] = [
  {
    brand: "Apple", model: "iPhone XR", code: "IPXR", screen: '6.1"', popularity: 3,
    variants: [
      ["64GB", "Red", "UK Used", 215000],
      ["64GB", "Black", "Nigerian Used", 175000],
      ["128GB", "White", "UK Used", 245000],
    ],
  },
  {
    brand: "Apple", model: "iPhone 11", code: "IP11", screen: '6.1"', popularity: 3.5,
    variants: [
      ["64GB", "Black", "UK Used", 285000],
      ["128GB", "Purple", "UK Used", 325000],
      ["128GB", "White", "Nigerian Used", 268000],
    ],
  },
  {
    brand: "Apple", model: "iPhone 12 Pro", code: "IP12P", screen: '6.1"', popularity: 2.5,
    variants: [
      ["128GB", "Pacific Blue", "UK Used", 470000],
      ["256GB", "Graphite", "UK Used", 530000],
    ],
  },
  {
    brand: "Apple", model: "iPhone 13", code: "IP13", screen: '6.1"', popularity: 3.5,
    variants: [
      ["128GB", "Midnight", "UK Used", 560000],
      ["128GB", "Pink", "Nigerian Used", 478000],
      ["256GB", "Blue", "UK Used", 630000],
    ],
  },
  {
    brand: "Apple", model: "iPhone 14 Pro Max", code: "IP14PM", screen: '6.7"', popularity: 2,
    variants: [
      ["128GB", "Space Black", "UK Used", 1020000],
      ["256GB", "Deep Purple", "UK Used", 1150000],
    ],
  },
  {
    brand: "Apple", model: "iPhone 15 Pro Max", code: "IP15PM", screen: '6.7"', popularity: 1.2,
    variants: [
      ["256GB", "Natural Titanium", "Brand New", 1950000],
      ["256GB", "Blue Titanium", "UK Used", 1650000],
    ],
  },
  {
    brand: "Samsung", model: "Galaxy S23 Ultra", code: "SGS23U", screen: '6.8"', popularity: 1.5,
    variants: [
      ["256GB", "Phantom Black", "UK Used", 920000],
      ["256GB", "Cream", "Nigerian Used", 780000],
    ],
  },
  {
    brand: "Samsung", model: "Galaxy S21 FE", code: "SGS21FE", screen: '6.4"', popularity: 1.5,
    variants: [["128GB", "Olive", "UK Used", 290000]],
  },
  {
    brand: "Samsung", model: "Galaxy A15", code: "SGA15", screen: '6.5"', popularity: 2.5,
    variants: [["128GB", "Blue Black", "Brand New", 205000]],
  },
  {
    brand: "Google", model: "Pixel 7 Pro", code: "GPX7P", screen: '6.7"', popularity: 1,
    variants: [["128GB", "Obsidian", "UK Used", 480000]],
  },
  {
    brand: "Tecno", model: "Camon 30", code: "TCM30", screen: '6.78"', popularity: 2.5,
    variants: [["256GB", "Basaltic Dark", "Brand New", 335000]],
  },
  {
    brand: "Tecno", model: "Spark 20", code: "TSP20", screen: '6.6"', popularity: 3.5,
    variants: [["128GB", "Gravity Black", "Brand New", 160000]],
  },
  {
    brand: "Infinix", model: "Hot 40i", code: "IXH40I", screen: '6.56"', popularity: 3.5,
    variants: [["128GB", "Starlit Black", "Brand New", 148000]],
  },
  {
    brand: "Infinix", model: "Note 40 Pro", code: "IXN40P", screen: '6.78"', popularity: 2,
    variants: [["256GB", "Vintage Green", "Brand New", 365000]],
  },
  {
    brand: "Xiaomi", model: "Redmi Note 13", code: "XRN13", screen: '6.67"', popularity: 2.5,
    variants: [["256GB", "Midnight Black", "Brand New", 295000]],
  },
];

type Accessory = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  cost: number;
  popularity: number;
  reorder: number;
  colour?: string;
  material?: string;
  connector?: string;
  compat?: string[];
  grade?: Grade;
  kind?: "screenguard" | "case";
};

const ACCESSORIES: Accessory[] = [
  // Cases & protection
  { sku: "CASE-XR-SIL-RED", name: "iPhone XR Silicone Case — Red", category: CASES, brand: "Generic", price: 5000, cost: 2200, popularity: 5, reorder: 25, colour: "Red", material: "Silicone", compat: ["iPhone XR"], kind: "case" },
  { sku: "CASE-XR-SIL-BLK", name: "iPhone XR Silicone Case — Black", category: CASES, brand: "Generic", price: 5000, cost: 2200, popularity: 4, reorder: 25, colour: "Black", material: "Silicone", compat: ["iPhone XR"], kind: "case" },
  { sku: "CASE-11-SIL-PUR", name: "iPhone 11 Silicone Case — Purple", category: CASES, brand: "Generic", price: 5000, cost: 2200, popularity: 4, reorder: 25, colour: "Purple", material: "Silicone", compat: ["iPhone 11"], kind: "case" },
  { sku: "CASE-13-MAG-CLR", name: "iPhone 13 Clear MagSafe Case", category: CASES, brand: "Generic", price: 9500, cost: 4500, popularity: 4, reorder: 20, colour: "Clear", material: "TPU (Clear)", compat: ["iPhone 13", "iPhone 12 Pro"], kind: "case" },
  { sku: "CASE-14PM-LTH-BRN", name: "iPhone 14 Pro Max Leather Case — Brown", category: CASES, brand: "Generic", price: 15000, cost: 8000, popularity: 2, reorder: 10, colour: "Brown", material: "Leather", compat: ["iPhone 14 Pro Max"], kind: "case" },
  { sku: "CASE-S23U-RGD-BLK", name: "Galaxy S23 Ultra Rugged Armor Case — Black", category: CASES, brand: "Generic", price: 12000, cost: 6000, popularity: 2, reorder: 10, colour: "Black", material: "Rugged", compat: ["Galaxy S23 Ultra"], kind: "case" },
  { sku: "SG-TG-XR11", name: "Tempered Glass Screenguard — iPhone XR/11", category: CASES, brand: "Generic", price: 2500, cost: 700, popularity: 9, reorder: 40, material: "Tempered Glass", compat: ["iPhone XR", "iPhone 11"], kind: "screenguard" },
  { sku: "SG-PRV-13", name: "Privacy Screenguard — iPhone 12 Pro/13", category: CASES, brand: "Generic", price: 4500, cost: 1500, popularity: 7, reorder: 40, material: "Privacy Glass", compat: ["iPhone 12 Pro", "iPhone 13"], kind: "screenguard" },
  { sku: "SG-FG-15PM", name: "Full-Glue Screenguard — iPhone 14/15 Pro Max", category: CASES, brand: "Generic", price: 3500, cost: 1000, popularity: 5, reorder: 30, material: "Tempered Glass", compat: ["iPhone 14 Pro Max", "iPhone 15 Pro Max"], kind: "screenguard" },
  { sku: "SG-CER-UNI67", name: 'Ceramic Screenguard — Universal 6.7"', category: CASES, brand: "Generic", price: 3000, cost: 900, popularity: 6, reorder: 40, material: "Ceramic", compat: ["Universal (Android)"], kind: "screenguard" },
  { sku: "LENS-14PM", name: "Camera Lens Protector — iPhone 14 Pro Max", category: CASES, brand: "Generic", price: 3500, cost: 1200, popularity: 3, reorder: 20, material: "Tempered Glass", compat: ["iPhone 14 Pro Max"] },
  // Chargers & cables
  { sku: "CHG-APL-20W", name: "Apple 20W USB-C Power Adapter", category: CHARGING, brand: "Apple", price: 38000, cost: 31000, popularity: 3, reorder: 15, colour: "White", connector: "USB-C" },
  { sku: "CHG-ORM-20W", name: "Oraimo 20W PD Fast Charger", category: CHARGING, brand: "Oraimo", price: 9500, cost: 6500, popularity: 5, reorder: 25, colour: "White", connector: "USB-C" },
  { sku: "CHG-SAM-25W", name: "Samsung 25W Super Fast Charger", category: CHARGING, brand: "Samsung", price: 22000, cost: 16500, popularity: 3, reorder: 15, colour: "Black", connector: "USB-C" },
  { sku: "CBL-LTC-1M", name: "Lightning to USB-C Cable 1m", category: CHARGING, brand: "Generic", price: 6000, cost: 2500, popularity: 7, reorder: 40, colour: "White", connector: "Lightning" },
  { sku: "CBL-CC-1M", name: "USB-C to USB-C Cable 1m (60W)", category: CHARGING, brand: "Generic", price: 5500, cost: 2200, popularity: 6, reorder: 40, colour: "Black", connector: "USB-C" },
  { sku: "CBL-MICRO-1M", name: "Micro-USB Cable 1m", category: CHARGING, brand: "Generic", price: 2500, cost: 900, popularity: 3, reorder: 30, colour: "Black", connector: "Micro-USB" },
  { sku: "CHG-ORM-CAR", name: "Oraimo 18W Car Charger", category: CHARGING, brand: "Oraimo", price: 7500, cost: 4800, popularity: 2, reorder: 15, colour: "Black", connector: "USB-C" },
  { sku: "CHG-APL-MAG", name: "Apple MagSafe Charger", category: CHARGING, brand: "Apple", price: 55000, cost: 46000, popularity: 1, reorder: 6, colour: "White", connector: "Wireless (MagSafe)" },
  // Audio
  { sku: "AUD-APP2", name: "Apple AirPods Pro (2nd gen)", category: AUDIO, brand: "Apple", price: 285000, cost: 252000, popularity: 1.2, reorder: 5, colour: "White" },
  { sku: "AUD-AP2", name: "Apple AirPods (2nd gen)", category: AUDIO, brand: "Apple", price: 145000, cost: 124000, popularity: 1.5, reorder: 6, colour: "White" },
  { sku: "AUD-ORM-FP4", name: "Oraimo FreePods 4", category: AUDIO, brand: "Oraimo", price: 28000, cost: 19500, popularity: 3, reorder: 15, colour: "Black" },
  { sku: "AUD-SAM-BUDS2P", name: "Samsung Galaxy Buds2 Pro", category: AUDIO, brand: "Samsung", price: 165000, cost: 141000, popularity: 0.8, reorder: 4, colour: "Graphite" },
  { sku: "AUD-APL-EARPODS", name: "Apple EarPods (Lightning)", category: AUDIO, brand: "Apple", price: 18000, cost: 12500, popularity: 2, reorder: 12, colour: "White" },
  // Power banks
  { sku: "PB-ORM-20K", name: "Oraimo Traveler 20000mAh Power Bank", category: POWER, brand: "Oraimo", price: 28000, cost: 20000, popularity: 3, reorder: 12, colour: "Black", connector: "USB-C" },
  { sku: "PB-ANK-10K", name: "Anker PowerCore 10000mAh", category: POWER, brand: "Anker", price: 38000, cost: 29000, popularity: 1.5, reorder: 8, colour: "Black", connector: "USB-C" },
  { sku: "PB-GEN-30K", name: "30000mAh Power Bank (Fast Charge)", category: POWER, brand: "Generic", price: 26000, cost: 17500, popularity: 2, reorder: 10, colour: "White", connector: "USB-C" },
  // Smartwatches
  { sku: "WCH-AWSE-44-UKU", name: "Apple Watch SE 44mm Midnight (UK Used)", category: WATCHES, brand: "Apple", price: 210000, cost: 182000, popularity: 1, reorder: 3, colour: "Midnight", grade: "UK Used" },
  { sku: "WCH-AWS8-45-UKU", name: "Apple Watch Series 8 45mm Midnight (UK Used)", category: WATCHES, brand: "Apple", price: 360000, cost: 316000, popularity: 0.6, reorder: 2, colour: "Midnight", grade: "UK Used" },
  { sku: "WCH-ORM-W4P", name: "Oraimo Watch 4 Plus", category: WATCHES, brand: "Oraimo", price: 32000, cost: 22000, popularity: 1.5, reorder: 8, colour: "Black", grade: "Brand New" },
];

// Supply-constrained lines: no restocks in the last 90 days, so they run low
// and show up in low-stock alerts.
const BACKORDERED_SKUS = [
  "IP15PM-256-NAT-NEW", "IP14PM-128-SPA-UKU", "AUD-APP2", "CHG-APL-MAG",
  "CASE-14PM-LTH-BRN", "SG-FG-15PM", "WCH-AWS8-45-UKU",
];

const MAJOR_SKUS = ["IP13-128-MID-UKU", "IP14PM-256-DEE-UKU", "SGS23U-256-PHA-UKU", "AUD-APP2", "CHG-APL-20W"];

// ————————————————————————————————————————————————————————————————

async function main() {
  console.log("Clearing existing data…");
  await db.productCategory.deleteMany();
  await db.categoryOption.deleteMany();
  await db.categoryGroup.deleteMany();
  await db.businessProfile.deleteMany();
  await db.stockMovement.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.stockTransfer.deleteMany();
  await db.stockReceipt.deleteMany();
  await db.product.deleteMany();
  await db.category.updateMany({ data: { parentId: null } }); // unlink before deleting parents
  await db.category.deleteMany();
  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.warehouse.deleteMany();
  await db.user.deleteMany();

  console.log("Seeding business profile…");
  await db.businessProfile.create({
    data: {
      id: "default",
      name: "GadgetPoint Mobile Ltd",
      tagline: "Phones, gadgets & accessories — new, UK used & Nigerian used",
      address: "Shop 14, Otigba Street, Computer Village, Ikeja, Lagos",
      phone: "+234 803 555 0142",
      email: "sales@gadgetpoint.ng",
      website: "gadgetpoint.ng",
      taxId: "RC 1928374",
      receiptFooter:
        "UK used phones: 7-day warranty. Nigerian used: 3 days. Keep this receipt — no refund on physical or water damage.",
    },
  });

  console.log("Seeding users…");
  const admin = await db.user.create({
    data: {
      name: "Folusho Odunaiya",
      email: "admin@censeo.app",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "ADMIN",
    },
  });
  const staffPassword = await bcrypt.hash("Staff123!", 10);
  const reps: User[] = [];
  for (const [name, email] of [
    ["Emmanuel Dogo", "emmanuel@censeo.app"],
    ["Blessing Aivihenbhor", "blessing@censeo.app"],
    ["Glory Ezenwoke", "glory@censeo.app"],
    ["Olawale Olamilekan", "olawale@censeo.app"],
  ]) {
    reps.push(await db.user.create({ data: { name, email, passwordHash: staffPassword, role: "STAFF" } }));
  }

  console.log("Seeding branches…");
  const cv = await db.warehouse.create({ data: { code: "CVL", name: "Computer Village", location: "Otigba St, Ikeja, Lagos" } });
  const lekki = await db.warehouse.create({ data: { code: "LKI", name: "Lekki Showroom", location: "Admiralty Way, Lekki Phase 1, Lagos" } });
  const abuja = await db.warehouse.create({ data: { code: "ABJ", name: "Abuja Branch", location: "Banex Plaza, Wuse 2, Abuja" } });
  const branches = [
    { wh: cv, share: 0.5, stock: 1 },
    { wh: lekki, share: 0.3, stock: 0.6 },
    { wh: abuja, share: 0.2, stock: 0.45 },
  ];

  console.log("Seeding suppliers…");
  const supplierSpecs = [
    { key: "uk", name: "UK Grade-A Phones Ltd", email: "trade@ukgradea.co.uk", phone: "+44 20 7946 0321" },
    { key: "dubai", name: "Dubai Gadget Hub FZE", email: "orders@dxbgadgethub.ae", phone: "+971 4 555 0198" },
    { key: "local", name: "Otigba Wholesale Phones", email: "otigba.wholesale@example.com", phone: "+234 802 555 0177" },
    { key: "acc", name: "Accessories Direct (Guangzhou)", email: "sales@accdirect.cn", phone: "+86 20 5555 0110" },
    { key: "brand", name: "Authorised Brand Distributors NG", email: "dealers@abd.ng", phone: "+234 1 555 0123" },
  ];
  const suppliers: Record<string, string> = {};
  for (const { key, ...data } of supplierSpecs) suppliers[key] = (await db.supplier.create({ data })).id;

  console.log("Seeding category tree…");
  // Phones › <brand>; Accessories › Cases & Protection › Cases / Screen Protection, …
  const categoryIds = new Map<string, string>(); // "A › B" -> id
  async function ensureCategory(path: string[], description?: string): Promise<string> {
    const key = path.join(" › ");
    const existing = categoryIds.get(key);
    if (existing) return existing;
    const parentId = path.length > 1 ? await ensureCategory(path.slice(0, -1)) : null;
    const siblings = [...categoryIds.keys()].filter((k) => k.split(" › ").length === path.length && k.startsWith(path.slice(0, -1).join(" › "))).length;
    const created = await db.category.create({
      data: { name: path[path.length - 1], parentId, description: description ?? null, sortOrder: siblings },
    });
    categoryIds.set(key, created.id);
    return created.id;
  }
  await ensureCategory([PHONES], "New, UK-used and Nigerian-used handsets");
  for (const brand of [...new Set(PHONE_MODELS.map((m) => m.brand))]) await ensureCategory([PHONES, brand]);
  await ensureCategory([ACCESSORIES_CAT], "Everything that goes with a phone");
  await ensureCategory([ACCESSORIES_CAT, CASES]);
  await ensureCategory([ACCESSORIES_CAT, CASES, "Cases"]);
  await ensureCategory([ACCESSORIES_CAT, CASES, "Screen Protection"]);
  for (const sub of [CHARGING, AUDIO, POWER]) await ensureCategory([ACCESSORIES_CAT, sub]);
  await ensureCategory([WATCHES]);
  const catId = (...path: string[]) => categoryIds.get(path.join(" › "))!;
  const accessoryPath = (a: Accessory) =>
    a.category === WATCHES
      ? [WATCHES]
      : a.category === CASES
        ? a.kind === "case"
          ? [ACCESSORIES_CAT, CASES, "Cases"]
          : a.kind === "screenguard"
            ? [ACCESSORIES_CAT, CASES, "Screen Protection"]
            : [ACCESSORIES_CAT, CASES]
        : [ACCESSORIES_CAT, a.category];

  console.log("Seeding attributes…");
  const brandNames = ["Apple", "Samsung", "Google", "Tecno", "Infinix", "Xiaomi", "Oraimo", "Anker", "Generic"];
  const compatNames = [
    "iPhone XR", "iPhone 11", "iPhone 12 Pro", "iPhone 13", "iPhone 14 Pro Max",
    "iPhone 15 Pro Max", "Galaxy S23 Ultra", "Universal (Android)",
  ];
  const groupSpecs = [
    { name: "Brand", description: "Manufacturer", isRequired: true, options: brandNames.map((name) => ({ name })) },
    { name: "Grade", description: "Condition the item is sold in", isRequired: true, appliesTo: [catId(PHONES), catId(WATCHES)],
      options: [{ name: "Brand New", color: "#22c55e" }, { name: "UK Used", color: "#3b82f6" }, { name: "Nigerian Used", color: "#f59e0b" }] },
    { name: "Storage", isRequired: true, appliesTo: [catId(PHONES)],
      options: ["64GB", "128GB", "256GB", "512GB", "1TB"].map((name) => ({ name })) },
    { name: "Colour", options: Object.entries(COLOURS).map(([name, color]) => ({ name, color })) },
    { name: "Screen size", appliesTo: [catId(PHONES)],
      options: ['6.1"', '6.4"', '6.5"', '6.56"', '6.6"', '6.67"', '6.7"', '6.78"', '6.8"'].map((name) => ({ name })) },
    { name: "Material", appliesTo: [catId(ACCESSORIES_CAT, CASES)],
      options: ["Silicone", "TPU (Clear)", "Leather", "Rugged", "Tempered Glass", "Privacy Glass", "Ceramic"].map((name) => ({ name })) },
    { name: "Connector", appliesTo: [catId(ACCESSORIES_CAT, CHARGING), catId(ACCESSORIES_CAT, POWER)],
      options: ["USB-C", "Lightning", "Micro-USB", "Wireless (MagSafe)"].map((name) => ({ name })) },
    { name: "Compatible with", description: "Phones this item fits", multiSelect: true, appliesTo: [catId(ACCESSORIES_CAT, CASES)],
      options: compatNames.map((name) => ({ name })) },
  ];
  const optionIds = new Map<string, string>(); // "Group:Option" -> id
  for (const [i, { options, ...spec }] of groupSpecs.entries()) {
    const group = await db.categoryGroup.create({
      data: {
        ...spec,
        sortOrder: i,
        options: { create: options.map((o, j) => ({ ...o, sortOrder: j })) },
      },
      include: { options: true },
    });
    for (const o of group.options) optionIds.set(`${group.name}:${o.name}`, o.id);
  }
  const tag = (group: string, option?: string) => {
    if (!option) return [];
    const id = optionIds.get(`${group}:${option}`);
    if (!id) throw new Error(`Unknown option ${group}:${option}`);
    return [id];
  };

  console.log("Seeding products…");
  type SeedProduct = {
    id: string;
    sku: string;
    unitPrice: number;
    costPrice: number;
    reorderLevel: number;
    popularity: number;
    isPhone: boolean;
    supplier: string;
    kind?: "screenguard" | "case";
  };
  const products: SeedProduct[] = [];

  for (const m of PHONE_MODELS) {
    for (const [storage, colour, grade, price] of m.variants) {
      const sku = `${m.code}-${storage.replace("GB", "").replace("1TB", "1T")}-${colour.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${GRADE_CODE[grade]}`;
      const margin = grade === "Brand New" ? 0.07 : grade === "UK Used" ? 0.11 : 0.13;
      const cost = roundTo(price * (1 - margin), 1000);
      const created = await db.product.create({
        data: {
          sku,
          name: `${m.brand === "Apple" ? "" : m.brand + " "}${m.model} ${storage} ${colour} (${grade})`,
          description: `${GRADE_NOTE[grade]} ${m.screen} display.`,
          category: PHONES,
          categoryId: catId(PHONES, m.brand),
          unitPrice: price,
          costPrice: cost,
          reorderLevel: 3,
          isSerialTracked: true, // IMEI captured per unit
          isFeatured: MAJOR_SKUS.includes(sku),
          categories: {
            create: [
              ...tag("Brand", m.brand),
              ...tag("Grade", grade),
              ...tag("Storage", storage),
              ...tag("Colour", colour),
              ...tag("Screen size", m.screen),
            ].map((optionId) => ({ optionId })),
          },
        },
      });
      products.push({
        id: created.id, sku, unitPrice: price, costPrice: cost, reorderLevel: 3,
        popularity: m.popularity / m.variants.length + (grade === "UK Used" ? 0.4 : 0),
        isPhone: true,
        supplier: grade === "UK Used" ? "uk" : grade === "Nigerian Used" ? "local" : m.brand === "Apple" ? "dubai" : "brand",
      });
    }
  }

  for (const a of ACCESSORIES) {
    const created = await db.product.create({
      data: {
        sku: a.sku,
        name: a.name,
        description: a.grade ? GRADE_NOTE[a.grade] : null,
        category: accessoryPath(a)[0],
        categoryId: catId(...accessoryPath(a)),
        unitPrice: a.price,
        costPrice: a.cost,
        reorderLevel: a.reorder,
        isSerialTracked: a.category === WATCHES || a.sku.startsWith("AUD-APP"),
        isFeatured: MAJOR_SKUS.includes(a.sku),
        categories: {
          create: [
            ...tag("Brand", a.brand),
            ...tag("Grade", a.grade),
            ...tag("Colour", a.colour),
            ...tag("Material", a.material),
            ...tag("Connector", a.connector),
            ...(a.compat ?? []).flatMap((c) => tag("Compatible with", c)),
          ].map((optionId) => ({ optionId })),
        },
      },
    });
    products.push({
      id: created.id, sku: a.sku, unitPrice: a.price, costPrice: a.cost, reorderLevel: a.reorder,
      popularity: a.popularity, isPhone: a.category === WATCHES, kind: a.kind,
      supplier: a.brand === "Generic" ? "acc" : "brand",
    });
  }

  console.log("Seeding customers…");
  const customerSpecs: [string, string | null, boolean][] = [
    ["Tunde Bakare", "tunde.bakare@example.com", false],
    ["Chiamaka Obi", "chiamaka.obi@example.com", false],
    ["Kemi Adeyemi", null, false],
    ["Yusuf Ibrahim", "yusuf.ibrahim@example.com", false],
    ["Blessing Okon", null, false],
    ["Sade Coker", "sade.coker@example.com", false],
    ["Daniel Eze", "daniel.eze@example.com", false],
    ["Aisha Bello", null, false],
    ["Ifeoma Gadgets (Reseller)", "ifeomagadgets@example.com", true],
    ["Emeka Phones & Accessories", "emekaphones@example.com", true],
    ["TechHaven Abuja", "orders@techhaven.example.com", true],
    ["Alhaji Musa Phones, Kano", null, true],
    ["Bright Future Hotels (Corporate)", "procurement@brightfuture.example.com", true],
  ];
  const customers: { id: string; reseller: boolean }[] = [];
  for (const [name, email, reseller] of customerSpecs) {
    const c = await db.customer.create({
      data: { name, email, phone: `+234 ${pick(["803", "806", "810", "813", "816", "703", "706", "905"])} ${randInt(100, 999)} ${randInt(1000, 9999)}` },
    });
    customers.push({ id: c.id, reseller });
  }

  // In-memory ledger mirror so sales never oversell.
  const stock = new Map<string, number>();
  const key = (p: string, w: string) => `${p}:${w}`;
  const getStock = (p: string, w: string) => stock.get(key(p, w)) ?? 0;
  const addStock = (p: string, w: string, q: number) => stock.set(key(p, w), getStock(p, w) + q);

  const now = new Date();
  const at = (day: number, hour = randInt(9, 19)) => {
    const d = new Date(now.getTime() - day * 86_400_000);
    d.setHours(hour, randInt(0, 59), 0, 0);
    return d > now ? new Date(now.getTime() - randInt(5, 120) * 60_000) : d;
  };

  async function receive(product: SeedProduct, whId: string, quantity: number, date: Date) {
    const receipt = await db.stockReceipt.create({
      data: {
        productId: product.id, warehouseId: whId, supplierId: suppliers[product.supplier],
        quantity, unitCost: product.costPrice, date, status: "COMPLETED", createdById: admin.id,
      },
    });
    await db.stockMovement.create({
      data: {
        productId: product.id, warehouseId: whId, type: MovementType.RECEIPT,
        quantity, reference: receipt.id, createdById: admin.id, createdAt: date,
      },
    });
    addStock(product.id, whId, quantity);
  }

  console.log("Seeding opening stock…");
  for (const product of products) {
    for (const { wh, stock: factor } of branches) {
      // Roughly 1–2 months of cover, sized from the reorder level.
      const base = product.isPhone ? randInt(3, 7) : product.reorderLevel * randInt(2, 4);
      const scarce = BACKORDERED_SKUS.includes(product.sku) ? 0.5 : 1;
      const qty = Math.max(product.isPhone ? 1 : 4, Math.round(base * factor * scarce));
      await receive(product, wh.id, qty, at(randInt(182, 190), 10));
    }
  }

  console.log("Seeding six months of sales…");
  const phones = products.filter((p) => p.isPhone);
  const accessories = products.filter((p) => !p.isPhone);
  const screenguards = accessories.filter((p) => p.kind === "screenguard");
  const cases = accessories.filter((p) => p.kind === "case");
  const paymentWeights: [PaymentMethod, number][] = [
    [PaymentMethod.TRANSFER, 0.5], [PaymentMethod.CARD, 0.25], [PaymentMethod.CASH, 0.2], [PaymentMethod.ONLINE, 0.05],
  ];
  const sellers = [...reps, admin];
  let saleCounter = 0;

  for (let day = 179; day >= 0; day--) {
    const date0 = at(day);
    const sunday = date0.getDay() === 0;
    const salesToday = sunday ? randInt(1, 3) : randInt(4, 9);

    for (let s = 0; s < salesToday; s++) {
      const date = at(day);
      const branch = weighted(branches, (b) => b.share)!;
      const whId = branch.wh.id;
      const customer = rand() < 0.55 ? pick(customers) : null;
      const reseller = customer?.reseller ?? false;
      const lines = new Map<string, { product: SeedProduct; quantity: number }>();
      const add = (product: SeedProduct | undefined, want: number) => {
        if (!product || lines.has(product.id)) return;
        const qty = Math.min(want, getStock(product.id, whId));
        if (qty > 0) lines.set(product.id, { product, quantity: qty });
      };
      // Shortage: buyers rush the backordered lines in the final month.
      const demand = (p: SeedProduct) =>
        day <= 30 && BACKORDERED_SKUS.includes(p.sku) ? p.popularity * 6 : p.popularity;
      const inStock = (list: SeedProduct[]) => (p: SeedProduct) =>
        getStock(p.id, whId) > 0 ? demand(p) : 0;

      if (rand() < 0.42) {
        // Phone sale, often bundled with protection.
        add(weighted(phones, inStock(phones)), reseller ? randInt(1, 3) : 1);
        if (lines.size && rand() < 0.65) add(weighted(screenguards, inStock(screenguards)), 1);
        if (lines.size && rand() < 0.45) add(weighted(cases, inStock(cases)), 1);
      } else {
        const count = randInt(1, 3);
        for (let i = 0; i < count; i++) {
          add(weighted(accessories, inStock(accessories)), reseller ? randInt(5, 25) : randInt(1, 3));
        }
      }
      if (lines.size === 0) continue;

      saleCounter++;
      const items = [...lines.values()].map(({ product, quantity }) => {
        // Resellers get trade pricing; retail phone buyers sometimes haggle.
        let unitPrice = product.unitPrice;
        if (reseller) unitPrice = roundTo(unitPrice * (product.isPhone ? 0.97 : 0.9), 100);
        else if (product.isPhone && rand() < 0.3) unitPrice -= randInt(1, 3) * 5000;
        return { productId: product.id, quantity, unitPrice };
      });
      const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const reference = `CB-${String(saleCounter).padStart(5, "0")}`;
      const cancelled = rand() < 0.015;
      const rep = pick(sellers);

      await db.sale.create({
        data: {
          reference,
          customerId: customer?.id ?? null,
          customerName: customer ? null : "Walk-in Customer",
          warehouseId: whId,
          date,
          paymentMethod: weighted(paymentWeights, ([, w]) => w)![0],
          status: cancelled ? "CANCELLED" : "COMPLETED",
          total,
          createdById: rep.id,
          items: { create: items },
        },
      });
      if (cancelled) continue;

      await db.stockMovement.createMany({
        data: items.map((item) => ({
          productId: item.productId, warehouseId: whId, type: MovementType.SALE,
          quantity: -item.quantity, reference, createdById: rep.id, createdAt: date,
        })),
      });
      for (const { product, quantity } of lines.values()) {
        addStock(product.id, whId, -quantity);
        // Restock when low — but stop in the final week so some low-stock
        // alerts are visible on the dashboard.
        const backordered = BACKORDERED_SKUS.includes(product.sku) && day <= 90;
        if (!backordered && day > 7 && getStock(product.id, whId) <= product.reorderLevel && rand() < 0.7) {
          const qty = product.isPhone
            ? Math.max(2, Math.round(randInt(3, 6) * branch.stock))
            : Math.max(4, Math.round(product.reorderLevel * randInt(2, 4) * branch.stock));
          await receive(product, whId, qty, at(Math.max(day - 1, 0), 11));
        }
      }
    }
  }

  console.log("Seeding stock transfers…");
  async function transfer(product: SeedProduct, fromId: string, toId: string, qty: number, day: number, complete: boolean) {
    const createdAt = at(day + 1);
    const t = await db.stockTransfer.create({
      data: {
        productId: product.id, fromWarehouseId: fromId, toWarehouseId: toId, quantity: qty,
        status: complete ? "COMPLETED" : "PENDING", requestedById: pick(reps).id,
        createdAt, completedAt: complete ? at(day) : null,
      },
    });
    if (!complete) return;
    await db.stockMovement.createMany({
      data: [
        { productId: product.id, warehouseId: fromId, type: MovementType.TRANSFER_OUT, quantity: -qty, reference: t.id, createdById: admin.id, createdAt: at(day) },
        { productId: product.id, warehouseId: toId, type: MovementType.TRANSFER_IN, quantity: qty, reference: t.id, createdById: admin.id, createdAt: at(day) },
      ],
    });
    addStock(product.id, fromId, -qty);
    addStock(product.id, toId, qty);
  }
  const movable = (list: SeedProduct[], fromId: string, min: number) =>
    list.filter((p) => getStock(p.id, fromId) >= min);
  const plan: [SeedProduct[], string, string, number, number, boolean][] = [
    [phones, cv.id, lekki.id, 2, 20, true],
    [accessories, cv.id, abuja.id, 30, 11, true],
    [phones, cv.id, abuja.id, 2, 5, true],
    [accessories, cv.id, lekki.id, 20, 1, false],
    [phones, lekki.id, abuja.id, 1, 0, false],
  ];
  for (const [list, from, to, qty, day, complete] of plan) {
    const candidates = movable(list, from, qty);
    if (candidates.length) await transfer(pick(candidates), from, to, qty, day, complete);
  }

  const [users, sales, movements] = await Promise.all([db.user.count(), db.sale.count(), db.stockMovement.count()]);
  console.log(`Done: ${users} users, ${products.length} products, ${sales} sales, ${movements} ledger entries.`);
  console.log("Login: admin@censeo.app / Admin123!  |  staff: emmanuel@censeo.app / Staff123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
