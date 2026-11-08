/**
 * Proprietary indicator tools (category 5): BCA's composites, built on
 * free data plus the editorial corpus.
 *
 * Each indicator is computed for its own windows only (app/indicators/*.py
 * on the API); any other window is a 422, so each schema offers exactly
 * those: coverage index and narrative strength 7d, 30d and 90d; sentiment
 * velocity 7d and 30d; editorial premium and KOL influence 30d and 90d.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

type IndicatorWindow = "7d" | "30d" | "90d";

// What meta.status means on every indicator tool (app/api/v1/indicators.py).
const STATUS_NOTE =
  "meta.status is unseeded when there is no measurement yet (data.value is then a placeholder), partial when some inputs were defaulted (meta.diagnostic.missing) and stale when the newest value is over 48 hours old. An unknown entity is an error (HTTP 404).";

function indicatorTool(
  path: string,
  windows: readonly [IndicatorWindow, ...IndicatorWindow[]],
  defaultWindow: IndicatorWindow,
) {
  const schema = z.object({
    entity_slug: slugSchema("entity_slug").describe("Entity slug."),
    window: z
      .enum(windows as unknown as [IndicatorWindow, ...IndicatorWindow[]])
      .default(defaultWindow)
      .describe(`Rolling window: ${windows.join(", ")}.`),
  });
  return {
    schema,
    run: async (input: z.infer<typeof schema>): Promise<ResponseEnvelope<unknown>> =>
      getClient().request(path, {
        entity_slug: input.entity_slug,
        window: input.window,
      }),
  };
}

// --- get_coverage_index ----------------------------------------------------
const coverageIndex = indicatorTool("/v1/indicators/coverage", ["7d", "30d", "90d"], "7d");
export const getCoverageIndexInputSchema = coverageIndex.schema;
export const getCoverageIndexDefinition = {
  name: "get_coverage_index",
  description:
    `BCA Coverage Index: a recency-weighted count of BCA article mentions of the entity over 7d, 30d or 90d, recomputed every 4 hours. Unseeded when the entity had no mentions in the window. Pro tier. ${STATUS_NOTE}`,
};
export const runGetCoverageIndex = coverageIndex.run;

// --- get_narrative_strength ------------------------------------------------
const narrativeStrength = indicatorTool("/v1/indicators/narrative", ["7d", "30d", "90d"], "7d");
export const getNarrativeStrengthInputSchema = narrativeStrength.schema;
export const getNarrativeStrengthDefinition = {
  name: "get_narrative_strength",
  description:
    `Narrative strength of an entity: its eigenvector centrality in the BCA co-mention graph over 7d, 30d or 90d, a gauge of whether its narrative is consolidating or fading. Unseeded when the entity is absent from the window's graph. Pro tier. ${STATUS_NOTE}`,
};
export const runGetNarrativeStrength = narrativeStrength.run;

// --- get_sentiment_velocity ------------------------------------------------
const sentimentVelocity = indicatorTool("/v1/indicators/sentiment-velocity", ["7d", "30d"], "7d");
export const getSentimentVelocityInputSchema = sentimentVelocity.schema;
export const getSentimentVelocityDefinition = {
  name: "get_sentiment_velocity",
  description:
    `Rate of change of an entity's sentiment (the smoothed derivative of its daily sentiment) over 7d or 30d: positive while sentiment rises, negative while it falls. Unseeded until the window holds two daily sentiment samples. Pro tier. ${STATUS_NOTE}`,
};
export const runGetSentimentVelocity = sentimentVelocity.run;

// --- get_editorial_premium -------------------------------------------------
const editorialPremium = indicatorTool("/v1/indicators/editorial-premium", ["30d", "90d"], "30d");
export const getEditorialPremiumInputSchema = editorialPremium.schema;
export const getEditorialPremiumDefinition = {
  name: "get_editorial_premium",
  description:
    `Correlation of price return to coverage change, lagged -1 to +3 days, over 30d or 90d: whether BCA coverage leads price. Unseeded until at least 8 paired days of price and coverage exist. Pro tier. ${STATUS_NOTE}`,
};
export const runGetEditorialPremium = editorialPremium.run;

// --- get_kol_influence -----------------------------------------------------
const kolInfluence = indicatorTool("/v1/indicators/kol-influence", ["30d", "90d"], "30d");
export const getKolInfluenceInputSchema = kolInfluence.schema;
export const getKolInfluenceDefinition = {
  name: "get_kol_influence",
  description:
    "KOL influence score (reach, engagement and historical pick accuracy) over 30d or 90d. Not available on the hosted API yet: its input, a private KOL roster, is not deployed there, so every call answers unseeded with that reason. Pro tier.",
};
export const runGetKolInfluence = kolInfluence.run;

// --- get_risk_score --------------------------------------------------------
export const getRiskScoreInputSchema = z.object({
  entity_slug: slugSchema("entity_slug"),
});
export const getRiskScoreDefinition = {
  name: "get_risk_score",
  description:
    "Composite risk score from 0 to 1, higher is riskier, built from regulatory, liquidity, team and audit inputs; components.sources names where each input came from. meta.status is partial when inputs are missing, listed in meta.diagnostic.missing (regulatory usually is), unseeded when none is available and stale when the score is over 48 hours old. An unknown entity is an error (HTTP 404). Starter tier.",
};
export async function runGetRiskScore(
  input: z.infer<typeof getRiskScoreInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/indicators/risk`, {
    entity_slug: input.entity_slug,
  });
}
