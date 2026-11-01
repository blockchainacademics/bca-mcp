/**
 * On-chain tools (category 3). Wraps /v1/onchain/*: Etherscan, Helius and
 * DefiLlama free tiers. All query-string shape in backend.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

const chainEnum = z.enum(["ethereum", "solana", "arbitrum", "base", "optimism", "polygon", "bsc"]);

// --- get_wallet_profile ----------------------------------------------------
export const getWalletProfileInputSchema = z.object({
  address: z
    .string()
    .min(32)
    .max(64)
    .regex(
      /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/,
      "address must be an EVM address (0x + 40 hex) or a Solana base58 address (32-44 chars)",
    )
    .describe("Wallet address (EVM 0x… or Solana base58)."),
  chain: chainEnum.default("ethereum"),
});
export const getWalletProfileDefinition = {
  name: "get_wallet_profile",
  description:
    "Wallet summary: native balance (in wei and in the chain coin, for example ETH) and up to 25 token holdings. EVM holdings are the net of the newest 1,000 token transfers with likely spam dropped (partial when older history exists); Solana holdings are current SPL balances. No address labels. Starter tier. Use for wallet research.",
};
export async function runGetWalletProfile(
  input: z.infer<typeof getWalletProfileInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/wallet`, {
    address: input.address,
    chain: input.chain,
  });
}

// --- get_tx ----------------------------------------------------------------
export const getTxInputSchema = z.object({
  hash: z
    .string()
    .min(64)
    .max(128)
    .regex(
      /^(0x[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{64,128})$/,
      "hash must be an EVM hash (0x + 64 hex) or a Solana base58 signature",
    )
    .describe("Transaction hash (EVM 0x + 64 hex) or Solana signature."),
  chain: chainEnum.default("ethereum"),
});
export const getTxDefinition = {
  name: "get_tx",
  description:
    "Decode one transaction: block, sender, receiver, value, gas and fee, status, and the receipt logs with ERC-20 and ERC-721 transfers decoded (EVM via Etherscan; Solana via Helius). Partial while the receipt is not available; an unknown hash is an error (HTTP 404). Starter tier.",
};
export async function runGetTx(
  input: z.infer<typeof getTxInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/tx`, { hash: input.hash, chain: input.chain });
}

// --- get_token_holders -----------------------------------------------------
export const getTokenHoldersInputSchema = z.object({
  contract: z
    .string()
    .min(42)
    .max(42)
    .regex(/^0x[a-fA-F0-9]{40}$/, "contract must be EVM address (0x + 40 hex)")
    .describe("Token contract address (EVM)."),
  chain: z
    .enum(["ethereum", "arbitrum", "base", "optimism", "polygon", "bsc"])
    .default("ethereum")
    .describe("EVM chain only."),
  limit: z.number().int().min(1).max(200).default(50),
});
export const getTokenHoldersDefinition = {
  name: "get_token_holders",
  description:
    "Top holders of an ERC-20 token with balance and share of supply, via Etherscan. EVM chains only, Pro tier. Etherscan serves holder lists on its paid plan only, so this usually answers partial today (meta.diagnostic names the upstream error). Use for concentration and risk analysis.",
};
export async function runGetTokenHolders(
  input: z.infer<typeof getTokenHoldersInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/holders`, {
    contract: input.contract,
    chain: input.chain,
    limit: input.limit,
  });
}

// --- get_defi_protocol -----------------------------------------------------
export const getDefiProtocolInputSchema = z.object({
  protocol: slugSchema("protocol", 64).describe(
    "DefiLlama protocol slug (e.g. 'aave', 'uniswap').",
  ),
  history_days: z
    .number()
    .int()
    .min(0)
    .max(90)
    .optional()
    .describe("Daily TVL points to include, newest last (0 to 90; default 0, no history)."),
});
export const getDefiProtocolDefinition = {
  name: "get_defi_protocol",
  description:
    "Compact DefiLlama snapshot of a DeFi protocol: TVL in total and per chain, 1d, 7d and 30d TVL change, market cap, category, audit links, and raise and hack counts, with up to 90 days of daily TVL on request (history_days). Fees and revenue are in compare_protocols. Partial when TVL, category or audits are missing; an unknown slug is an error (HTTP 404). Free tier.",
};
export async function runGetDefiProtocol(
  input: z.infer<typeof getDefiProtocolInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/defi`, {
    protocol: input.protocol,
    history_days: input.history_days,
  });
}
