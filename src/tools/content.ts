/**
 * Content & corpus tools (category 1). Wraps /v1/articles, /v1/entities,
 * /v1/topics, /v1/academy endpoints. All read-only, all editorial corpus.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

// --- get_article -----------------------------------------------------------
export const getArticleInputSchema = z.object({
  slug: z.string().min(1).max(240).describe("Article slug."),
});
export const getArticleDefinition = {
  name: "get_article",
  description:
    "Fetch a single editorial crypto article by slug: full body, citations, entity graph, and attribution metadata. Use after search_news when you need the full text.",
};
export async function runGetArticle(
  input: z.infer<typeof getArticleInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/articles/${encodeURIComponent(input.slug)}`);
}

// --- list_entity_mentions --------------------------------------------------
export const listEntityMentionsInputSchema = z.object({
  slug: z.string().min(1).max(240).describe("Entity slug (chain, project, person, ticker)."),
  since: z.string().optional().describe("ISO 8601 lower bound for published_at."),
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
  return getClient().request(
    `/v1/entities/${encodeURIComponent(input.slug)}/mentions`,
    { since: input.since, limit: input.limit },
  );
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
    .describe("ISO 8601 timestamp — corpus state at this date (Enterprise tier)."),
  query: z.string().min(1).max(512).optional().describe("Optional search query."),
  entity: z.string().optional().describe("Optional entity slug filter."),
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
