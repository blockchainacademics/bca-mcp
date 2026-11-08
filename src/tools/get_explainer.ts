import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ExplainerLookup, ResponseEnvelope } from "../types.js";

// Academy as served by the API on 2026-11-01: 8 courses, 38 lessons. The
// slug goes to /v1/academy/{slug}, which answers a course, else the lesson
// with that slug (the API form '02-decentralized-exchanges-dexs', the form
// without its NN- prefix, or the website's 'decentralized-exchanges'), else
// the closest lesson as partial. Topic examples are slugs from list_topics.
export const getExplainerInputSchema = z
  .object({
    slug: slugSchema("slug")
      .optional()
      .describe(
        "Academy course slug (e.g. 'defi-fundamentals', 'understanding-bitcoin') or lesson slug (e.g. 'decentralized-exchanges').",
      ),
    topic: slugSchema("topic")
      .optional()
      .describe(
        "Topic keyword that resolves to matching academy material (e.g. 'defi', 'bitcoin').",
      ),
  })
  .refine((v) => !!v.slug !== !!v.topic, {
    error: "Provide exactly one of 'slug' or 'topic'.",
  });

export type GetExplainerInput = z.infer<typeof getExplainerInputSchema>;

export const getExplainerDefinition = {
  name: "get_explainer",
  description:
    "Fetch BCA Academy material: 38 lessons across 8 courses covering crypto fundamentals, DeFi, trading, regulation and onchain security. Takes exactly one of slug or topic. A course slug returns the course and its lesson index; a lesson slug returns that lesson with its full text (body_md); an unknown slug returns the closest lesson as partial. A topic returns the courses tagged with it, or else the top matching lessons with their text. Applies to requests to explain a crypto concept, such as 'explain liquidity pools' or 'what is DeFi'. Works without an API key.",
};

export async function runGetExplainer(
  input: GetExplainerInput,
): Promise<ResponseEnvelope<ExplainerLookup>> {
  const client = getClient();
  if (input.slug) {
    return client.request<ExplainerLookup>(
      `/v1/academy/${encodeURIComponent(input.slug)}`,
    );
  }
  return client.request<ExplainerLookup>("/v1/academy", {
    topic: input.topic!,
  });
}
