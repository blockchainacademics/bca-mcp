/**
 * Content & corpus tools (category 1). Wraps /v1/articles, /v1/entities,
 * /v1/topics, /v1/academy endpoints. All read-only, all editorial corpus.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

/**
 * Wrap a free-text field that originated from external sources (article
 * bodies, excerpts) so the consuming LLM treats it as data, not instructions.
 */
function wrapUntrusted(source: string, s: unknown): string | undefined {
  if (typeof s !== "string" || s.length === 0) return s as undefined;
  return `<untrusted_content source="${source}">\n${s}\n</untrusted_content>`;
}

// --- get_article -----------------------------------------------------------
export const getArticleInputSchema = z.object({
  slug: slugSchema("slug").describe("Article slug."),
});
export const getArticleDefinition = {
  name: "get_article",
  description:
    "Fetch a single editorial crypto article by slug: full body, citations, entity graph, and attribution metadata. Use after search_news when you need the full text.",
};
export async function runGetArticle(
  input: z.infer<typeof getArticleInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const res = await getClient().request(
    `/v1/articles/${encodeURIComponent(input.slug)}`,
  );
  // A-3: wrap third-party article body/excerpt fields.
  const data = res?.data as Record<string, unknown> | undefined;
  if (data) {
    for (const key of ["body", "excerpt", "body_markdown", "summary"]) {
      if (typeof data[key] === "string") {
        data[key] = wrapUntrusted("get_article", data[key]);
      }
    }
  }
  return res;
}

// --- list_entity_mentions --------------------------------------------------
export const listEntityMentionsInputSchema = z.object({
  slug: slugSchema("slug").describe("Entity slug (chain, project, person, ticker)."),
  since: z.string().max(64).optional().describe("ISO 8601 lower bound for published_at."),
  limit: z.number().int().min(1).max(200).default(50).describe("Max mentions (default 50)."),
});
export const listEntityMentionsDefinition = {
  name: "list_entity_mentions",
  description:
    "Timeline of editorial mentions for an entity: sentiment score, sentiment bucket, and article linkback per mention. Use this to reconstruct narrative arc over time.",
};
export async function runListEntityMentions(
  input: z.infer<typeof listEntityMentionsInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const res = await getClient().request(
    `/v1/entities/${encodeURIComponent(input.slug)}/mentions`,
    { since: input.since, limit: input.limit },
  );
  // A-3: mentions may expose third-party article excerpts.
  const data = res?.data as Record<string, unknown> | undefined;
  const mentions = (data?.mentions ?? data) as unknown;
  if (Array.isArray(mentions)) {
    for (const m of mentions) {
      if (m && typeof m === "object") {
        const row = m as Record<string, unknown>;
        for (const key of ["excerpt", "snippet", "body"]) {
          if (typeof row[key] === "string") {
            row[key] = wrapUntrusted("list_entity_mentions", row[key]);
          }
        }
      }
    }
  }
  return res;
}

// --- list_topics -----------------------------------------------------------
export const listTopicsInputSchema = z.object({});
export const listTopicsDefinition = {
  name: "list_topics",
  description:
    "Browse the BCA topic taxonomy (regulation, defi, infra, memecoins, security, etc.). Use to discover filter values for search_news.",
};
export async function runListTopics(
  _input: z.infer<typeof listTopicsInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/topics`);
}

// --- get_as_of_snapshot ----------------------------------------------------
export const getAsOfSnapshotInputSchema = z.object({
  as_of: z
    .string()
    .max(64)
    .describe("ISO 8601 timestamp — corpus state at this date (Enterprise tier)."),
  query: z.string().min(1).max(512).optional().describe("Optional search query."),
  entity: slugSchema("entity").optional().describe("Optional entity slug filter."),
  limit: z.number().int().min(1).max(50).default(20),
});
export const getAsOfSnapshotDefinition = {
  name: "get_as_of_snapshot",
  description:
    "Time-travel query: return the corpus state as it existed at a specific historical date. Enterprise tier. Useful for backtesting and audit trails.",
};
export async function runGetAsOfSnapshot(
  input: z.infer<typeof getAsOfSnapshotInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/articles/search`, {
    as_of: input.as_of,
    q: input.query,
    entity: input.entity,
    limit: input.limit,
  });
}
