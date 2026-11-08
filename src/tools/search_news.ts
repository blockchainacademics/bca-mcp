import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema, tickerSchema } from "../schema.js";
import { fenceFields, payloadRows } from "../untrusted.js";
import type { ResponseEnvelope, SearchNewsResult } from "../types.js";

export const searchNewsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(512)
    .describe("Full-text search query (1-512 chars)."),
  entity: slugSchema("entity")
    .optional()
    .describe("Entity slug filter (e.g. 'ethereum', 'circle')."),
  ticker: tickerSchema()
    .optional()
    .describe("Ticker filter (e.g. 'ETH', 'SOL'): articles tagged with that coin."),
  // The API parses this as a datetime and also takes a bare date
  // (2026-10-01), so the client checks only the length, as for
  // list_entity_mentions.since; a value the API cannot read is its 422.
  since: z
    .string()
    .max(64)
    .optional()
    .describe(
      "ISO 8601 date; return articles published on or after this timestamp.",
    ),
  topic: slugSchema("topic")
    .optional()
    .describe("Topic filter (e.g. 'regulation', 'defi')."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Max results (default 10, max 50)."),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Results to skip, for paging (default 0). meta.pageInfo.hasNextPage says whether more exist."),
});

export type SearchNewsInput = z.infer<typeof searchNewsInputSchema>;

export const searchNewsDefinition = {
  name: "search_news",
  description:
    "Full text search across 3,800+ editorial crypto articles from the Blockchain Academics corpus. Each hit carries title, summary, source, publish date, topics, tickers and entity slugs, with the article as its citation. Filter by entity, ticker, topic or a since date, and page with offset. Covers recent crypto events, projects, tokens, regulation, protocols and people. Answers unseeded (meta.status) when nothing matches. Works without an API key.",
};

export async function runSearchNews(
  input: SearchNewsInput,
): Promise<ResponseEnvelope<SearchNewsResult>> {
  const client = getClient();
  const res = await client.request<SearchNewsResult>("/v1/articles/search", {
    q: input.query,
    entity: input.entity,
    ticker: input.ticker,
    since: input.since,
    topic: input.topic,
    limit: input.limit,
    offset: input.offset,
  });
  // A-3: wrap third-party article summaries so an LLM consumer treats them
  // as data, not instructions. Only the `summary` field flows from external
  // article bodies; titles/slugs are editorial metadata. The rows are under
  // data.results (data.articles in the old shape).
  for (const row of payloadRows(res?.data, "articles")) {
    fenceFields(row, ["summary"], "search_news");
  }
  return res;
}
