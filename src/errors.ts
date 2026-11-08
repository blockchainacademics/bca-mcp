import type { z } from "zod";
import { fenceUntrusted } from "./untrusted.js";

export type BcaErrorCode =
  | "BCA_AUTH"
  | "BCA_RATE_LIMIT"
  | "BCA_UPSTREAM"
  | "BCA_NETWORK"
  | "BCA_BAD_REQUEST"
  // Added 2026-06-02 with the demo tier. Backend returns 403 + this code when
  // a demo-key caller hits a tool outside the demo allowlist. The upstream
  // message includes the signup URL; client surfaces it verbatim.
  | "BCA_TIER_LOCKED";

export class BcaError extends Error {
  readonly code: BcaErrorCode;
  readonly status?: number;
  constructor(code: BcaErrorCode, message: string, status?: number) {
    super(message);
    this.name = "BcaError";
    this.code = code;
    this.status = status;
  }
}

export class BcaAuthError extends BcaError {
  constructor(message = "Invalid or missing BCA_API_KEY") {
    super("BCA_AUTH", message, 401);
    this.name = "BcaAuthError";
  }
}

export class BcaRateLimitError extends BcaError {
  readonly retryAfter?: number;
  constructor(retryAfter?: number) {
    super(
      "BCA_RATE_LIMIT",
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
      429,
    );
    this.name = "BcaRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class BcaUpstreamError extends BcaError {
  /** The API's own error detail (4xx only), as rendered and truncated. */
  readonly detail?: string;
  constructor(status: number, message = "BCA API upstream error", detail?: string) {
    // The detail is upstream text, so it reaches the host model inside an
    // untrusted_content fence like any other API payload.
    super(
      "BCA_UPSTREAM",
      `${message} (HTTP ${status})` +
        (detail ? `: ${fenceUntrusted("bca-api", detail)}` : ""),
      status,
    );
    this.name = "BcaUpstreamError";
    this.detail = detail;
  }
}

export class BcaNetworkError extends BcaError {
  constructor(cause: unknown) {
    super("BCA_NETWORK", `Network error contacting BCA API: ${String(cause)}`);
    this.name = "BcaNetworkError";
    this.cause = cause;
  }
}

export class BcaBadRequestError extends BcaError {
  constructor(message: string) {
    super("BCA_BAD_REQUEST", message, 400);
    this.name = "BcaBadRequestError";
  }
}

// Validation messages list at most this many problems, each capped, so one
// oversized argument cannot balloon the error the host model reads.
const MAX_ISSUES = 10;
const MAX_ISSUE_CHARS = 200;

/**
 * The first `max` characters of `text` plus "...". Counted in code points, so
 * a cut never leaves half a surrogate pair: zod echoes the caller's value in
 * some messages (an invalid enum value, say), and a lone surrogate in the
 * result breaks clients whose JSON decoder rejects it.
 */
function cap(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max).join("")}...` : text;
}

/** A JSON value's type as the messages name it: "array", "null", "number". */
function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isNaN(value)) return "nan";
  return typeof value;
}

/** An enum option as the messages quote it: 'thread'. */
const quoteOption = (value: unknown): string =>
  typeof value === "string" ? `'${value}'` : String(value);

// Wording of the size and bound messages per kind of value: the words for an
// inclusive bound first, then for an exclusive one.
const BOUND_WORDS: Readonly<
  Record<string, { lead: string; unit: string; min: [string, string]; max: [string, string] }>
> = {
  string: {
    lead: "String must contain",
    unit: " character(s)",
    min: ["at least", "over"],
    max: ["at most", "under"],
  },
  array: {
    lead: "Array must contain",
    unit: " element(s)",
    min: ["at least", "more than"],
    max: ["at most", "less than"],
  },
  number: {
    lead: "Number must be",
    unit: "",
    min: ["greater than or equal to", "greater than"],
    max: ["less than or equal to", "less than"],
  },
};

function boundMessage(
  issue: { origin: string; inclusive?: boolean; exact?: boolean },
  limit: number | bigint,
  side: "min" | "max",
): string | undefined {
  const words = BOUND_WORDS[issue.origin === "int" ? "number" : issue.origin];
  if (!words) return undefined;
  const [inclusive, exclusive] = words[side];
  return `${words.lead} ${issue.exact ? "exactly" : issue.inclusive ? inclusive : exclusive} ${limit}${words.unit}`;
}

/**
 * The problem text for one argument issue, in the wording the 0.6 releases
 * gave with zod 3 ("Required", "Number must be less than or equal to 50",
 * "Invalid enum value. Expected 'dex' | 'bridge', received 'x'"), so the
 * "field: problem" pairs read the same on zod 4. Passed to safeParse as its
 * error map: a message the schema sets itself (a .regex() or .refine()
 * message) still wins, and an issue left undefined here keeps zod's text.
 */
export const validationMessage: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined) return "Required";
      // .int() on a number with a fraction.
      if (issue.expected === "int") return "Expected integer, received float";
      return `Expected ${issue.expected}, received ${typeName(issue.input)}`;
    case "invalid_value": {
      if (issue.input === undefined) return "Required";
      const options = issue.values.map(quoteOption).join(" | ");
      return typeof issue.input === "string"
        ? `Invalid enum value. Expected ${options}, received '${issue.input}'`
        : `Expected ${options}, received ${typeName(issue.input)}`;
    }
    case "too_small":
      return boundMessage(issue, issue.minimum, "min");
    case "too_big":
      return boundMessage(issue, issue.maximum, "max");
    case "invalid_format":
      // A .regex() without a message of its own, and the formats tools use.
      if (issue.format === "regex") return "Invalid";
      if (issue.format === "email" || issue.format === "url") return `Invalid ${issue.format}`;
      return undefined;
    case "not_multiple_of":
      return `Number must be a multiple of ${issue.divisor}`;
  }
  return undefined;
};

/** The parts of a zod issue formatValidationError reads. */
type ValidationIssue = Pick<z.core.$ZodIssue, "code" | "path" | "message"> & {
  readonly origin?: string;
  readonly minimum?: number | bigint;
  readonly maximum?: number | bigint;
};

/**
 * True for the safe integer range zod 4 checks on every .int() (origin
 * "int"), which tools/list does not advertise; a bound the tool sets itself
 * has origin "number".
 */
function isSafeRangeIssue(issue: ValidationIssue): boolean {
  if (issue.origin !== "int") return false;
  return (
    (issue.code === "too_big" && issue.maximum === Number.MAX_SAFE_INTEGER) ||
    (issue.code === "too_small" && issue.minimum === Number.MIN_SAFE_INTEGER)
  );
}

/**
 * Render zod validation issues as "field: problem" pairs, e.g.
 * `Invalid arguments for search_news: query: Required; limit: Number must be
 * less than or equal to 50`. A rule on the whole object (no field path, such
 * as get_entity's "exactly one of slug or ticker") is listed without a field.
 * The field is capped too: an unrecognized key is named by the caller.
 */
export function formatValidationError(
  toolName: string,
  issues: ReadonlyArray<ValidationIssue>,
): string {
  // zod 4 still runs a field's length checks when its type is wrong (an array
  // sent for a string adds "Array must contain..."), so a field whose type is
  // wrong lists only that problem, as it did on zod 3.
  const fieldKey = (issue: ValidationIssue) => JSON.stringify(issue.path.map(String));
  const mistyped = new Set(issues.filter((i) => i.code === "invalid_type").map(fieldKey));
  // An integer past the safe range that also breaks the field's own bound
  // (limit: 1e20 against at most 50) lists only that bound, as on zod 3; with
  // no bound of its own (offset: 1e20), the safe range is the problem shown.
  const otherProblem = new Set(issues.filter((i) => !isSafeRangeIssue(i)).map(fieldKey));
  const parts: string[] = [];
  for (const issue of issues) {
    if (issue.code !== "invalid_type" && mistyped.has(fieldKey(issue))) continue;
    if (isSafeRangeIssue(issue) && otherProblem.has(fieldKey(issue))) continue;
    const field = cap(issue.path.map(String).join("."), MAX_ISSUE_CHARS);
    const problem = cap(issue.message, MAX_ISSUE_CHARS);
    const text = field ? `${field}: ${problem}` : problem;
    if (!parts.includes(text)) parts.push(text);
  }
  const shown = parts.slice(0, MAX_ISSUES);
  const more = parts.length - shown.length;
  return (
    `Invalid arguments for ${toolName}: ${shown.join("; ")}` +
    (more > 0 ? `; and ${more} more` : "")
  );
}
