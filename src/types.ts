// Canonical response envelope (JSON:API-inspired, locked 2026-04-22).
// Every BCA surface (REST, MCP, CLI, SDK) emits this exact shape. Errors are
// carried via HTTP 4xx/5xx, never as an envelope status. Rate-limit state
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
  // Added 2026-06-02 with the public demo-tier launch. Backend-emitted on
  // every authenticated response. MCP packages pass through unchanged.
  tier?: "demo" | "free" | "starter" | "pro" | "team" | "enterprise";
  // Present on `tier === "demo"` (always) and on `tier === "free"` callers
  // above ~80% of their daily cap. Absent on paid tiers.
  upgrade_url?: string;
}

export interface ResponseEnvelope<T> {
  data: T;
  attribution: { citations: Citation[] }; // citations[0] is primary
  meta: EnvelopeMeta;
}

/**
 * Resolve the final envelope status. Tool authors may set `status` explicitly;
 * otherwise we auto-detect "unseeded" from empty payloads, falling back to
 * "complete". Return type is tightened to the canonical enum (no "error":
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

// Payload shapes as the API serves them (2026-11-01). Every field the API
// may leave empty is optional or nullable; tools pass the payload through.

/** One article as /v1/articles/search and /v1/articles/{slug} return it. */
export interface Article {
  id?: number;
  slug: string;
  title: string;
  summary: string | null;
  author?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  canonical_url?: string | null;
  published_at: string | null;
  ingested_at?: string | null;
  topics?: string[];
  tickers?: string[];
  entities: string[];
  sentiment_bucket?: string | null;
  sentiment_score?: number | null;
  /** Full text, on /v1/articles/{slug} only. */
  body_md?: string | null;
}

/** An entity dossier (data.result on /v1/entities/{slug}). */
export interface Entity {
  slug: string;
  kind: "chain" | "project" | "person" | "ticker" | "protocol" | "exchange" | "fund" | string;
  display_name: string;
  ticker?: string | null;
  chain?: string | null;
  website?: string | null;
  twitter?: string | null;
  summary?: string | null;
  mention_count?: number | null;
  first_seen_at?: string | null;
  last_mentioned_at?: string | null;
  /** Fields the API filled in itself (display_name, ticker). */
  derived_fields?: string[];
  /** Set when the slug was resolved through an alias ("cz"). */
  resolved_from_alias?: string;
}

/** get_entity: a dossier by slug, or the entity list for a ticker. */
export interface EntityLookup {
  result?: Entity;
  results?: Entity[];
  count?: number;
  total?: number;
}

/** A course (with its lesson index) or a lesson with its body_md. */
export interface Explainer {
  slug?: string;
  course_slug?: string;
  title?: string;
  summary?: string | null;
  body_md?: string | null;
  level?: "beginner" | "intermediate" | "advanced" | string;
  topics?: string[];
  site_url?: string | null;
  result_type?: "lesson" | string;
  matched_by?: string;
}

/** get_explainer: one course or lesson, or the matches for a topic. */
export interface ExplainerLookup {
  result?: Explainer;
  results?: Explainer[];
  count?: number;
  total?: number;
}

export interface SearchNewsResult {
  query?: string | null;
  count?: number;
  total: number;
  limit?: number;
  offset?: number;
  results: Article[];
}
