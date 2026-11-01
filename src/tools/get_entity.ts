import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema, tickerSchema } from "../schema.js";
import { fenceFields, payloadRows } from "../untrusted.js";
import type { EntityLookup, ResponseEnvelope } from "../types.js";

export const getEntityInputSchema = z
  .object({
    slug: slugSchema("slug")
      .optional()
      .describe(
        "Entity slug or a known alias in slug form (e.g. 'vitalik-buterin', 'ethereum', 'cz').",
      ),
    ticker: tickerSchema()
      .optional()
      .describe("Ticker symbol (e.g. 'ETH', 'SOL'), case-insensitive. Needs an API key: the demo key covers the slug form only."),
  })
  .refine((v) => !!v.slug !== !!v.ticker, {
    message: "Provide exactly one of 'slug' or 'ticker'.",
  });

export type GetEntityInput = z.infer<typeof getEntityInputSchema>;

// The ticker form stays on /v1/entities?ticker=: the slug route resolves
// slugs and entity_aliases only (app/api/v1/entities.py _resolve_entity),
// so 'ETH' there finds the bare ticker dossier, not the entities the ticker
// points at, and an unlisted symbol is a 404. The list route matches the
// ticker column, ticker dossiers and linked currencies, but it is not on the
// demo allowlist, so the ticker form needs a key.
export const getEntityDefinition = {
  name: "get_entity",
  description:
    "Fetch a BCA entity dossier (chain, project, person or ticker): name, kind, ticker, chain, website and X handle, summary when there is one, mention count and first and last mention dates. Provide exactly one of slug or ticker. Aliases in slug form resolve to the canonical entity ('cz' to changpeng-zhao, 'maker' to makerdao) and the answer names the alias it came from. The ticker form returns every entity that matches the ticker (the ticker dossier and the chain or project it maps to) and needs an API key; the slug form works without one. Many dossiers are still thin: meta.status partial, with meta.diagnostic.missing naming what is absent (summary, mentions). Use this after search_news surfaces a name, or when the user asks 'what is X' or 'who is X'.",
};

export async function runGetEntity(
  input: GetEntityInput,
): Promise<ResponseEnvelope<EntityLookup>> {
  const client = getClient();
  const res = input.slug
    ? await client.request<EntityLookup>(
        `/v1/entities/${encodeURIComponent(input.slug)}`,
      )
    : await client.request<EntityLookup>("/v1/entities", {
        ticker: input.ticker!.toUpperCase(),
      });
  // A-3: an entity `summary` may include third-party excerpts ingested into
  // the dossier. Wrap so an LLM consumer treats it as data, not
  // instructions. The dossier is data.result on the slug route and the rows
  // are data.results on the ticker route (data itself in the old shape).
  const data = res?.data as Record<string, unknown> | undefined;
  if (data && typeof data === "object") {
    fenceFields(data["result"], ["summary"], "get_entity");
    for (const row of payloadRows(data)) fenceFields(row, ["summary"], "get_entity");
    fenceFields(data, ["summary"], "get_entity");
  }
  return res;
}
