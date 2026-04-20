import { z } from "zod";
import { getClient } from "../client.js";
import type { Entity, ResponseEnvelope } from "../types.js";

export const getEntityInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Canonical entity slug (e.g. 'vitalik-buterin', 'ethereum', 'circle').",
      ),
    ticker: z
      .string()
      .min(1)
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
  if (input.slug) {
    return client.request<Entity>(
      `/v1/entities/${encodeURIComponent(input.slug)}`,
    );
  }
  return client.request<Entity>("/v1/entities", {
    ticker: input.ticker!.toUpperCase(),
  });
}
