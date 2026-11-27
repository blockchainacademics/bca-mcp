/**
 * What must not reach the Stats tools (AGENTS-09, design 3.4): the two Stats
 * files hold no link, no settings read, no network or file code; the
 * constants file holds the two citation prefixes and nothing else; no Stats
 * argument is a link, a host, a path or a file; none of the eight writes.
 * The descriptions and argument texts are appendices D and E word for word.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { listTools } from "../src/index.js";
import { WRITE_TOOLS } from "../src/annotations.js";
import { isAllowedBase } from "../src/client.js";
import { STATS_DATA_PREFIX, STATS_SITE_PREFIX } from "../src/stats_constants.js";
import { KEYLESS_SENTENCE, STATS_DESCRIPTIONS, STATS_WORKS_WITHOUT_KEY } from "../src/tools/stats.js";
import type { JsonSchema } from "../src/schema.js";

const src = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const STATS_NAMES = Object.keys(STATS_DESCRIPTIONS);
const statsTools = () => listTools().filter((t) => STATS_NAMES.includes(t.name));

describe("the Stats files (AGENTS-09 guard)", () => {
  const BANNED = [
    "http://",
    "https://",
    "process.env",
    "os.environ",
    "node:dns",
    "node:net",
    "node:fs",
    "child_process",
    "subprocess",
    "socket",
    "fetch(",
    "httpx",
    ".post(",
    "open(",
  ];

  for (const path of ["tools/stats.ts", "outside.ts"]) {
    it(`${path} holds none of the banned strings`, () => {
      const text = src(path);
      for (const banned of BANNED) assert.ok(!text.includes(banned), `${path} contains ${banned}`);
    });
  }

  it("the constants file holds the two prefixes and nothing else", () => {
    const text = src("stats_constants.ts");
    const literals = [...text.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/g)].map(
      (m) => m[1] ?? m[2] ?? m[3],
    );
    assert.deepEqual(literals, ["https://data.blockchainacademics.com/", "https://blockchainacademics.com/"]);
    assert.equal(STATS_DATA_PREFIX, "https://data.blockchainacademics.com/");
    assert.equal(STATS_SITE_PREFIX, "https://blockchainacademics.com/");
    const code = text
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.trim().startsWith("//"));
    assert.deepEqual(code, [
      'export const STATS_DATA_PREFIX = "https://data.blockchainacademics.com/";',
      'export const STATS_SITE_PREFIX = "https://blockchainacademics.com/";',
    ]);
  });

  it("the data address is not an API base the client accepts, so a key is never sent there", () => {
    assert.equal(isAllowedBase("https://data.blockchainacademics.com"), false);
    assert.equal(isAllowedBase(STATS_DATA_PREFIX), false);
  });
});

describe("the eight schemas", () => {
  it("no argument is a link, a host, a path or a file, and none has format uri", () => {
    const LINKISH = /(^|_)(url|uri|link|host|path|file|filename|dir)(_|$)/;
    const walk = (node: unknown, where: string) => {
      if (Array.isArray(node)) node.forEach((item, i) => walk(item, `${where}[${i}]`));
      else if (node && typeof node === "object") {
        const obj = node as JsonSchema;
        assert.notEqual(obj["format"], "uri", `${where}: format uri`);
        assert.notEqual(obj["format"], "uri-reference", `${where}: format uri-reference`);
        const props = obj["properties"] as Record<string, unknown> | undefined;
        for (const name of Object.keys(props ?? {})) {
          assert.ok(!LINKISH.test(name), `${where}: argument ${name}`);
        }
        for (const [key, value] of Object.entries(obj)) walk(value, `${where}.${key}`);
      }
    };
    assert.ok(statsTools().length >= 7);
    for (const t of statsTools()) walk(t.inputSchema, t.name);
  });

  it("every argument has a type or a closed list, and a string has a length cap", () => {
    for (const t of statsTools()) {
      const props = t.inputSchema["properties"] as Record<string, JsonSchema>;
      for (const [name, p] of Object.entries(props)) {
        const options = (p["anyOf"] as JsonSchema[] | undefined) ?? [p];
        for (const o of options) {
          assert.ok(o["type"] !== undefined || o["enum"] !== undefined, `${t.name}.${name} has a type`);
          if (o["type"] === "string" && o["enum"] === undefined) {
            assert.equal(typeof o["maxLength"], "number", `${t.name}.${name} has a length cap`);
          }
          if (o["type"] === "array") assert.equal(typeof o["maxItems"], "number", `${t.name}.${name} has an item cap`);
          if (o["type"] === "integer") assert.equal(typeof o["maximum"], "number", `${t.name}.${name} has a maximum`);
        }
        assert.equal(typeof p["description"], "string", `${t.name}.${name} has a description`);
      }
    }
  });

  it("none of the eight writes", () => {
    for (const t of statsTools()) {
      assert.equal(WRITE_TOOLS.has(t.name), false, t.name);
      assert.deepEqual(t.annotations, { title: t.annotations.title, readOnlyHint: true, openWorldHint: true });
    }
  });
});

describe("the fixed texts (appendices D and E)", () => {
  // SHA-256 of {"description": appendix D, "arguments": appendix E} for each
  // tool, as compact JSON with sorted keys, computed from design-final.md. A
  // text changes in both packages together, and with the design. 0.8.0: seven
  // of the eight changed for the Yields tab and the rate paid (design review
  // log, "0.8.0"); lookup_stats_wallet did not. 0.9.0: six changed for the
  // Chains tab (all but lookup_stats_wallet and list_stats_changes).
  const PINNED: Record<string, string> = {
    search_stats: "fff86c3fad36c632dea6faceff3b3199afb641ed56287c6ff0685f64675a1904",
    list_stats_measures: "8f276c16b4e2528b140a9095342a64dd7e8076415c01e8a98a2ceb1f3df82d72",
    rank_stats: "b87d29d9a330a778b195ae2efcc9a32b3a67da9f113130a07de48f93ae8b49a7",
    get_stats_record: "4b2271e04d7f52cd868a4a12ccca93d117a1e9c88dd537c264949545e7717af1",
    compare_stats_records: "a1505a441ac550c3227db5cab0510c8829494269ead7189dc4e0fadf66aba21f",
    lookup_stats_wallet: "9f3ca257b7ebde3a3ec996ed0b5fbaf7eed8ba3252a5573010dfbbcc65d85fbd",
    get_stats_method: "6c3e7e12a6abbf8e257037a69c500f4b59e9a20077eb047be75c63a2ede3d38e",
    list_stats_changes: "c11e59b03b3f1f023373bea805007c9ea847421e8ae136ead6104cd6b1dd833d",
  };
  const canonical = (value: unknown): string =>
    value !== null && typeof value === "object"
      ? `{${Object.keys(value as object)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(value);

  it("each tool's description and argument texts equal the design's", () => {
    for (const t of statsTools()) {
      const props = t.inputSchema["properties"] as Record<string, JsonSchema>;
      const args = Object.fromEntries(Object.entries(props).map(([name, p]) => [name, p["description"]]));
      // With the owner's line 1 answered no, the last sentence is left out on purpose.
      const description = t.description + (STATS_WORKS_WITHOUT_KEY ? "" : KEYLESS_SENTENCE);
      const digest = createHash("sha256")
        .update(canonical({ description, arguments: args }))
        .digest("hex");
      assert.equal(digest, PINNED[t.name], `${t.name}: keep it word for word appendices D and E`);
    }
  });

  it("the texts name no paid tier, steer no model and hold no em dash", () => {
    for (const t of statsTools()) {
      assert.ok(!/\b(Starter|Pro|Team) tier\b/.test(t.description), t.name);
      assert.ok(!t.description.includes("\u2014"), t.name);
      assert.equal(t.description.endsWith(KEYLESS_SENTENCE), STATS_WORKS_WITHOUT_KEY, t.name);
    }
  });
});
