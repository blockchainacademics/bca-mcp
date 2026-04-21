/**
 * Market data tools (category 2). Wraps /v1/market/* — aggregated via CoinGecko +
 * DexScreener free tiers. Shapes match backend query-string API, not path API.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

// --- get_price -------------------------------------------------------------
export const getPriceInputSchema = z.object({
  ids: z
    .string()
    .min(1)
    .max(512)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*)*$/,
      "ids must be comma-separated kebab-case CoinGecko IDs",
    )
    .describe("CoinGecko id(s), comma-separated. E.g. 'bitcoin,ethereum'."),
  vs: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[a-zA-Z0-9]{1,16}$/, "vs must be 1-16 alphanumerics")
    .default("usd")
    .describe("Quote currency (default usd)."),
});
export const getPriceDefinition = {
  name: "get_price",
  description:
    "Spot price + 24h/7d/30d change for one or more tokens, via CoinGecko. Use 'bitcoin', 'ethereum' CoinGecko IDs, not exchange tickers.",
};
export async function runGetPrice(
  input: z.infer<typeof getPriceInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/market/price`, { ids: input.ids, vs: input.vs });
}

// --- get_ohlc --------------------------------------------------------------
export const getOhlcInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case CoinGecko id")
    .describe("CoinGecko id (e.g. 'bitcoin')."),
  days: z.number().int().min(1).max(365).default(30).describe("Lookback days (1-365)."),
  vs: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[a-zA-Z0-9]{1,16}$/, "vs must be 1-16 alphanumerics")
    .default("usd"),
});
export const getOhlcDefinition = {
  name: "get_ohlc",
  description:
    "OHLC candlestick history for a token. Starter tier. Useful for technical-setup agents and backtesting.",
};
export async function runGetOhlc(
  input: z.infer<typeof getOhlcInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/market/ohlc`, {
    id: input.id,
    days: input.days,
    vs: input.vs,
  });
}

// --- get_market_overview ---------------------------------------------------
export const getMarketOverviewInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe("Top N by mcap."),
});
export const getMarketOverviewDefinition = {
  name: "get_market_overview",
  description:
    "Top-N tokens by market cap with volume, 24h change, and category tags. Use for market-wide context (bull/bear, mover spotting).",
};
export async function runGetMarketOverview(
  input: z.infer<typeof getMarketOverviewInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/market/overview`, { limit: input.limit });
}

// --- get_pair_data ---------------------------------------------------------
export const getPairDataInputSchema = z.object({
  chain: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "chain must be kebab-case slug")
    .describe("Chain slug (e.g. 'ethereum', 'solana', 'bsc')."),
  pair: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9]+$/, "pair must be alphanumeric address")
    .describe("Pair contract address."),
});
export const getPairDataDefinition = {
  name: "get_pair_data",
  description:
    "DEX pair analytics: liquidity, 24h volume, pair age, price. Via DexScreener. Starter tier.",
};
export async function runGetPairData(
  input: z.infer<typeof getPairDataInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/market/pair`, { chain: input.chain, pair: input.pair });
}
