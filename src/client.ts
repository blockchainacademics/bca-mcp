import {
  BcaAuthError,
  BcaNetworkError,
  BcaRateLimitError,
  BcaUpstreamError,
  BcaError,
} from "./errors.js";
import type {
  Citation,
  EnvelopeMeta,
  EnvelopeStatus,
  ResponseEnvelope,
} from "./types.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE = "https://api.blockchainacademics.com";
const USER_AGENT = `@blockchainacademics/mcp/${VERSION} (+https://github.com/blockchainacademics/bca-mcp)`;

// H-1 (v0.3.1): strict allowlist of base URLs. Env vars and constructor args
// are both validated against this list at startup. An attacker who controls
// BCA_API_BASE (malicious shell profile, hostile MCP client config,
// compromised CI secret) would otherwise redirect every outbound request —
// including the user's X-API-Key — to an attacker-controlled host.
// Mirrors the Python sibling's allowlist in `src/bca_mcp/client.py` so both
// servers accept the exact same set of bases.
const ALLOWED_EXACT_BASES: ReadonlyArray<string> = [
  "https://api.blockchainacademics.com",
  "https://staging-api.blockchainacademics.com",
];
const ALLOWED_LOCAL_PREFIXES: ReadonlyArray<string> = [
  "http://localhost",
  "http://127.0.0.1",
];

export function isAllowedBase(url: string): boolean {
  if (ALLOWED_EXACT_BASES.includes(url)) return true;
  for (const prefix of ALLOWED_LOCAL_PREFIXES) {
    if (url === prefix) return true;
    if (url.startsWith(prefix + ":")) {
      // Must be `prefix:<port>` where <port> is 1-5 digits, nothing else.
      const tail = url.slice(prefix.length + 1);
      if (/^\d{1,5}$/.test(tail)) return true;
    }
  }
  return false;
}

export function formatAllowlistError(url: string): string {
  return (
    `Refusing to use BCA_API_BASE='${url}'. Allowed values: ` +
    `https://api.blockchainacademics.com (default), ` +
    `https://staging-api.blockchainacademics.com, ` +
    `http://localhost[:port], http://127.0.0.1[:port].`
  );
}

// HIGH: cap response body size to prevent a malicious or compromised upstream
// from exhausting host memory. 10 MiB is well above any legitimate envelope
// this API returns (largest real responses — agent-job outputs — are ~200 KB).
const MAX_BODY_BYTES = 10 * 1024 * 1024;

// Module-level guard so we only warn once per process when a non-default
// BCA_API_BASE is in use. Exported for tests to reset between cases.
let _nonDefaultBaseWarned = false;
export function __resetNonDefaultBaseWarning(): void {
  _nonDefaultBaseWarned = false;
}

// Module-level guard so we only warn once per process when the upstream
// briefly emits the legacy flat envelope shape. Exported for tests.
let _flatEnvelopeWarned = false;
export function __resetFlatEnvelopeWarning(): void {
  _flatEnvelopeWarned = false;
}

const DEFAULT_PAGE_INFO = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
} as const;

/**
 * Normalise an arbitrary upstream JSON body into the canonical envelope shape.
 *
 * Primary path: upstream is already canonical — `{data, attribution:{citations[]}, meta}`.
 * We still sanitise meta/pageInfo to fill safe defaults for older middleware
 * instances that may omit a sub-field.
 *
 * Shim path: upstream briefly returns the pre-0.3 flat shape
 * `{data, cite_url?, as_of?, source_hash?, status?, meta?}`. We lift
 * attribution into a single-element `citations[]` and rebuild `meta` with
 * status + request_id + pageInfo. Emits a one-time console.warn so deploy
 * drift is visible without spamming.
 *
 * Raw path: upstream returns a bare payload with no `data` field. We wrap
 * it as `{data: payload}` and synthesise an empty canonical envelope.
 */
