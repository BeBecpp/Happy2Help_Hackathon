/**
 * Seeds the fictional demo school(s) into the plugin's MongoDB.
 *
 *   pnpm --filter happy2help_api seed                       # tenant from HAPPY2HELP_TENANT (default: localhost)
 *   pnpm --filter happy2help_api seed -- --map ./seed-map.json   # bind real erxes ids / e-mails at a host
 *
 * Reads MONGO_URL (same database the erxes stack uses). Idempotent.
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { loadClasses } from "../models.ts";
import { applyDemoSeed, DEMO_TENANT, type SeedMap } from "../seed/demo.ts";

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) throw new Error("MONGO_URL is required");
  const mapIndex = process.argv.indexOf("--map");
  const map: SeedMap = mapIndex > -1 && process.argv[mapIndex + 1]
    ? JSON.parse(readFileSync(process.argv[mapIndex + 1]!, "utf8"))
    : {};

  await mongoose.connect(mongoUrl, { family: 4 });
  const models = loadClasses(mongoose.connection);
  const result = await applyDemoSeed(models, DEMO_TENANT, map);
  console.log(`[happy2help seed] tenant=${result.tenantId} schools=${JSON.stringify(result.schoolIds)}`);
  // erxes-api-shared installs a `disconnected → process.exit(1)` hook on the default
  // connection, so exit explicitly instead of calling mongoose.disconnect().
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
