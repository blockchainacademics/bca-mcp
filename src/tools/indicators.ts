/**
 * Proprietary indicator tools (category 5). BCA's defensible composites —
 * built on top of free data + editorial corpus, impossible to replicate.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

const windowEnum = z.enum(["1d", "7d", "30d", "90d"]);

function indicatorTool(
  path: string,
  requireWindow = true,
  defaultWindow: "1d" | "7d" | "30d" | "90d" = "7d",
) {
  const schema = z.object({
    entity_slug: slugSchema("entity_slug").describe("Entity slug."),
    ...(requireWindow
      ? {
          window: windowEnum
            .default(defaultWindow)
            .describe("Rolling window."),
        }
      : {}),
  });
  return {
    schema,
    run: async (input: any) =>
      getClient().request(path, {
        entity_slug: input.entity_slug,
        window: input.window,
      }),
  };
}

// --- get_coverage_index ----------------------------------------------------
export const getCoverageIndexInputSchema = indicatorTool(
  "/v1/indicators/coverage",
).schema;
export const getCoverageIndexDefinition = {
  name: "get_coverage_index",
  description:
    "BCA Coverage Index: mention velocity × source diversity × editorial weight. Pro tier. High = accumulation signal before price.",
};
export const runGetCoverageIndex = indicatorTool("/v1/indicators/coverage").run;

// --- get_narrative_strength ------------------------------------------------
export const getNarrativeStrengthInputSchema = indicatorTool(
  "/v1/indicators/narrative",
).schema;
export const getNarrativeStrengthDefinition = {
  name: "get_narrative_strength",
  description:
    "Co-mention graph centrality: which narratives are consolidating vs fading. Pro tier. Uses eigenvector centrality in rolling windows.",
};
export const runGetNarrativeStrength = indicatorTool(
  "/v1/indicators/narrative",
).run;

// --- get_sentiment_velocity ------------------------------------------------
export const getSentimentVelocityInputSchema = indicatorTool(
  "/v1/indicators/sentiment-velocity",
).schema;
export const getSentimentVelocityDefinition = {
  name: "get_sentiment_velocity",
  description:
    "d/dt of sentiment bucket with smoothing. Pro tier. Early reversal-detection signal.",
};
export const runGetSentimentVelocity = indicatorTool(
  "/v1/indicators/sentiment-velocity",
).run;

// --- get_editorial_premium -------------------------------------------------
// Backed only by 30d / 90d rollups today — 7d window isn't computed yet, so
// default to 30d here to avoid a 404 for agents that don't pass window.
export const getEditorialPremiumInputSchema = indicatorTool(
  "/v1/indicators/editorial-premium",
  true,
  "30d",
).schema;
export const getEditorialPremiumDefinition = {
  name: "get_editorial_premium",
  description:
    "Correlation of price return to coverage delta (lagged -1 to +3 days). Pro tier. Measures pre-coverage accumulation edge. Supported windows: 30d, 90d.",
};
export const runGetEditorialPremium = indicatorTool(
  "/v1/indicators/editorial-premium",
  true,
  "30d",
).run;

// --- get_kol_influence -----------------------------------------------------
// Same 30d/90d-only availability as editorial_premium. Default to 30d.
export const getKolInfluenceInputSchema = indicatorTool(
  "/v1/indicators/kol-influence",
  true,
  "30d",
).schema;
export const getKolInfluenceDefinition = {
  name: "get_kol_influence",
  description:
    "KOL influence score: reach × engagement × historical pick accuracy. Pro tier. Param: entity_slug (the KOL's canonical entity slug). Supported windows: 30d, 90d.",
};
export const runGetKolInfluence = indicatorTool(
  "/v1/indicators/kol-influence",
  true,
  "30d",
).run;

// --- get_risk_score --------------------------------------------------------
export const getRiskScoreInputSchema = z.object({
  entity_slug: slugSchema("entity_slug"),
});
export const getRiskScoreDefinition = {
  name: "get_risk_score",
  description:
    "Composite risk score: regulatory flags + liquidity tier + team risk + audit status. Starter tier. Single-number risk (0-1).",
};
export async function runGetRiskScore(
  input: z.infer<typeof getRiskScoreInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/indicators/risk`, {
    entity_slug: input.entity_slug,
  });
}