export function normalizeEnvelope<T>(json: unknown): ResponseEnvelope<T> {
  if (json === null || typeof json !== "object") {
    return synthesizeCanonical<T>(json as T, "raw");
  }
  const obj = json as Record<string, unknown>;

  // Canonical path: has .data AND .attribution AND .meta
  if ("data" in obj && "attribution" in obj && "meta" in obj) {
    return {
      data: obj["data"] as T,
      attribution: sanitizeAttribution(obj["attribution"]),
      meta: sanitizeMeta(obj["meta"]),
    };
  }

  // Legacy flat path: has .data but not the canonical nesting
  if ("data" in obj) {
    if (!_flatEnvelopeWarned) {
      _flatEnvelopeWarned = true;
      console.warn(
        "warning: upstream returned legacy flat envelope shape; auto-lifting to canonical. " +
          "This shim will be removed in a future release.",
      );
    }
    const citation: Citation = {
      cite_url: typeof obj["cite_url"] === "string" ? (obj["cite_url"] as string) : null,
      as_of: typeof obj["as_of"] === "string" ? (obj["as_of"] as string) : null,
      source_hash:
        typeof obj["source_hash"] === "string" ? (obj["source_hash"] as string) : null,
    };
    const hasAnyCitation =
      citation.cite_url !== null ||
      citation.as_of !== null ||
      citation.source_hash !== null;

    const legacyStatus = obj["status"];
    const status: EnvelopeStatus =
      legacyStatus === "unseeded" ||
      legacyStatus === "partial" ||
      legacyStatus === "stale" ||
      legacyStatus === "complete"
        ? (legacyStatus as EnvelopeStatus)
        : "complete";
    const legacyMeta =
      obj["meta"] && typeof obj["meta"] === "object" && !Array.isArray(obj["meta"])
        ? (obj["meta"] as Record<string, unknown>)
        : {};

    const meta: EnvelopeMeta = {
      status,
      request_id: typeof legacyMeta["request_id"] === "string"
        ? (legacyMeta["request_id"] as string)
        : "req_shim",
      pageInfo: { ...DEFAULT_PAGE_INFO },
    };
    const diagnostic = legacyMeta["diagnostic"];
    if (diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic)) {
      meta.diagnostic = diagnostic as Record<string, unknown>;
    }

    return {
      data: obj["data"] as T,
      attribution: { citations: hasAnyCitation ? [citation] : [] },
      meta,
    };
  }

  // Raw path: no .data field at all — wrap the whole body
  return synthesizeCanonical<T>(json as T, "raw");
}

function synthesizeCanonical<T>(data: T, reason: "raw" | "empty"): ResponseEnvelope<T> {
  return {
    data,
    attribution: { citations: [] },
    meta: {
      status: "complete",
      request_id: `req_${reason}`,
      pageInfo: { ...DEFAULT_PAGE_INFO },
    },
  };
}

function sanitizeAttribution(raw: unknown): { citations: Citation[] } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const citations = (raw as Record<string, unknown>)["citations"];
    if (Array.isArray(citations)) {
      return {
        citations: citations.map((c) => {
          const co = (c ?? {}) as Record<string, unknown>;
          return {
            cite_url: typeof co["cite_url"] === "string" ? (co["cite_url"] as string) : null,
            as_of: typeof co["as_of"] === "string" ? (co["as_of"] as string) : null,
            source_hash:
              typeof co["source_hash"] === "string" ? (co["source_hash"] as string) : null,
          };
        }),
      };
    }
  }
  return { citations: [] };
}

function sanitizeMeta(raw: unknown): EnvelopeMeta {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const rawStatus = obj["status"];
  const status: EnvelopeStatus =
    rawStatus === "unseeded" ||
    rawStatus === "partial" ||
    rawStatus === "stale" ||
    rawStatus === "complete"
      ? (rawStatus as EnvelopeStatus)
      : "complete";
  const request_id =
    typeof obj["request_id"] === "string" && obj["request_id"] !== ""
      ? (obj["request_id"] as string)
      : "req_unknown";

  const rawPageInfo = obj["pageInfo"];
  const pi =
    rawPageInfo && typeof rawPageInfo === "object" && !Array.isArray(rawPageInfo)
      ? (rawPageInfo as Record<string, unknown>)
      : {};
  const pageInfo = {
    hasNextPage: typeof pi["hasNextPage"] === "boolean" ? (pi["hasNextPage"] as boolean) : false,
    hasPreviousPage:
      typeof pi["hasPreviousPage"] === "boolean" ? (pi["hasPreviousPage"] as boolean) : false,
    startCursor:
      typeof pi["startCursor"] === "string" ? (pi["startCursor"] as string) : null,
    endCursor: typeof pi["endCursor"] === "string" ? (pi["endCursor"] as string) : null,
  };

  const meta: EnvelopeMeta = { status, request_id, pageInfo };
  const diagnostic = obj["diagnostic"];
  if (diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic)) {
    meta.diagnostic = diagnostic as Record<string, unknown>;
  }
  return meta;
}

export interface BcaClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch; // test injection
}

