/**
 * tools/list contract: every tool advertises a full JSON Schema (types,
 * enums, bounds, defaults, required, descriptions) and MCP annotations.
 * Covers probe units F05 and F37 (2026-10-31).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { TOOLS, listTools } from "../src/index.js";
import { zodToJsonSchema, type JsonSchema } from "../src/schema.js";
import { WRITE_TOOLS, toolAnnotations, toolTitle } from "../src/annotations.js";

const byName = new Map(listTools().map((t) => [t.name, t]));
const tool = (name: string) => {
  const t = byName.get(name);
  assert.ok(t, `tool ${name} is registered`);
  return t;
};
const props = (name: string) =>
  tool(name).inputSchema["properties"] as Record<string, JsonSchema>;

// Every description string anywhere in a JSON Schema tree.
function descriptions(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) descriptions(item, out);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "description" && typeof value === "string") out.push(value);
      else descriptions(value, out);
    }
  }
  return out;
}

describe("tools/list schemas (F05, F37)", () => {
  it("lists 105 uniquely named tools", () => {
    const names = listTools().map((t) => t.name);
    assert.equal(names.length, 105);
    assert.equal(new Set(names).size, 105);
  });

  it("every tool has an object root and advertises every field it accepts", () => {
    for (const t of listTools()) {
      const schema = t.inputSchema;
      assert.equal(schema["type"], "object", `${t.name} root type`);
      assert.equal(schema["additionalProperties"], false, `${t.name} additionalProperties`);
      const properties = schema["properties"];
      assert.ok(properties && typeof properties === "object", `${t.name} has properties`);
      // No top-level combinators: several MCP hosts reject them.
      for (const key of ["oneOf", "anyOf", "allOf"]) {
        assert.equal(key in schema, false, `${t.name} root has no ${key}`);
      }
    }
  });

  it("advertised properties match the zod shape for every tool (refine included)", () => {
    let withArgs = 0;
    for (const t of TOOLS) {
      // Independent walk: strip .refine() effects, read the object shape.
      let s: any = t.schema;
      while (s?._def?.typeName === "ZodEffects") s = s._def.schema;
      const shapeKeys = Object.keys(s.shape).sort();
      const advertised = Object.keys(t.inputSchema["properties"] as object).sort();
      assert.deepEqual(advertised, shapeKeys, `${t.name} properties`);
      if (shapeKeys.length > 0) withArgs++;
      const required = (t.inputSchema["required"] as string[] | undefined) ?? [];
      for (const r of required) assert.ok(shapeKeys.includes(r), `${t.name}: required ${r}`);
    }
    // Sanity: most tools take arguments; the probe saw 0 of them for two.
    assert.ok(withArgs >= 80, `tools with arguments: ${withArgs}`);
  });

  it("get_entity advertises slug and ticker despite .refine()", () => {
    const p = props("get_entity");
    assert.deepEqual(Object.keys(p).sort(), ["slug", "ticker"]);
    assert.equal(p["slug"]!["type"], "string");
    assert.equal(p["slug"]!["pattern"], "^[a-z0-9]+(?:-[a-z0-9]+)*$");
    assert.equal(p["slug"]!["maxLength"], 240);
    assert.equal(p["ticker"]!["maxLength"], 12);
    assert.match(String(p["ticker"]!["description"]), /Ticker symbol/);
    // Exactly-one rule is enforced at call time, so neither field is required.
    assert.equal(tool("get_entity").inputSchema["required"], undefined);
  });

  it("get_explainer advertises slug and topic despite .refine()", () => {
    const p = props("get_explainer");
    assert.deepEqual(Object.keys(p).sort(), ["slug", "topic"]);
    assert.match(String(p["slug"]!["description"]), /defi-fundamentals/);
    assert.equal(tool("get_explainer").inputSchema["required"], undefined);
  });

  it("emits integer types, bounds, defaults and required fields", () => {
    const limit = props("search_news")["limit"]!;
    assert.equal(limit["type"], "integer");
    assert.equal(limit["minimum"], 1);
    assert.equal(limit["maximum"], 50);
    assert.equal(limit["default"], 10);
    assert.deepEqual(tool("search_news").inputSchema["required"], ["query"]);
    // since takes a bare ISO date too (the API parses both), so it carries a
    // length bound instead of format date-time; the converter's date-time
    // output is checked on a synthetic schema below.
    assert.equal(props("search_news")["since"]!["format"], undefined);
    assert.equal(props("search_news")["since"]!["maxLength"], 64);

    const horizon = props("generate_tokenomics_model")["horizon_days"]!;
    assert.deepEqual(
      { type: horizon["type"], minimum: horizon["minimum"], maximum: horizon["maximum"], default: horizon["default"] },
      { type: "integer", minimum: 30, maximum: 3650, default: 365 },
    );
  });

  it("emits enums with defaults, and arrays with item schemas", () => {
    const window = props("get_degen_leaderboard")["window"]!;
    assert.deepEqual(window["enum"], ["1d", "7d", "30d"]);
    assert.equal(window["default"], "7d");

    // scenarios is not modeled by the API yet, so it has no default: a
    // default would be sent, and reported back as ignored, on every call.
    const scenarios = props("generate_tokenomics_model")["scenarios"]!;
    assert.equal(scenarios["type"], "array");
    assert.deepEqual((scenarios["items"] as JsonSchema)["enum"], ["base", "bull", "bear"]);
    assert.equal(scenarios["maxItems"], 3);
    assert.equal("default" in scenarios, false);

    const focus = props("generate_due_diligence")["focus"]!;
    assert.equal(focus["maxItems"], 16);
    assert.deepEqual(focus["items"], { type: "string", minLength: 1, maxLength: 64 });
  });

  it("emits string formats for email and url checks", () => {
    assert.equal(props("book_kol_campaign")["contact_email"]!["format"], "email");
    const url = props("summarize_whitepaper")["url"]!;
    assert.equal(url["format"], "uri");
    assert.equal(url["maxLength"], 2048);
    const hook = props("monitor_keyword")["webhook_url"]!;
    assert.equal(hook["format"], "uri");
    assert.equal(hook["pattern"], "^https:\\/\\/");
  });

  it("no tool or parameter description contains an em dash", () => {
    for (const t of listTools()) {
      for (const text of [t.description, ...descriptions(t.inputSchema)]) {
        assert.ok(!text.includes("\u2014"), `${t.name}: em dash in "${text}"`);
      }
    }
  });

  it("list_topics names only the API's 10 taxonomy topics", () => {
    const taxonomy = [
      "regulation", "defi", "nft", "layer-2", "bitcoin",
      "ethereum", "solana", "stablecoins", "rwa", "ai-agents",
    ];
    const text = tool("list_topics").description;
    for (const slug of taxonomy) assert.ok(text.includes(slug), `list_topics names ${slug}`);
    for (const stale of ["infra", "memecoins", "security"]) {
      assert.ok(!text.includes(stale), `list_topics must not name ${stale}`);
    }
  });

  it("get_explainer states the real academy size and existing slugs", () => {
    const text = tool("get_explainer").description;
    assert.match(text, /38 teacher-vetted lessons across 8 courses/);
    assert.ok(!/\b43\b|\b9 courses|what-is-a-blockchain/.test(JSON.stringify(tool("get_explainer"))));
  });
});

describe("zodToJsonSchema converter", () => {
  enum Color {
    Red = "red",
    Blue = "blue",
  }
  enum Level {
    Low = 1,
    High = 2,
  }
  const schema = z
    .object({
      color: z.nativeEnum(Color).describe("Native string enum."),
      level: z.nativeEnum(Level).optional(),
      kind: z.literal("fixed"),
      mode: z.union([z.literal("a"), z.literal("b")]).default("a"),
      mixed: z.union([z.string().email(), z.number().int()]),
      maybe: z.string().max(5).nullable(),
      ratio: z.number().gt(0).lt(1).multipleOf(0.05),
      code: z.string().length(4).startsWith("ab"),
      shout: z.string().regex(/^[a-z]+$/i),
      when: z.string().datetime().optional(),
      trimmed: z
        .string()
        .min(3)
        .transform((s) => s.trim()),
      nested: z.object({ inner: z.boolean().default(true) }).optional(),
      tags: z.array(z.string()).min(1).max(3),
      meta: z.record(z.number()),
      anything: z.unknown(),
    })
    .refine((v) => v.ratio > 0, { message: "unused" })
    .describe("Root description.");
  const out = zodToJsonSchema(schema);
  const p = out["properties"] as Record<string, JsonSchema>;

  it("unwraps ZodEffects at the root and keeps the root description", () => {
    assert.equal(out["type"], "object");
    assert.equal(out["description"], "Root description.");
    assert.equal(out["additionalProperties"], false);
  });

  it("required lists only fields that cannot be omitted", () => {
    assert.deepEqual(out["required"], [
      "color", "kind", "mixed", "maybe", "ratio", "code", "shout", "trimmed", "tags", "meta",
    ]);
  });

  it("handles native enums, literals and unions", () => {
    assert.deepEqual(p["color"], { type: "string", enum: ["red", "blue"], description: "Native string enum." });
    assert.deepEqual(p["level"], { type: "number", enum: [1, 2] });
    assert.deepEqual(p["kind"], { type: "string", const: "fixed" });
    assert.deepEqual(p["mode"], { type: "string", enum: ["a", "b"], default: "a" });
    assert.deepEqual(p["mixed"], {
      anyOf: [{ type: "string", format: "email" }, { type: "integer" }],
    });
  });

  it("handles nullable, exclusive bounds, multipleOf and exact length", () => {
    assert.deepEqual(p["maybe"], { type: ["string", "null"], maxLength: 5 });
    assert.deepEqual(p["ratio"], { type: "number", exclusiveMinimum: 0, exclusiveMaximum: 1, multipleOf: 0.05 });
    assert.deepEqual(p["code"], { type: "string", minLength: 4, maxLength: 4, pattern: "^ab" });
  });

  it("drops patterns whose flags JSON Schema cannot express", () => {
    assert.deepEqual(p["shout"], { type: "string" });
  });

  it("follows transforms, nested objects, arrays, records and unknown", () => {
    assert.deepEqual(p["when"], { type: "string", format: "date-time" });
    assert.deepEqual(p["trimmed"], { type: "string", minLength: 3 });
    assert.deepEqual(p["nested"], {
      type: "object",
      properties: { inner: { type: "boolean", default: true } },
      additionalProperties: false,
    });
    assert.deepEqual(p["tags"], { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 });
    assert.deepEqual(p["meta"], { type: "object", additionalProperties: { type: "number" } });
    assert.deepEqual(p["anything"], {});
  });

  it("returns a bare object schema for a non-object root", () => {
    assert.deepEqual(zodToJsonSchema(z.string()), { type: "object" });
  });
});

describe("MCP tool annotations (shared decision 2)", () => {
  it("titles are the name with spaces and a capital first letter", () => {
    assert.equal(toolTitle("get_price"), "Get price");
    assert.equal(toolTitle("get_ct_pulse"), "Get ct pulse");
    assert.equal(toolTitle("book_kol_campaign"), "Book kol campaign");
  });

  it("every tool carries annotations, open world, read only unless a write tool", () => {
    for (const t of listTools()) {
      const a = t.annotations;
      assert.equal(a.title, toolTitle(t.name), `${t.name} title`);
      assert.equal(a.openWorldHint, true, `${t.name} openWorldHint`);
      if (WRITE_TOOLS.has(t.name)) {
        assert.deepEqual(a, {
          title: toolTitle(t.name),
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        });
      } else {
        assert.deepEqual(a, { title: toolTitle(t.name), readOnlyHint: true, openWorldHint: true });
      }
    }
  });

  it("the write set is exactly the eight write tools, all registered", () => {
    assert.deepEqual([...WRITE_TOOLS].sort(), [
      "book_kol_campaign",
      "generate_due_diligence",
      "generate_tokenomics_model",
      "monitor_keyword",
      "request_custom_research",
      "submit_listing",
      "summarize_whitepaper",
      "translate_contract",
    ]);
    for (const name of WRITE_TOOLS) assert.ok(byName.has(name), `${name} registered`);
    assert.equal(toolAnnotations("get_agent_job").readOnlyHint, true);
  });
});
