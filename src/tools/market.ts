/**
 * Market data tools (category 2). Wraps /v1/market/*, aggregated via the
 * CoinGecko and DexScreener free tiers. Shapes match the backend
 * query-string API, not the path API.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

// The API's quote currency rule: 3 to 10 lowercase letters (usd, eur, btc).
const vsSchema = () =>
  z
    .string()
    .min(3)
    .max(10)
    .regex(/^[a-z]{3,10}$/, "vs must be 3-10 lowercase letters (e.g. 'usd', 'eur', 'btc')")
    .default("usd");

// --- get_price -------------------------------------------------------------
export const getPriceInputSchema = z.object({
  ids: z
    .string()
    .min(1)
    .max(512)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*){0,49}$/,
      "ids must be 1-50 comma-separated kebab-case CoinGecko IDs",
    )
    .describe("CoinGecko id(s), comma-separated, up to 50. E.g. 'bitcoin,ethereum'."),
  vs: vsSchema().describe("Quote currency, 3-10 lowercase letters (default usd)."),
});
export const getPriceDefinition = {
  name: "get_price",
  description:
    "Spot price, 24h change, market cap and 24h volume for up to 50 tokens, via CoinGecko. Use CoinGecko ids such as 'bitcoin' or 'ethereum', not exchange tickers. Works without an API key.",
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
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case CoinGecko id")
    .describe("CoinGecko id (e.g. 'bitcoin')."),
  days: z.number().int().min(1).max(365).default(30).describe("Lookback days (1-365)."),
  vs: vsSchema(),
});
export const getOhlcDefinition = {
  name: "get_ohlc",
  description:
    "OHLC candles ([timestamp, open, high, low, close]) for one token from CoinGecko, over 1 to 365 days. Starter tier. Useful for technical-setup agents and backtesting.",
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
    "Top tokens by market cap from CoinGecko: price, market cap, 24h volume and the 1h, 24h and 7d price change. Use for market-wide context (bull or bear, mover spotting). Works without an API key.",
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
    .min(2)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "chain must be kebab-case slug")
    .describe("Chain slug (e.g. 'ethereum', 'solana', 'bsc')."),
  pair: z
    .string()
    .min(32)
    .max(66)
    .regex(/^[A-Za-z0-9]+$/, "pair must be alphanumeric address")
    .describe("Pair contract address (32-66 characters)."),
});
export const getPairDataDefinition = {
  name: "get_pair_data",
  description:
    "DEX pair analytics from DexScreener: liquidity, 24h volume, price and pair age, with the raw DexScreener pair fields. Starter tier.",
};
export async function runGetPairData(
  input: z.infer<typeof getPairDataInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/market/pair`, { chain: input.chain, pair: input.pair });
}