export class BcaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly isNonDefaultBase: boolean;

  constructor(opts: BcaClientOptions = {}) {
    const resolved = (
      opts.baseUrl ??
      process.env["BCA_API_BASE"] ??
      process.env["BCA_API_BASE_URL"] ??
      DEFAULT_BASE
    ).replace(/\/+$/, "");

    // H-1 (v0.3.1): strict allowlist. The old 0.3.0 guard only checked the
    // `https://` prefix, which let `https://attacker.example.com` through and
    // exfiltrated the user's X-API-Key. Now we require the base to match one
    // of the explicitly-allowed hosts (prod / staging / localhost / 127.0.0.1).
    // The `BCA_ALLOW_INSECURE_BASE` escape hatch is removed because
    // `http://localhost` and `http://127.0.0.1` are allowlisted directly.
    if (!isAllowedBase(resolved)) {
      throw new BcaError("BCA_BAD_REQUEST", formatAllowlistError(resolved));
    }

    this.baseUrl = resolved;
    this.isNonDefaultBase = resolved !== DEFAULT_BASE;
    this.apiKey = opts.apiKey ?? process.env["BCA_API_KEY"];
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private warnNonDefaultBaseOnce(): void {
    if (this.isNonDefaultBase && !_nonDefaultBaseWarned) {
      _nonDefaultBaseWarned = true;
      console.warn(
        `warning: using non-default BCA_API_BASE='${this.baseUrl}'`,
      );
    }
  }

  async request<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ResponseEnvelope<T>> {
    return this.call<T>("GET", path, params);
  }

  async post<T>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ResponseEnvelope<T>> {
    return this.call<T>("POST", path, undefined, body);
  }

  private async call<T>(
    method: "GET" | "POST",
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    body?: Record<string, unknown>,
  ): Promise<ResponseEnvelope<T>> {
    if (!this.apiKey) {
      throw new BcaAuthError("BCA_API_KEY env var is not set");
    }

    // HIGH: emit a one-time warning whenever the operator is pointing this
    // client at something other than the canonical production API. This runs
    // on first call (not ctor) so tests that build-then-discard a client
    // against a mock fetch don't spam stderr.
    this.warnNonDefaultBaseOnce();

    const url = new URL(
      this.baseUrl + (path.startsWith("/") ? path : "/" + path),
    );
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    let res: Response;
    try {
      const init: RequestInit = {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        // MCP-TS-2: never follow redirects automatically. WHATWG fetch
        // strips only a small allow-list of headers (Authorization,
        // Cookie, Proxy-Authorization) on cross-origin redirects — our
        // custom X-API-Key would be replayed to whatever Location the
        // response points at. A compromised or misconfigured upstream
        // could therefore exfiltrate the key to an attacker-controlled
        // host. Setting `redirect: "manual"` surfaces the 3xx as a
        // response status we explicitly reject below.
        redirect: "manual",
        signal: AbortSignal.timeout(this.timeoutMs),
      };
      if (method === "POST" && body) {
        init.body = JSON.stringify(body);
      }
      res = await this.fetchImpl(url, init);
    } catch (err) {
      throw new BcaNetworkError(err);
    }

    // Explicitly reject redirects — see MCP-TS-2 note above. `res.type === "opaqueredirect"`
    // is what browser fetch returns under manual-redirect; Node's undici surfaces the
    // raw 3xx status. Handle both shapes.
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      throw new BcaUpstreamError(
        res.status || 302,
        "BCA API redirect blocked — refusing to replay X-API-Key to a new origin",
      );
    }

    if (res.status === 401 || res.status === 403) throw new BcaAuthError();
    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      throw new BcaRateLimitError(ra ? Number(ra) : undefined);
    }
    if (res.status >= 500) throw new BcaUpstreamError(res.status);
    if (!res.ok) {
      throw new BcaUpstreamError(
        res.status,
        `BCA API responded ${res.status}`,
      );
    }

    // MEDIUM: cap body size. A compromised upstream could otherwise stream
    // an unbounded response and exhaust host memory. We prefer streaming +
    // running-total guard over Content-Length because CL can be missing
    // (chunked) or forged, and we also want to abort transfer mid-flight.
    let bodyText: string;
    try {
      bodyText = await readCappedText(res, MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof BcaError) throw err;
      throw new BcaUpstreamError(
        res.status,
        `Failed to read BCA API response: ${String(err)}`,
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(bodyText);
    } catch (err) {
      throw new BcaUpstreamError(
        res.status,
        `Invalid JSON from BCA API: ${String(err)}`,
      );
    }

    // Canonical envelope (JSON:API-inspired, locked 2026-04-22):
    //   { data, attribution: { citations: [...] }, meta: { status, request_id, pageInfo } }
    // We still accept the legacy flat shape for backward compat during the
    // rolling REST deploy — the shim logs a one-time warning so drift is
    // visible. All call sites see the canonical shape.
    return normalizeEnvelope<T>(json);
  }
}

/**
 * Stream the response body into a UTF-8 string, aborting + throwing a
 * BcaError the moment the running byte total exceeds `capBytes`. If the
 * stream isn't available (e.g. the test injected a Response without a
 * streaming body), fall back to `res.text()` but still enforce the cap
 * against the fully-materialised buffer.
 */
async function readCappedText(res: Response, capBytes: number): Promise<string> {
  const body = res.body;
  if (!body) {
    const txt = await res.text();
    if (byteLength(txt) > capBytes) {
      throw new BcaError(
        "BCA_UPSTREAM",
        `response exceeded ${capBytes} byte cap`,
        res.status,
      );
    }
    return txt;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > capBytes) {
        // Best-effort abort of the underlying transfer before throwing.
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new BcaError(
          "BCA_UPSTREAM",
          `response exceeded ${capBytes} byte cap`,
          res.status,
        );
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

function byteLength(s: string): number {
  // Avoid pulling in Buffer (keeps this portable to non-Node runtimes).
  return new TextEncoder().encode(s).byteLength;
}

// Shared singleton for tool modules (convenient but overridable in tests).
let shared: BcaClient | undefined;
export function getClient(): BcaClient {
  if (!shared) shared = new BcaClient();
  return shared;
}
export function setClient(client: BcaClient): void {
  shared = client;
}
