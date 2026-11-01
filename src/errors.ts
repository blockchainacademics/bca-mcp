import type { ZodError } from "zod";
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
 * Render a zod validation failure as "field: problem" pairs, e.g.
 * `Invalid arguments for search_news: query: Required; limit: Number must be
 * less than or equal to 50`. A rule on the whole object (no field path, such
 * as get_entity's "exactly one of slug or ticker") is listed without a field.
 */
export function formatValidationError(toolName: string, err: ZodError): string {
  const parts: string[] = [];
  for (const issue of err.issues) {
    const field = issue.path.map(String).join(".");
    const problem =
      issue.message.length > MAX_ISSUE_CHARS
        ? `${issue.message.slice(0, MAX_ISSUE_CHARS)}...`
        : issue.message;
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
