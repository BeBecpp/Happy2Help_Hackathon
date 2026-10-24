// One-command local stack WITHOUT Docker (Windows/macOS/Linux):
//   node tools/dev-stack.mjs
//
//   MongoDB  → mongodb-memory-server (real mongod binary, data persisted in .data/mongo)
//   Redis    → tools/dev-redis.mjs stub (service-discovery keys only; see that file)
//   Plugin   → api/ via official erxes-api-shared startPlugin (tsx watch)
//   Seed     → fictional demo school, zones and memberships
//   Web      → Next.js student/teacher app in dev-direct mode (talks to the plugin's
//              own /graphql and sets the gateway identity headers itself)
//
// This is a local development mode. At the erxes Hub the plugin runs against the
// organizer's real Mongo/Redis/gateway and the web app uses gateway mode instead.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import { startDevRedis } from "./dev-redis.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MONGO_PORT = Number(process.env.H2H_MONGO_PORT || 27117);
const REDIS_PORT = Number(process.env.H2H_REDIS_PORT || 6399);
const PLUGIN_PORT = Number(process.env.PORT || 3399);
const WEB_PORT = Number(process.env.H2H_WEB_PORT || 3100);
const TENANT = process.env.HAPPY2HELP_TENANT || "localhost";
const isWin = process.platform === "win32";
const children = [];

const log = (m) => console.log(`[dev-stack] ${m}`);

function run(cmd, args, env, name) {
  const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: "inherit", shell: isWin });
  child.on("exit", (code) => log(`${name} exited (${code})`));
  children.push(child);
  return child;
}

async function waitFor(url, label, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

function loadOrCreateRuntimeEnv(mongoUrl) {
  const file = join(ROOT, ".env.runtime");
  let existing = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) existing[m[1]] = m[2];
    }
  }
  const env = {
    MONGO_URL: mongoUrl,
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: String(REDIS_PORT),
    NODE_ENV: "development",
    LOAD_BALANCER_ADDRESS: `http://localhost:${PLUGIN_PORT}`,
    HAPPY2HELP_TENANT: TENANT,
    H2H_MODE: "dev-direct",
    H2H_PLUGIN_GRAPHQL_URL: `http://localhost:${PLUGIN_PORT}/graphql`,
    H2H_SESSION_SECRET: existing.H2H_SESSION_SECRET || randomBytes(32).toString("hex"),
    HAPPY2HELP_QR_SECRET: existing.HAPPY2HELP_QR_SECRET || randomBytes(24).toString("hex"),
  };
  writeFileSync(file, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
  log(`wrote .env.runtime (gitignored)`);
  return env;
}

async function main() {
  mkdirSync(join(ROOT, ".data/mongo"), { recursive: true });
  const mongo = await MongoMemoryServer.create({
    instance: { port: MONGO_PORT, dbPath: join(ROOT, ".data/mongo"), storageEngine: "wiredTiger", dbName: "erxes" },
  });
  const mongoUrl = `mongodb://127.0.0.1:${MONGO_PORT}/erxes?directConnection=true`;
  log(`MongoDB (mongodb-memory-server, persisted in .data/mongo) → ${mongoUrl}`);

  const redis = await startDevRedis(REDIS_PORT);
  log(`Redis stub → 127.0.0.1:${redis.port} (dev only)`);

  const env = loadOrCreateRuntimeEnv(mongoUrl);

  run("pnpm", ["--filter", "happy2help_api", "dev"], env, "plugin");
  await waitFor(`http://localhost:${PLUGIN_PORT}/health`, "plugin /health");
  log(`erxes plugin (startPlugin) ready → http://localhost:${PLUGIN_PORT}/graphql`);
  log(`service discovery keys written to the stub: ${JSON.stringify(Object.keys(redis.dump()))}`);

  await new Promise((resolve) => {
    const seed = spawn("pnpm", ["--filter", "happy2help_api", "seed"], { cwd: ROOT, env: { ...process.env, ...env }, stdio: "inherit", shell: isWin });
    seed.on("exit", resolve);
  });

  if (process.env.H2H_NO_WEB !== "1") {
    run("pnpm", ["--filter", "happy2help_web", "dev"], env, "web");
    await waitFor(`http://localhost:${WEB_PORT}/sign-in`, "web /sign-in", 180);
    log(`web ready → http://localhost:${WEB_PORT}  (DEMO one-tap sign-in with fictional accounts)`);
  }
  log("stack is up. Ctrl+C stops everything.");

  const shutdown = async () => {
    log("shutting down…");
    for (const c of children) {
      try {
        if (isWin) spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
        else c.kill("SIGINT");
      } catch {}
    }
    await redis.close();
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
