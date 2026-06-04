#!/usr/bin/env node
// Generate src/demo_key.ts from scripts/demo-key.txt.
//
// The demo key is a public, rate-limited fallback baked into the package.
// When BCA_API_KEY is unset, BcaClient uses this value so `npx -y` is a
// true zero-config demo. The Python sibling has the same file at
// scripts/demo-key.txt and the same gen script — both must match byte-for-byte
// before tagging a release. See plan: ok-lets-use-all-glowing-plum.md.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const txt = resolve(repoRoot, "scripts/demo-key.txt");
const out = resolve(repoRoot, "src/demo_key.ts");

const raw = readFileSync(txt, "utf8").trim();
if (!raw.startsWith("bca_demo_")) {
  console.error(
    `gen-demo-key: refusing to emit — scripts/demo-key.txt does not start with 'bca_demo_'`,
  );
  process.exit(1);
}
if (raw.length !== "bca_demo_".length + 40) {
  console.error(
    `gen-demo-key: demo-key.txt expected to be 'bca_demo_' + 40 hex chars; got length ${raw.length}`,
  );
  process.exit(1);
}

const body =
  `// GENERATED — do not edit by hand. Source: scripts/demo-key.txt.\n` +
  `// Regenerate via: npm run gen:demo-key\n` +
  `//\n` +
  `// Public demo key baked into the package. When BCA_API_KEY is unset,\n` +
  `// BcaClient falls back to this value so npx -y is a true zero-config\n` +
  `// demo. The backend recognises it and routes to the demo-tier allowlist\n` +
  `// + per-IP rate limiter. Public by design; rate limits bound abuse.\n` +
  `export const BCA_DEMO_KEY_FALLBACK = ${JSON.stringify(raw)};\n`;

writeFileSync(out, body, "utf8");
console.log(`gen-demo-key: wrote ${out} (key len=${raw.length})`);
