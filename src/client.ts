import {
  BcaAuthError,
  BcaNetworkError,
  BcaRateLimitError,
  BcaUpstreamError,
} from "./errors.js";
import type { ResponseEnvelope } from "./types.js";

const DEFAULT_BASE = "https://api.blockchainacademics.com";
const USER_AGENT =
  "@blockchainacademics/mcp/0.1.0 (+https://github.com/blockchainacademics/bca-mcp)";

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

  constructor(opts: BcaClientOptions = {}) {
    this.baseUrl = (
      opts.baseUrl ??
      process.env["BCA_API_BASE_URL"] ??
      DEFAULT_BASE
    ).replace(/\/+$/, "");
    this.apiKey = opts.apiKey ?? process.env["BCA_API_KEY"];
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
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

    let json: unknown;
    try {
      json = await res.json();
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

// Shared singleton for tool modules (convenient but overridable in tests).
let shared: BcaClient | undefined;
export function getClient(): BcaClient {
  if (!shared) shared = new BcaClient();
  return shared;
}
export function setClient(client: BcaClient): void {
  shared = client;
}
