import {
  BcaAuthError,
  BcaNetworkError,
  BcaRateLimitError,
  BcaUpstreamError,
  BcaError,
} from "./errors.js";
import type { ResponseEnvelope } from "./types.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE = "https://api.blockchainacademics.com";
const USER_AGENT = `@blockchainacademics/mcp/${VERSION} (+https://github.com/blockchainacademics/bca-mcp)`;

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

    // HIGH: refuse non-HTTPS base URLs unless the operator has explicitly
    // opted in via BCA_ALLOW_INSECURE_BASE=1. Without this guard an attacker
    // who controls the env (e.g. a malicious shell profile, a hostile
    // MCP client config, or a compromised CI secret) can set
    // BCA_API_BASE=http://attacker.local and intercept the user's
    // X-API-Key header on the first outbound request.
    if (
      !resolved.startsWith("https://") &&
      process.env["BCA_ALLOW_INSECURE_BASE"] !== "1"
    ) {
      throw new BcaError(
        "BCA_BAD_REQUEST",
        `Refusing to use non-HTTPS BCA_API_BASE='${resolved}'. Set BCA_ALLOW_INSECURE_BASE=1 to override for local dev.`,
      );
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
        signal: AbortSignal.timeout(this.timeoutMs),
      };
      if (method === "POST" && body) {
        init.body = JSON.stringify(body);
      }
      res = await this.fetchImpl(url, init);
    } catch (err) {
      throw new BcaNetworkError(err);
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

    // Envelope-aware: if API already wraps with { data, cite_url, as_of, source_hash }, pass through.
    // Otherwise wrap raw payload so downstream code is uniform.
    if (
      json !== null &&
      typeof json === "object" &&
      "data" in (json as Record<string, unknown>)
    ) {
      return json as ResponseEnvelope<T>;
    }
    return { data: json as T };
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
