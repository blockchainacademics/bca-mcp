export interface ResponseEnvelope<T> {
  data: T;
  cite_url?: string;
  as_of?: string; // ISO 8601
  source_hash?: string;
  meta?: Record<string, unknown>;
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
