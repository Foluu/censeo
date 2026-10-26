// Production start for Render:
//   1. sync the database schema (additive; fails rather than drop data)
//   2. if SEED_DEMO=true and the database has no users, load demo data in the
//      background; otherwise leave it empty for the client's first-run /setup
//   3. start Next.js on Render's $PORT
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Windows can only launch npx.cmd through a shell (Render itself runs Linux).
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";
const opts = { stdio: "inherit", shell: isWin };

console.log("[start] Syncing database schema…");
const push = spawnSync(npx, ["prisma", "db", "push", "--skip-generate"], opts);
if (push.status !== 0) {
  console.error("[start] Schema sync failed — not starting.", push.error ?? "");
  process.exit(push.status ?? 1);
}

const db = new PrismaClient();
const users = await db.user.count();
await db.$disconnect();

if (users === 0 && process.env.SEED_DEMO === "true") {
  // Seeding takes a minute or two; run it alongside the server so Render's
  // health check passes while the demo data loads.
  console.log("[start] Empty database — loading demo data in the background…");
  const seed = spawn(npx, ["tsx", "prisma/seed.ts"], opts);
  seed.on("exit", (code) => console.log(`[start] Demo data ${code === 0 ? "loaded" : `failed (exit ${code})`}.`));
} else if (users === 0) {
  console.log("[start] Empty database — open the site to run first-time setup (/setup).");
} else {
  console.log(`[start] Database has ${users} users — skipping demo data.`);
}

const port = process.env.PORT ?? "3000";
const server = spawn(npx, ["next", "start", "-p", port, "-H", "0.0.0.0"], opts);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
