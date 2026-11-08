/**
 * Shared input-schema helpers for tool Zod schemas.
 *
 * Centralizing slug/ticker validation here gives us one place to tighten
 * regexes, length caps, and error messages. Tools import these helpers
 * instead of inlining `z.string().min(1)` and leaving the MCP boundary
 * open to path-traversal, homoglyph, or CRLF-injection payloads.
 *
 * The second half of the file converts those zod schemas to the JSON Schema
 * that tools/list advertises.
 */
import { z } from "zod";

// `max` defaults to 240, the API's usual slug cap; a few routes cap lower
// (job company 160, DefiLlama protocol 64, chain 32) and pass their own.
export const slugSchema = (label = "slug", max = 240) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${label} must be kebab-case lowercase [a-z0-9-]`,
    );

export const tickerSchema = () =>
  z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9]{1,12}$/, "ticker must be 1-12 alphanumerics");

// ISO 3166 alpha-2 country code, the only form the regulatory routes take
// (the API reads EL as GR and UK as GB).
export const countryCodeSchema = () =>
  z
    .string()
    .min(2)
    .max(2)
    .regex(/^[A-Za-z]{2}$/, "country must be a two-letter ISO 3166 code (e.g. 'US', 'GB', 'DE')");

// --- zod -> JSON Schema ------------------------------------------------------
//
// tools/list must advertise each tool's full input contract: types (integer
// vs number), enums, bounds, string lengths, patterns, formats, defaults,
// required fields and descriptions. zod 4 writes it with z.toJSONSchema. The
// options and the override below keep the output to what tools/list carried
// with zod 3 (and what bca-mcp on PyPI advertises), where zod 4's own output
// differs:
//
//   - io "input" describes the arguments a caller sends, so a field with a
//     default is optional; in that mode zod leaves additionalProperties out
//     of every object that is not strict, and the override puts back false
//     (index.ts rejects an undeclared argument).
//   - `.int()` makes zod check the safe integer range and advertise it as
//     minimum and maximum; only bounds a tool sets itself are advertised.
//   - zod names a string's format after its last format check, so the
//     .regex() after .url() erased format "uri", and it advertises the regex
//     it checks some formats with (email) as a pattern. The format comes from
//     the format check, and pattern only from the tool's own .regex()
//     (startsWith, endsWith, includes and the case checks count as patterns).
//   - JSON Schema patterns carry no flags, so a regex that needs i, m, s or v
//     is left out rather than advertised stricter or looser than zod checks
//     it (zod still enforces it at call time).
//   - unrepresentable "any": a type JSON Schema cannot express advertises {}
//     (any value) instead of throwing when the server starts.
//   - the root drops $schema, which tools/list never carried (MCP takes
//     2020-12 as the default dialect of a schema without one).
//
// Cross-field rules written with `.refine()` (get_entity and get_explainer
// take exactly one of two fields) have no JSON Schema form short of a
// top-level oneOf, which several MCP hosts reject in tool input schemas.
// zod 4 keeps a refinement as a check on the object and z.toJSONSchema
// leaves checks of that kind out, so the object's fields are advertised and
// the rule itself stays enforced at call time by `schema.safeParse` in
// src/index.ts.

export type JsonSchema = Record<string, unknown>;

// The parts of a zod 4 check definition the override reads.
interface CheckDef {
  check: string;
  format?: string;
  pattern?: RegExp;
  value?: unknown;
  local?: boolean;
  precision?: number | null;
}

// String format checks whose pattern is the tool's own rule. Every other
// format (email, url, uuid, ...) is a named format zod checks in code or with
// a regex of its own.
const PATTERN_FORMATS: ReadonlySet<string> = new Set([
  "regex",
  "starts_with",
  "ends_with",
  "includes",
  "lowercase",
  "uppercase",
]);

// JSON Schema names of the zod formats JSON Schema defines. The others
// (emoji, cuid, nanoid, jwt, base64, cidr, time, ...) get no format keyword.
const FORMAT_KEYWORDS: Readonly<Record<string, string>> = {
  email: "email",
  url: "uri",
  uuid: "uuid",
  guid: "uuid",
  datetime: "date-time",
  date: "date",
  duration: "duration",
  ipv4: "ipv4",
  ipv6: "ipv6",
};

/**
 * Definitions of a schema's checks, in order. A format schema such as
 * z.email() is its own first check.
 */
function checkDefs(schema: z.core.$ZodType): CheckDef[] {
  const own = schema._zod.traits.has("$ZodCheck") ? [schema as unknown as z.core.$ZodCheck] : [];
  return [...own, ...(schema._zod.def.checks ?? [])].map((check) => check._zod.def as CheckDef);
}

// True when the regex has no flag a JSON Schema pattern cannot express.
function portablePattern(regex: RegExp): boolean {
  return /^[dguy]*$/.test(regex.flags);
}

/**
 * The format keyword for a named format check, unless the format accepts
 * values the keyword forbids.
 */
function formatKeyword(def: CheckDef): string | undefined {
  // A datetime without an offset or without seconds is not an RFC 3339 date-time.
  if (def.format === "datetime" && (def.local || def.precision === -1)) return undefined;
  return def.format === undefined ? undefined : FORMAT_KEYWORDS[def.format];
}

/** Rebuilds a string's format and pattern from its checks. */
function stringFacets(schema: z.core.$ZodType, json: JsonSchema): void {
  const formats = checkDefs(schema).filter((def) => def.check === "string_format");
  const named = formats.filter((def) => !PATTERN_FORMATS.has(def.format ?? ""));
  const patterns = formats
    .filter((def) => PATTERN_FORMATS.has(def.format ?? "") && def.pattern && portablePattern(def.pattern))
    .map((def) => def.pattern!.source);
  const last = named[named.length - 1];
  const format = last === undefined ? undefined : formatKeyword(last);
  delete json["format"];
  delete json["pattern"];
  // On a string, zod's allOf only ever carries the patterns rebuilt here.
  delete json["allOf"];
  if (format !== undefined) json["format"] = format;
  if (patterns.length === 1) json["pattern"] = patterns[0];
  else if (patterns.length > 1) json["allOf"] = patterns.map((pattern) => ({ pattern }));
}

/** Drops the safe integer range .int() adds, unless the schema sets that bound itself. */
function numberBounds(schema: z.core.$ZodType, json: JsonSchema): void {
  const defs = checkDefs(schema);
  const declared = (check: string, value: number) =>
    defs.some((def) => def.check === check && def.value === value);
  if (json["minimum"] === Number.MIN_SAFE_INTEGER && !declared("greater_than", Number.MIN_SAFE_INTEGER)) {
    delete json["minimum"];
  }
  if (json["maximum"] === Number.MAX_SAFE_INTEGER && !declared("less_than", Number.MAX_SAFE_INTEGER)) {
    delete json["maximum"];
  }
}

// Runs once per schema node, the inner schema before the optional and
// default wrappers that copy its output.
const override: NonNullable<z.core.ToJSONSchemaParams["override"]> = ({ zodSchema, jsonSchema }) => {
  const json = jsonSchema as JsonSchema;
  switch (zodSchema._zod.def.type) {
    case "object":
      // zod's default ("strip") drops unknown keys and index.ts rejects them;
      // either way a client should not send them.
      if (json["additionalProperties"] === undefined) json["additionalProperties"] = false;
      break;
    case "number":
      numberBounds(zodSchema, json);
      break;
    case "string":
      stringFacets(zodSchema, json);
      break;
  }
};

const TO_JSON_SCHEMA: z.core.ToJSONSchemaParams = {
  io: "input",
  unrepresentable: "any",
  override,
};

/**
 * JSON Schema for a tool's arguments object, as advertised in tools/list.
 * MCP requires an object at the root, so a schema that is not an object
 * yields a bare `{type: "object"}`.
 */
export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  // A plain copy: zod's result also carries a non-enumerable "~standard" key.
  const json: JsonSchema = { ...z.toJSONSchema(schema, TO_JSON_SCHEMA) };
  delete json["$schema"];
  return json["type"] === "object" ? json : { type: "object" };
}
