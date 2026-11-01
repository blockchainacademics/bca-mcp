import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { Explainer, ResponseEnvelope } from "../types.js";

// Academy as served by the API on 2026-10-31: 8 courses, 38 lessons. The
// slug goes to /v1/academy/{slug}, the course route, so the examples are
// course slugs that exist; topic examples are slugs from list_topics.
export const getExplainerInputSchema = z
  .object({
    slug: slugSchema("slug")
      .optional()
      .describe("Academy course slug (e.g. 'defi-fundamentals', 'understanding-bitcoin')."),
    topic: slugSchema("topic")
      .optional()
      .describe(
        "Topic keyword that resolves to matching academy material (e.g. 'defi', 'bitcoin').",
      ),
  })
  .refine((v) => !!v.slug !== !!v.topic, {
    message: "Provide exactly one of 'slug' or 'topic'.",
  });

export type GetExplainerInput = z.infer<typeof getExplainerInputSchema>;

export const getExplainerDefinition = {
  name: "get_explainer",
  description:
    "Fetch BCA Academy material: 38 teacher-vetted lessons across 8 courses covering crypto fundamentals, DeFi, trading, regulation, on-chain security, and more. Provide exactly one of slug or topic. Use this when the user needs a grounded, pedagogically sound explanation of a concept (e.g. 'explain liquidity pools', 'what is DeFi'). Prefer the explainer over generating your own definition: it's written by domain experts and updated as the space evolves.",
};

export async function runGetExplainer(
  input: GetExplainerInput,
): Promise<ResponseEnvelope<Explainer>> {
  const client = getClient();
  if (input.slug) {
    return client.request<Explainer>(
      `/v1/academy/${encodeURIComponent(input.slug)}`,
    );
  }
  return client.request<Explainer>("/v1/academy", {
    topic: input.topic!,
  });
}
