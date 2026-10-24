import { TEST_REDIS_PORT } from "./env.ts";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
// @ts-expect-error plain ESM dev tool without types
import { startDevRedis } from "../../../../tools/dev-redis.mjs";
import { loadClasses, type IModels } from "../../models.ts";
import { applyDemoSeed, DEMO_PEOPLE } from "../../seed/demo.ts";

export const TENANT = "localhost";
export const API_ROOT = join(__dirname, "../../..");

export interface Stack {
  mongoUrl: string;
  pluginUrl: string;
  models: IModels;
  stop(): Promise<void>;
}

async function waitFor(url: string, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`not ready: ${url}`);
}

/** Boots Mongo (memory server), the Redis stub and the REAL plugin process (startPlugin) on a free port. */
export async function startStack(opts: { spawnPlugin?: boolean } = {}): Promise<Stack> {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: "erxes" } });
  const mongoUrl = mongo.getUri("erxes");
  const redisPort = TEST_REDIS_PORT;
  const redis = await startDevRedis(redisPort);
  const pluginPort = 4300 + Math.floor(Math.random() * 400);
  const env = {
    ...process.env,
    NODE_ENV: "test",
    MONGO_URL: mongoUrl,
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: String(redisPort),
    PORT: String(pluginPort),
    LOAD_BALANCER_ADDRESS: `http://localhost:${pluginPort}`,
    HAPPY2HELP_QR_SECRET: process.env.HAPPY2HELP_QR_SECRET!,
    GEMINI_API_KEY: "", // AI off in e2e: SKIPPED must not affect the SOS flow
  };

  let child: ChildProcess | undefined;
  if (opts.spawnPlugin !== false) {
    child = spawn(process.execPath, [join(API_ROOT, "node_modules/tsx/dist/cli.mjs"), "src/main.ts"], {
      cwd: API_ROOT,
      env,
      stdio: process.env.H2H_E2E_VERBOSE ? "inherit" : "ignore",
    });
    await waitFor(`http://localhost:${pluginPort}/health`);
  }

  const conn = await mongoose.createConnection(mongoUrl, { family: 4 }).asPromise();
  const models = loadClasses(conn);
  await applyDemoSeed(models, TENANT);

  return {
    mongoUrl,
    pluginUrl: `http://localhost:${pluginPort}/graphql`,
    models,
    async stop() {
      // Arm first: the SDK keeps sockets retrying and mongod shutdown can hang on Windows; every
      // assertion has already been reported, so force a clean exit for the runner.
      setTimeout(() => process.exit(process.exitCode ?? 0), 2500);
      if (child) {
        if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        else child.kill("SIGINT");
      }
      await conn.close();
      await redis.close();
      await mongo.stop();
      // erxes-api-shared opens an ioredis client at import time; close it so the
      // test process can exit instead of hitting the runner timeout.
      try {
        const sdk = (await import("erxes-api-shared/utils")) as { redis?: { disconnect(): void } };
        sdk.redis?.disconnect();
      } catch {}
      // The SDK keeps other handles open (retrying sockets); every assertion has been
      // reported by now, so let the runner see a clean exit instead of a timeout.
    },
  };
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64");

/** Identity headers exactly as the erxes gateway forwards them to a subgraph. */
export function headersFor(personKey: string): Record<string, string> {
  const p = DEMO_PEOPLE.find((x) => x.key === personKey);
  if (!p) throw new Error(`unknown demo person ${personKey}`);
  const h: Record<string, string> = { "content-type": "application/json", hostname: TENANT };
  if (p.principalType === "staff") {
    h.user = b64({ _id: p.principalId, email: p.email, username: p.key });
    h.userid = p.principalId;
  } else {
    h.cpuser = b64({ _id: p.principalId, email: p.email });
    h.clientportal = b64({ _id: "cp-demo-portal", name: "Happy2Help DEMO portal" });
  }
  return h;
}

export async function gql<T = Record<string, unknown>>(
  url: string,
  headers: Record<string, string>,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> }> {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
  return (await res.json()) as never;
}
