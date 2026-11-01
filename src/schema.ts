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

export const slugSchema = (label = "slug") =>
  z
    .string()
    .min(1)
    .max(240)
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

// --- zod -> JSON Schema ------------------------------------------------------
//
// tools/list must advertise each tool's full input contract: types (integer
// vs number), enums, bounds, string lengths, patterns, formats, defaults,
// required fields and descriptions. zod 3 ships no exporter (z.toJSONSchema
// arrived with zod 4 and does not read zod 3 schemas), so this walks zod 3's
// `_def` tree directly instead of adding a dependency. A zod 4 upgrade must
// switch to z.toJSONSchema; test/schema_annotations.test.ts fails loudly if
// this walker stops recognising the schemas.
//
// Cross-field rules written with `.refine()` (get_entity and get_explainer
// take exactly one of two fields) have no JSON Schema form short of a
// top-level oneOf, which several MCP hosts reject in tool input schemas. The
// walker advertises the refined object's fields, and the rule itself stays
// enforced at call time by `schema.safeParse` in src/index.ts.

export type JsonSchema = Record<string, unknown>;

// zod 3 keeps everything the walker needs on `_def`; the types are internal,
// so they are read loosely here.
type ZodDef = { typeName?: string; description?: unknown; [key: string]: any };

const defOf = (schema: unknown): ZodDef =>
  ((schema as { _def?: ZodDef } | null | undefined)?._def ?? {}) as ZodDef;

// Guards against runaway recursion (z.lazy cycles) and absurd nesting.
const MAX_DEPTH = 32;

interface Peeled {
  inner: z.ZodTypeAny;
  description?: string;
  defaultValue?: unknown;
  nullable: boolean;
}

/**
 * Strip wrapper types (optional, default, nullable, refine/transform effects,
 * brand, readonly, catch, pipeline, lazy) down to the schema that defines the
 * value's shape. The outermost description and default win, which matches
 * how zod copies a description onto each new wrapper.
 */
function peel(schema: z.ZodTypeAny): Peeled {
  let cur: any = schema;
  let description: string | undefined;
  let defaultValue: unknown;
  let hasDefault = false;
  let nullable = false;
  for (let i = 0; i < MAX_DEPTH; i++) {
    const def = defOf(cur);
    if (
      description === undefined &&
      typeof def.description === "string" &&
      def.description !== ""
    ) {
      description = def.description;
    }
    switch (def.typeName) {
      case "ZodOptional":
      case "ZodReadonly":
      case "ZodCatch":
        cur = def["innerType"];
        continue;
      case "ZodNullable":
        nullable = true;
        cur = def["innerType"];
        continue;
      case "ZodDefault":
        if (!hasDefault) {
          hasDefault = true;
          defaultValue = jsonDefault(def);
        }
        cur = def["innerType"];
        continue;
      case "ZodEffects":
        cur = def["schema"];
        continue;
      case "ZodBranded":
        cur = def["type"];
        continue;
      case "ZodPipeline":
        cur = def["in"];
        continue;
      case "ZodLazy":
        cur = def["getter"]();
        continue;
    }
    break;
  }
  return { inner: cur, description, defaultValue, nullable };
}

