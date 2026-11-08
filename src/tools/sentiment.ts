/**
 * Sentiment tools (category 4). Editorial + social + market-wide.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

const windowEnum = z.enum(["1d", "7d", "30d", "90d"]);

// --- get_sentiment ---------------------------------------------------------
export const getSentimentInputSchema = z.object({
  entity_slug: slugSchema("entity_slug").describe("Entity slug."),
  window: windowEnum.default("7d").describe("Rolling window."),
});
export const getSentimentDefinition = {
  name: "get_sentiment",
  description:
    "Sentiment bucket (bullish, bearish, neutral or mixed) for an entity over 1d, 7d, 30d or 90d, rolled up hourly from the news BCA ingests and BCA's own articles: mention counts, mean score and the top bullish and bearish articles (drivers). Unseeded when no article mentions the entity in the window, stale when its newest window closed hours ago. Works without an API key.",
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
  entity_slug: slugSchema("entity_slug"),
  window: windowEnum.default("7d"),
});
export const getSocialPulseDefinition = {
  name: "get_social_pulse",
  description:
    "How crypto Twitter is talking about an entity: CT sentiment score (-1 to 1), label, mention trend, bull and bear points, narratives, and notable posts, from a live read. BCA analysis in its own words, with X post URLs as citations. Partial when the daily budget for live reads is spent or the source is down. Pro tier.",
};
export async function runGetSocialPulse(
  input: z.infer<typeof getSocialPulseInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/sentiment/social`, {
    entity_slug: input.entity_slug,
    window: input.window,
  });
}

// --- get_ct_pulse ----------------------------------------------------------
export const getCtPulseInputSchema = z.object({
  topic: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9 $.-]+$/, "letters, digits, spaces, $ . - only")
    .optional()
    .describe("Optional focus: a token, sector or theme (e.g. 'solana', 'restaking'). Omit for the whole market."),
});
export const getCtPulseDefinition = {
  name: "get_ct_pulse",
  description:
    "What crypto Twitter is saying over the last 24h: one-line takeaway, top stories, narratives heating or cooling, hard numbers with their source URL, and notable posts from credible accounts. Without a topic it returns the latest scheduled market snapshot and never makes a live read: stale (meta.status) once the snapshot is older than 6 hours, unseeded when none exists. With a topic it makes a live read. BCA analysis plus X post links, never reposted post text. Pro tier.",
};
export async function runGetCtPulse(
  input: z.infer<typeof getCtPulseInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/social/ct-pulse`, input.topic ? { topic: input.topic } : {});
}

// --- get_x_signals ---------------------------------------------------------
export const getXSignalsInputSchema = z.object({
  lane: z
    .enum(["security", "news", "keyword"])
    .optional()
    .describe("security = hacks/exploits/drains; news = exchanges, regulators, ETF data; keyword = open search. Omit for all."),
  hours: z.number().int().min(1).max(168).default(24).describe("Lookback window in hours."),
  limit: z.number().int().min(1).max(100).default(50).describe("Max stories."),
});
export const getXSignalsDefinition = {
  name: "get_x_signals",
  description:
    "Breaking crypto stories from posts on X by vetted accounts (security researchers, exchanges, regulators, ETF analysts) plus an open keyword sweep. Each story: headline, summary, event type, the accounts and post URLs behind it, confidence, and whether onchain evidence was cited. latest_signal_at is the newest stored signal; an empty window answers stale when older signals exist (the sweep is behind or the lane is paused) and unseeded when none are stored. Pro tier.",
};
export async function runGetXSignals(
  input: z.infer<typeof getXSignalsInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const params: Record<string, string | number> = { hours: input.hours, limit: input.limit };
  if (input.lane) params.lane = input.lane;
  return getClient().request(`/v1/social/x-signals`, params);
}

// --- get_kol_consensus -----------------------------------------------------
export const getKolConsensusInputSchema = z.object({
  token: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "ticker letters/digits only")
    .optional()
    .describe("Ticker (e.g. 'BTC'). Omit for every token in the latest snapshot."),
});
export const getKolConsensusDefinition = {
  name: "get_kol_consensus",
  description:
    "Where credible crypto Twitter analysts, traders and researchers stand on the most-covered tokens, from the latest scheduled 24h snapshot: stance (bullish, bearish, mixed or neutral), bull and bear account counts, key points, and post links. Stale once the snapshot is older than 24 hours; unseeded for a token the snapshot does not cover (topic lists the tokens it covers). Pro tier.",
};
export async function runGetKolConsensus(
  input: z.infer<typeof getKolConsensusInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/social/kol-consensus`, input.token ? { token: input.token } : {});
}

// --- get_fear_greed --------------------------------------------------------
export const getFearGreedInputSchema = z.object({
  days: z.number().int().min(1).max(365).default(30).describe("Lookback days."),
});
export const getFearGreedDefinition = {
  name: "get_fear_greed",
  description:
    "Crypto Fear & Greed Index from Alternative.me: daily readings (value and classification), newest first, for up to 365 days. Works without an API key.",
};
export async function runGetFearGreed(
  input: z.infer<typeof getFearGreedInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/sentiment/fear-greed`, { days: input.days });
}
