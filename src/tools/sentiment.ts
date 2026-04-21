/**
 * Sentiment tools (category 4). Editorial + social + market-wide.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

const windowEnum = z.enum(["1d", "7d", "30d", "90d"]);

// --- get_sentiment ---------------------------------------------------------
export const getSentimentInputSchema = z.object({
  entity_slug: z.string().min(1).describe("Entity slug."),
  window: windowEnum.default("7d").describe("Rolling window."),
});
export const getSentimentDefinition = {
  name: "get_sentiment",
  description:
    "BCA editorial sentiment bucket (bullish/bearish/neutral/mixed) for an entity with bucket drivers.",
};
export async function runGetSentiment(
  input: z.infer<typeof getSentimentInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/sentiment`, {
    entity_slug: input.entity_slug,
    window: input.window,
  });
}

// --- get_social_pulse ------------------------------------------------------
export const getSocialPulseInputSchema = z.object({
  entity_slug: z.string().min(1),
  window: windowEnum.default("7d"),
});
export const getSocialPulseDefinition = {
  name: "get_social_pulse",
  description:
    "Social velocity: mentions, engagement, sentiment across Twitter/Reddit/Discord. Pro tier. Returns BCA_NOT_IMPLEMENTED if social ingest not yet wired.",
};
export async function runGetSocialPulse(
  input: z.infer<typeof getSocialPulseInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/sentiment/social`, {
    entity_slug: input.entity_slug,
    window: input.window,
  });
}

// --- get_fear_greed --------------------------------------------------------
export const getFearGreedInputSchema = z.object({
  days: z.number().int().min(1).max(365).default(30).describe("Lookback days."),
});
export const getFearGreedDefinition = {
  name: "get_fear_greed",
  description:
    "Crypto Fear & Greed Index (Alternative.me) — historical series + BCA interpretation.",
};
export async function runGetFearGreed(
  input: z.infer<typeof getFearGreedInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/sentiment/fear-greed`, { days: input.days });
}
