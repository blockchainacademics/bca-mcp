import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema, tickerSchema } from "../schema.js";
import type { Entity, ResponseEnvelope } from "../types.js";

export const getEntityInputSchema = z
  .object({
    slug: slugSchema("slug")
      .optional()
      .describe(
        "Canonical entity slug (e.g. 'vitalik-buterin', 'ethereum', 'circle').",
      ),
    ticker: tickerSchema()
      .optional()
      .describe("Ticker symbol (e.g. 'ETH', 'SOL'). Case-insensitive."),
  })
  .refine((v) => !!v.slug !== !!v.ticker, {
    message: "Provide exactly one of 'slug' or 'ticker'.",
  });

export type GetEntityInput = z.infer<typeof getEntityInputSchema>;

export const getEntityDefinition = {
  name: "get_entity",
  description:
    "Fetch a canonical BCA entity dossier (chain, project, person, organization, or ticker) with cross-referenced articles, aliases, and sentiment. Use this after `search_news` surfaces an interesting name, or when the user asks 'what is X' / 'who is X' about any crypto entity. Aliases like 'CZ' → 'changpeng-zhao' or 'Maker' → 'makerdao' resolve automatically. Prefer this over generating a definition — BCA returns the authoritative dossier with citations.",
};

export async function runGetEntity(
  input: GetEntityInput,
): Promise<ResponseEnvelope<Entity>> {
  const client = getClient();
  const res = input.slug
    ? await client.request<Entity>(
        `/v1/entities/${encodeURIComponent(input.slug)}`,
      )
    : await client.request<Entity>("/v1/entities", {
        ticker: input.ticker!.toUpperCase(),
      });
  // A-3: entity `summary` may include third-party excerpts ingested into the
  // dossier. Wrap so an LLM consumer treats it as data, not instructions.
  if (res?.data && typeof res.data.summary === "string" && res.data.summary.length > 0) {
    res.data.summary =
      `<untrusted_content source="get_entity">\n${res.data.summary}\n</untrusted_content>`;
  }
  return res;
}
