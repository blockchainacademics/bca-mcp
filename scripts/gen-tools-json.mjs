#!/usr/bin/env node
// Writes tools.json (shipped in the package): every registered tool name and
// the counts per category, read from the built registry and server.json.
// Sites and docs read this file so no tool count is ever typed by hand.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { TOOLS } = require("../dist/index.js");
const server = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));
const meta = server._meta["io.modelcontextprotocol.registry/publisher-provided"];
const names = TOOLS.map((t) => t.name);
const listed = new Set(meta.tool_categories.flatMap((c) => c.examples));
const missing = names.filter((n) => !listed.has(n));
if (missing.length) {
  console.error(`gen-tools-json: server.json categories do not list: ${missing.join(", ")}`);
  process.exit(1);
}
const out = {
  package: "@blockchainacademics/mcp",
  version: server.version,
  count: names.length,
  categories: meta.tool_categories.map((c) => ({ name: c.name, count: c.examples.length, tools: c.examples })),
  tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
};
if (out.count !== meta.tool_count) {
  console.error(`gen-tools-json: registry has ${out.count} tools, server.json says ${meta.tool_count}`);
  process.exit(1);
}
writeFileSync(new URL("../tools.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`tools.json: ${out.count} tools, ${out.categories.length} categories`);
