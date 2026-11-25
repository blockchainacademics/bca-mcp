/**
 * The shared table of edge cases of the Stats output rules (review finding 4).
 * test/fixtures/stats_edge_cases.json is the Python sibling's
 * tests/fixtures/stats_edge_cases.json, copied byte for byte: inputs and the
 * outputs the rules give, written by hand from the rules. Both packages run it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { cleanCitations, cleanStatsMeta, outsideKeys, stripMarkers } from "../src/outside.js";
import { holdsAddress } from "../src/tools/stats.js";

interface Case {
  rule: string;
  name: string;
  input: unknown;
  output: unknown;
}
const TABLE = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/stats_edge_cases.json", import.meta.url)), "utf8"),
) as { call_id: string; cases: Case[] };

function run(rule: string, value: unknown): unknown {
  switch (rule) {
    case "strip":
      return stripMarkers(value as string);
    case "citations":
      return cleanCitations(value as unknown[]);
    case "meta": {
      const raw = value as Record<string, unknown>;
      const meta = cleanStatsMeta(raw, raw["status"] as string, TABLE.call_id, "0123456789abcdef");
      delete meta["outside_text"];
      return meta;
    }
    case "keys": {
      const keys = outsideKeys(value);
      return keys === undefined ? "refused" : [...keys].sort();
    }
    case "address":
      return holdsAddress(value as string);
  }
  throw new Error(`unknown rule ${rule}`);
}

test("the shared table covers each rule", () => {
  const rules = new Set(TABLE.cases.map((c) => c.rule));
  assert.deepEqual([...rules].sort(), ["address", "citations", "keys", "meta", "strip"]);
  assert.ok(TABLE.cases.length >= 40);
});

for (const c of TABLE.cases) {
  test(`${c.rule}: ${c.name}`, () => {
    assert.deepEqual(run(c.rule, c.input), c.output);
  });
}