/** The default value as plain JSON, or undefined when it has no JSON form. */
function jsonDefault(def: ZodDef): unknown {
  try {
    const value = def["defaultValue"]();
    if (value === undefined || typeof value === "function") return undefined;
    // Round trip: a detached copy, and a throw (BigInt) means "no JSON form".
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

/** True when the property may be left out of the arguments object. */
function acceptsUndefined(schema: z.ZodTypeAny): boolean {
  try {
    return schema.safeParse(undefined).success;
  } catch {
    // A refinement that throws on undefined: fall back to the wrapper chain.
    let cur: any = schema;
    for (let i = 0; i < MAX_DEPTH; i++) {
      const def = defOf(cur);
      switch (def.typeName) {
        case "ZodOptional":
        case "ZodDefault":
        case "ZodCatch":
        case "ZodAny":
        case "ZodUnknown":
        case "ZodUndefined":
        case "ZodVoid":
          return true;
        case "ZodNullable":
        case "ZodReadonly":
          cur = def["innerType"];
          continue;
        case "ZodEffects":
          cur = def["schema"];
          continue;
        case "ZodBranded":
          cur = def["type"];
          continue;
        case "ZodPipeline":
          cur = def["in"];
          continue;
      }
      return false;
    }
    return false;
  }
}

function jsonTypeOf(value: unknown): string | undefined {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    case "boolean":
      return "boolean";
    default:
      return undefined;
  }
}

/** JSON Schema `type` for a list of enum values ("integer" folds into "number"). */
function enumType(values: ReadonlyArray<unknown>): string | string[] | undefined {
  const types = [
    ...new Set(
      values.map((v) => {
        const t = jsonTypeOf(v);
        return t === "integer" ? "number" : t;
      }),
    ),
  ];
  if (types.some((t) => t === undefined)) return undefined;
  return types.length === 1 ? (types[0] as string) : (types as string[]);
}

function withEnum(values: ReadonlyArray<unknown>): JsonSchema {
  const type = enumType(values);
  return type === undefined ? { enum: [...values] } : { type, enum: [...values] };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// JSON Schema patterns carry no flags. A regex that relies on i, m, s or v
// would be advertised stricter or looser than zod enforces, so it is left out
// (zod still enforces it at call time).
function portablePattern(regex: RegExp): boolean {
  return /^[dguy]*$/.test(regex.flags);
}

function stringSchema(def: ZodDef): JsonSchema {
  const out: JsonSchema = { type: "string" };
  let minLength: number | undefined;
  let maxLength: number | undefined;
  const patterns: string[] = [];
  for (const check of (def["checks"] ?? []) as Array<Record<string, any>>) {
    switch (check["kind"]) {
      case "min":
        minLength = Math.max(minLength ?? 0, check["value"]);
        break;
      case "max":
        maxLength = Math.min(maxLength ?? Number.POSITIVE_INFINITY, check["value"]);
        break;
      case "length":
        minLength = Math.max(minLength ?? 0, check["value"]);
        maxLength = Math.min(maxLength ?? Number.POSITIVE_INFINITY, check["value"]);
        break;
      case "regex":
        if (portablePattern(check["regex"])) patterns.push(check["regex"].source);
        break;
      case "startsWith":
        patterns.push(`^${escapeRegExp(check["value"])}`);
        break;
      case "endsWith":
        patterns.push(`${escapeRegExp(check["value"])}$`);
        break;
      case "includes":
        patterns.push(escapeRegExp(check["value"]));
        break;
      case "email":
        out["format"] = "email";
        break;
      case "url":
        out["format"] = "uri";
        break;
      case "uuid":
        out["format"] = "uuid";
        break;
      case "datetime":
        out["format"] = "date-time";
        break;
      case "date":
        out["format"] = "date";
        break;
      case "time":
        out["format"] = "time";
        break;
      case "duration":
        out["format"] = "duration";
        break;
      case "ip":
        if (check["version"] === "v4") out["format"] = "ipv4";
        else if (check["version"] === "v6") out["format"] = "ipv6";
        break;
      // emoji, cuid, cuid2, ulid, nanoid, jwt, base64, cidr and the trim /
      // case transforms have no portable JSON Schema keyword.
    }
  }
  if (minLength !== undefined) out["minLength"] = minLength;
  if (maxLength !== undefined) out["maxLength"] = maxLength;
  if (patterns.length === 1) out["pattern"] = patterns[0];
  else if (patterns.length > 1) out["allOf"] = patterns.map((pattern) => ({ pattern }));
  return out;
}

function numberSchema(def: ZodDef): JsonSchema {
  let integer = false;
  const bounds: JsonSchema = {};
  const raise = (key: string, value: number) => {
    const prev = bounds[key];
    bounds[key] = typeof prev === "number" ? Math.max(prev, value) : value;
  };
  const lower = (key: string, value: number) => {
    const prev = bounds[key];
    bounds[key] = typeof prev === "number" ? Math.min(prev, value) : value;
  };
  for (const check of (def["checks"] ?? []) as Array<Record<string, any>>) {
    switch (check["kind"]) {
      case "int":
        integer = true;
        break;
      case "min":
        raise(check["inclusive"] ? "minimum" : "exclusiveMinimum", check["value"]);
        break;
      case "max":
        lower(check["inclusive"] ? "maximum" : "exclusiveMaximum", check["value"]);
        break;
      case "multipleOf":
        bounds["multipleOf"] = check["value"];
        break;
    }
  }
  return { type: integer ? "integer" : "number", ...bounds };
}

function arraySchema(def: ZodDef, depth: number): JsonSchema {
  const out: JsonSchema = { type: "array", items: convert(def["type"], depth + 1) };
  if (def["exactLength"]) {
    out["minItems"] = def["exactLength"].value;
    out["maxItems"] = def["exactLength"].value;
  }
  if (def["minLength"]) out["minItems"] = def["minLength"].value;
  if (def["maxLength"]) out["maxItems"] = def["maxLength"].value;
  return out;
}

function objectSchema(schema: z.ZodTypeAny, depth: number): JsonSchema {
  const def = defOf(schema);
  const shape: Record<string, z.ZodTypeAny> =
    (typeof def["shape"] === "function" ? def["shape"]() : (schema as any).shape) ?? {};
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    properties[key] = convert(value, depth + 1);
    if (!acceptsUndefined(value)) required.push(key);
  }
  const out: JsonSchema = { type: "object", properties };
  if (required.length > 0) out["required"] = required;
  const catchall = def["catchall"];
  const catchallType = defOf(catchall).typeName;
  if (catchallType && catchallType !== "ZodNever") {
    out["additionalProperties"] = convert(catchall, depth + 1);
  } else {
    // zod's default ("strip") drops unknown keys and "strict" rejects them;
    // either way a client should not send them.
    out["additionalProperties"] = def["unknownKeys"] === "passthrough";
  }
  return out;
}

function unionSchema(options: ReadonlyArray<z.ZodTypeAny>, depth: number): JsonSchema {
  const literals = options.map((option) => defOf(peel(option).inner));
  if (
    literals.length > 0 &&
    literals.every((d) => d.typeName === "ZodLiteral" && jsonTypeOf(d["value"]) !== undefined)
  ) {
    return withEnum(literals.map((d) => d["value"]));
  }
  return { anyOf: options.map((option) => convert(option, depth + 1)) };
}

function nativeEnumSchema(values: Record<string, string | number>): JsonSchema {
  // Same rule as zod's own getValidEnumValues: drop the reverse mapping keys
  // TypeScript adds for numeric members.
  const keys = Object.keys(values).filter(
    (key) => typeof values[values[key] as string] !== "number",
  );
  return withEnum([...new Set(keys.map((key) => values[key]))]);
}

function baseSchema(schema: z.ZodTypeAny, depth: number): JsonSchema {
  const def = defOf(schema);
  switch (def.typeName) {
    case "ZodString":
      return stringSchema(def);
    case "ZodNumber":
      return numberSchema(def);
    case "ZodBigInt":
      return { type: "integer", format: "int64" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodDate":
      return { type: "string", format: "date-time" };
    case "ZodNull":
      return { type: "null" };
    case "ZodNever":
      return { not: {} };
    case "ZodLiteral": {
      const type = jsonTypeOf(def["value"]);
      return type === undefined ? {} : { type, const: def["value"] };
    }
    case "ZodEnum":
      return withEnum(def["values"]);
    case "ZodNativeEnum":
      return nativeEnumSchema(def["values"]);
    case "ZodUnion":
    case "ZodDiscriminatedUnion":
      return unionSchema(def["options"], depth);
    case "ZodIntersection":
      return { allOf: [convert(def["left"], depth + 1), convert(def["right"], depth + 1)] };
    case "ZodArray":
      return arraySchema(def, depth);
    case "ZodSet": {
      const out: JsonSchema = {
        type: "array",
        uniqueItems: true,
        items: convert(def["valueType"], depth + 1),
      };
      if (def["minSize"]) out["minItems"] = def["minSize"].value;
      if (def["maxSize"]) out["maxItems"] = def["maxSize"].value;
      return out;
    }
    case "ZodTuple": {
      const items = (def["items"] ?? []) as z.ZodTypeAny[];
      const out: JsonSchema = {
        type: "array",
        prefixItems: items.map((item) => convert(item, depth + 1)),
        minItems: items.length,
      };
      if (def["rest"]) out["items"] = convert(def["rest"], depth + 1);
      else {
        out["items"] = false;
        out["maxItems"] = items.length;
      }
      return out;
    }
    case "ZodRecord":
      return { type: "object", additionalProperties: convert(def["valueType"], depth + 1) };
    case "ZodObject":
      return objectSchema(schema, depth);
    default:
      // ZodAny, ZodUnknown and anything unrecognised: accept any value
      // rather than advertise a wrong type.
      return {};
  }
}

function convert(schema: z.ZodTypeAny, depth: number): JsonSchema {
  if (depth > MAX_DEPTH) return {};
  const peeled = peel(schema);
  let out = baseSchema(peeled.inner, depth);
  if (peeled.nullable) {
    out =
      typeof out["type"] === "string" && !("enum" in out) && !("const" in out)
        ? { ...out, type: [out["type"], "null"] }
        : { anyOf: [out, { type: "null" }] };
  }
  if (peeled.defaultValue !== undefined) out["default"] = peeled.defaultValue;
  if (peeled.description !== undefined) out["description"] = peeled.description;
  return out;
}

/**
 * JSON Schema for a tool's arguments object, as advertised in tools/list.
 * MCP requires an object at the root, so a schema that is not an object
 * (after peeling refine/default wrappers) yields a bare `{type: "object"}`.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const peeled = peel(schema);
  if (defOf(peeled.inner).typeName !== "ZodObject") return { type: "object" };
  const out = objectSchema(peeled.inner, 0);
  if (peeled.description !== undefined) out["description"] = peeled.description;
  return out;
}
