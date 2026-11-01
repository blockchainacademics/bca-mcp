/**
 * Docs stay in step with the code (probe units F36 and F51): the README
 * lists the 16 demo tools the API allowlists, the counts match, and no
 * user-facing copy carries an em dash.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TOOLS } from "../src/index.js";
import { DEMO_BANNER } from "../src/demo_banner.js";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

// Mirror of the API's app/api/v1/_demo_allowlist.py (main, 2026-10-31).
const DEMO_TOOLS = [
  "get_price",
  "get_trending",
  "get_fear_greed",
  "get_market_overview",
  "search_news",
  "get_sentiment",
  "get_entity",
  "get_explainer",
  "get_recent_stories",
  "get_topic",
  "search_grants",
  "get_grant",
  "list_jobs",
  "get_job",
  "search_academy",
  "get_as_of_snapshot",
];

describe("README and registry copy", () => {
  const readme = read("README.md");

  it("the demo tools exist and the banner count matches", () => {
    const names = new Set(TOOLS.map((t) => t.name));
    for (const name of DEMO_TOOLS) assert.ok(names.has(name), `${name} is a tool`);
    assert.equal(DEMO_TOOLS.length, 16);
    assert.ok(DEMO_BANNER.includes(`${DEMO_TOOLS.length} tools work without a key`));
  });

  it("README lists every demo tool and the locked count", () => {
    for (const name of DEMO_TOOLS) assert.ok(readme.includes(`\`${name}\``), `README lists ${name}`);
    assert.match(readme, /16 tools work without a key/);
    assert.match(readme, /89 of the 105 tools/);
    assert.match(readme, /clean upgrade message/);
    assert.ok(!/10 marquee|91 of the 105|~10 tools/.test(readme));
  });

  it("README states the real academy size", () => {
    assert.match(readme, /38 academy lessons in 8 courses/);
    assert.ok(!/43 academy lessons|what-is-a-blockchain/.test(readme));
  });

  it("no em dash in README, package.json or server.json descriptions", () => {
    assert.ok(!readme.includes("\u2014"), "README em dash");
    const pkg = JSON.parse(read("package.json"));
    assert.ok(!String(pkg.description).includes("\u2014"), "package.json description");
    const server = JSON.parse(read("server.json"));
    const texts: string[] = [server.description];
    for (const p of server.packages ?? []) {
      for (const v of p.environmentVariables ?? []) texts.push(v.description);
    }
    for (const text of texts) {
      assert.ok(!String(text).includes("\u2014"), `server.json: ${text}`);
      assert.ok(!/10 marquee/.test(String(text)), `server.json: ${text}`);
    }
  });
});
