// Canonical response envelope (JSON:API-inspired, locked 2026-04-22).
// Every BCA surface (REST, MCP, CLI, SDK) emits this exact shape. Errors are
// carried via HTTP 4xx/5xx — never as an envelope status. Rate-limit state
// lives in HTTP headers, never in the body.

export type EnvelopeStatus = "complete" | "unseeded" | "partial" | "stale";

export interface Citation {
  cite_url: string | null;
  as_of: string | null; // ISO 8601
  source_hash: string | null; // "sha256:..."
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface EnvelopeMeta {
  status: EnvelopeStatus;
  request_id: string; // always a string, never null
  pageInfo: PageInfo;
  diagnostic?: Record<string, unknown>; // present on unseeded/partial
}

export interface ResponseEnvelope<T> {
  data: T;
  attribution: { citations: Citation[] }; // citations[0] is primary
  meta: EnvelopeMeta;
}

/**
 * Resolve the final envelope status. Tool authors may set `status` explicitly;
 * otherwise we auto-detect "unseeded" from empty payloads, falling back to
 * "complete". Return type is tightened to the canonical enum (no "error" —
 * errors are HTTP 4xx/5xx, not envelope statuses).
 */
export function resolveEnvelopeStatus<T>(
  data: T,
  explicit?: EnvelopeStatus,
): EnvelopeStatus {
  if (explicit) return explicit;
  if (data === null || data === undefined) return "unseeded";
  if (Array.isArray(data) && data.length === 0) return "unseeded";
  if (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    Object.keys(data as object).length === 0
  ) {
    return "unseeded";
  }
  // Object with an obvious empty collection field (articles/entities/items/results)
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const collections = ["articles", "entities", "items", "results", "rows", "events"];
    for (const key of collections) {
      const v = d[key];
      if (Array.isArray(v) && v.length === 0) return "unseeded";
    }
  }
  return "complete";
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  published_at: string;
  url: string;
  entities: string[];
  topics?: string[];
  author?: string;
  cite_url?: string;
}

export interface Entity {
  slug: string;
  name: string;
  kind: "chain" | "project" | "person" | "ticker" | "organization" | string;
  ticker?: string;
  aliases?: string[];
  summary?: string;
  articles?: Array<Pick<Article, "slug" | "title" | "published_at" | "url">>;
  sentiment?: { score: number; sample_size: number } | null;
  cite_url?: string;
}

export interface Explainer {
  slug: string;
  course: string;
  title: string;
  summary: string;
  body_markdown?: string;
  level?: "beginner" | "intermediate" | "advanced" | string;
  topics?: string[];
  url: string;
  cite_url?: string;
}

export interface SearchNewsResult {
  articles: Article[];
  total: number;
}
