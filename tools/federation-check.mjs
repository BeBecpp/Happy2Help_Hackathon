#!/usr/bin/env node
// What an erxes gateway does with this plugin, minus the gateway: fetch the running subgraph's SDL via
// `_service { sdl }` (Apollo Federation) and compose it into a supergraph together with a stand-in
// "core" subgraph that declares a root Query. Proves the SDL is composable; it does NOT prove that a
// real erxes gateway has loaded the plugin.
//   node tools/federation-check.mjs [http://localhost:3399/graphql]
import { createRequire } from "node:module";
import { join } from "node:path";

const url = process.argv[2] || "http://localhost:3399/graphql";
const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", hostname: "localhost" }, body: JSON.stringify({ query: "{ _service { sdl } }" }) });
const json = await res.json();
const sdl = json.data?._service?.sdl;
if (!sdl) {
  console.error("FAIL no _service.sdl:", JSON.stringify(json.errors ?? json).slice(0, 300));
  process.exit(1);
}
const ops = [...sdl.matchAll(/^\s+(happy2help\w+)/gm)].map((m) => m[1]);
console.log(`subgraph SDL: ${sdl.length} chars · federation link: ${/@link\(url: "https:\/\/specs\.apollo\.dev\/federation\/v2/.test(sdl)} · ${ops.length} happy2help root fields`);

const require = createRequire(join(process.cwd(), "api", "package.json"));
let composition;
let gql;
try {
  composition = require("@apollo/composition");
  gql = require("graphql-tag");
} catch {
  console.log("SKIP composition: @apollo/composition is not installed (pnpm --filter happy2help_api add -D @apollo/composition)");
  process.exit(0);
}
const core = `extend schema @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key", "@shareable"])
type Query { coreStandInPing: String }`;
const result = composition.composeServices([
  { name: "core", typeDefs: gql(core), url: "http://core.invalid/graphql" },
  { name: "happy2help", typeDefs: gql(sdl), url },
]);
if (result.errors?.length) {
  console.log(`FAIL composition: ${result.errors.length} error(s)`);
  for (const e of result.errors.slice(0, 10)) console.log(" -", e.message.slice(0, 240));
  process.exit(1);
}
const supergraph = result.supergraphSdl;
const exposed = ops.filter((op) => supergraph.includes(op));
console.log(`PASS composed supergraph: ${supergraph.length} chars · ${exposed.length}/${ops.length} happy2help fields present`);
