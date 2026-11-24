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
import { STATS_DESCRIPTIONS } from "../src/tools/stats.js";
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
    assert.equal(statsTools().length, 8);
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
  // text changes in both packages together, and with the design.
  const PINNED: Record<string, string> = {
    search_stats: "fe8e30ec02c3f047f14c286a5f3c1be6718d45c4a551c48b92f2d1b07f1d991e",
    list_stats_measures: "2eeb4744e4d13697520ded412d74a9ae84f8e2bc0c88f417a045f72546bc9424",
    rank_stats: "2aaaf1a9fb99a30b16738e92bd0d512ce8cdd1b89d847b08f1cdf3bb3d79afbf",
    get_stats_record: "d0598a007e19e63e4406649356f3e47625190f197a2727b9f6782932fad90091",
    compare_stats_records: "78451accbf0553e7ebcd3a831404856aa287e96bb7abe6c7d6e016131e9c4d7e",
    lookup_stats_wallet: "9f3ca257b7ebde3a3ec996ed0b5fbaf7eed8ba3252a5573010dfbbcc65d85fbd",
    get_stats_method: "5d06018a5a20db7386903940fbdfcd736cb50c4c6b166d83b24bdaf22b20946f",
    list_stats_changes: "7dd18d1c37e164dc2518bbcee94ccb2cc71ae331bbac2362f6f0ab74be871473",
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
      const digest = createHash("sha256")
        .update(canonical({ description: t.description, arguments: args }))
        .digest("hex");
      assert.equal(digest, PINNED[t.name], `${t.name}: keep it word for word appendices D and E`);
    }
  });

  it("the texts name no paid tier, steer no model and hold no em dash", () => {
    for (const t of statsTools()) {
      assert.ok(!/\b(Starter|Pro|Team) tier\b/.test(t.description), t.name);
      assert.ok(!t.description.includes("\u2014"), t.name);
      assert.match(t.description, /Works without an API key\./);
    }
  });
});
