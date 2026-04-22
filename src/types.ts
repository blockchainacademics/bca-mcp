export type EnvelopeStatus = "complete" | "unseeded" | "partial" | "error";

export interface ResponseEnvelope<T> {
  data: T;
  status?: EnvelopeStatus; // optional for tool authors; middleware default-fills to "complete"
  cite_url?: string;
  as_of?: string; // ISO 8601
  source_hash?: string;
  meta?: Record<string, unknown>;
}

/**
 * Resolve the final envelope status. Tool authors may set `status` explicitly;
 * otherwise we auto-detect "unseeded" from empty payloads, falling back to "complete".
 * Middleware uses this to guarantee every wire response carries a status field.
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
