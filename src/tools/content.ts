/**
 * Content & corpus tools (category 1). Wraps /v1/articles, /v1/entities,
 * /v1/topics, /v1/academy endpoints. All read-only, all editorial corpus.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import { fenceFields, payloadRows } from "../untrusted.js";
import type { ResponseEnvelope } from "../types.js";

// --- get_article -----------------------------------------------------------
export const getArticleInputSchema = z.object({
  slug: slugSchema("slug").describe("Article slug (from search_news)."),
});
export const getArticleDefinition = {
  name: "get_article",
  description:
    "Fetch one BCA article by slug: title, summary, full text (body_md), author, source, publish date, topics, tickers and entity slugs, with the article as its citation. This is the full text behind a search_news hit. An unknown slug is an error (HTTP 404). Works without an API key.",
};
// Text fields that come from the article itself (body, summary, excerpt).
const ARTICLE_TEXT_FIELDS = ["body_md", "body", "excerpt", "body_markdown", "summary"];
export async function runGetArticle(
  input: z.infer<typeof getArticleInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const res = await getClient().request(
    `/v1/articles/${encodeURIComponent(input.slug)}`,
  );
  // A-3: wrap third-party article body/excerpt fields. The article is
  // data.result (data itself in the old shape).
  const data = res?.data as Record<string, unknown> | undefined;
  if (data && typeof data === "object") {
    fenceFields(data["result"], ARTICLE_TEXT_FIELDS, "get_article");
    fenceFields(data, ARTICLE_TEXT_FIELDS, "get_article");
  }
  return res;
}

// --- list_entity_mentions --------------------------------------------------
export const listEntityMentionsInputSchema = z.object({
  slug: slugSchema("slug").describe("Entity slug or alias (chain, project, person, ticker)."),
  since: z.string().max(64).optional().describe("ISO 8601 lower bound for published_at."),
  limit: z.number().int().min(1).max(100).default(50).describe("Max mentions (default 50, max 100)."),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Mentions to skip, for paging (default 0). meta.pageInfo.hasNextPage says whether more exist."),
});
export const listEntityMentionsDefinition = {
  name: "list_entity_mentions",
  description:
    "Timeline of BCA article mentions for an entity (slug or alias), newest first: article slug, title and source URL, publish date, sentiment score and bucket, mentions in the article and a context snippet. Page with offset. Shows how coverage of a chain, project, person or ticker changed over time. Answers unseeded when no public article mentions the entity yet; an unknown entity is an error (HTTP 404).",
};
export async function runListEntityMentions(
  input: z.infer<typeof listEntityMentionsInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const res = await getClient().request(
    `/v1/entities/${encodeURIComponent(input.slug)}/mentions`,
    { since: input.since, limit: input.limit, offset: input.offset },
  );
  // A-3: mentions carry a snippet of third-party article text. The rows are
  // data.results (data.mentions or data itself in the old shapes).
  for (const row of payloadRows(res?.data, "mentions")) {
    fenceFields(row, ["context_snippet", "excerpt", "snippet", "body"], "list_entity_mentions");
  }
  return res;
}

// --- list_topics -----------------------------------------------------------
export const listTopicsInputSchema = z.object({});
export const listTopicsDefinition = {
  name: "list_topics",
  description:
    "Browse the BCA topic taxonomy: regulation, defi, nft, layer-2, bitcoin, ethereum, solana, stablecoins, rwa and ai-agents. Each topic comes with its live article count and child topics, and its slug is a topic filter value for search_news.",
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
    .describe("ISO 8601 timestamp: corpus state at this date."),
  query: z.string().min(1).max(512).optional().describe("Optional search query."),
  entity: slugSchema("entity").optional().describe("Optional entity slug filter."),
  limit: z.number().int().min(1).max(50).default(20),
});
export const getAsOfSnapshotDefinition = {
  name: "get_as_of_snapshot",
  description:
    "Time-travel query: the article corpus as it stood at a past date, meaning only the articles BCA had ingested by as_of, optionally narrowed by a search query and an entity slug. Useful for backtesting and audit trails. Free, and works without an API key. Answers unseeded when nothing matches.",
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
