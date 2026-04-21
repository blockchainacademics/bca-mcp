import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { Explainer, ResponseEnvelope } from "../types.js";

export const getExplainerInputSchema = z
  .object({
    slug: slugSchema("slug")
      .optional()
      .describe("Academy lesson slug (e.g. 'what-is-a-blockchain')."),
    topic: slugSchema("topic")
      .optional()
      .describe(
        "Topic keyword — resolves to the canonical lesson (e.g. 'liquidity-pools').",
      ),
  })
  .refine((v) => !!v.slug !== !!v.topic, {
    message: "Provide exactly one of 'slug' or 'topic'.",
  });

export type GetExplainerInput = z.infer<typeof getExplainerInputSchema>;

export const getExplainerDefinition = {
  name: "get_explainer",
  description:
    "Fetch a canonical BCA Academy lesson — 43 teacher-vetted lessons across 9 courses covering crypto fundamentals, DeFi, trading, regulation, on-chain security, and more. Use this when the user needs a grounded, pedagogically sound explanation of a concept (e.g. 'explain liquidity pools', 'what is a rollup'). Prefer the explainer over generating your own definition — it's written by domain experts and updated as the space evolves.",
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
