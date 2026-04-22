#!/usr/bin/env node
// Verify that package.json "version" matches src/dist VERSION export.
// Run by the prepublishOnly hook — blocks a release if the two drift.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const { VERSION } = await import(resolve(repoRoot, "dist/version.js"));

if (pkg.version !== VERSION) {
  console.error(`VERSION mismatch: package.json=${pkg.version} src=${VERSION}`);
  process.exit(1);
}
console.log(`version ok: ${VERSION}`);
