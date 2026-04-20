/**
 * On-chain tools (category 3). Wraps /v1/onchain/* — Etherscan, Helius,
 * DefiLlama free tiers. All query-string shape in backend.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

// --- get_wallet_profile ----------------------------------------------------
export const getWalletProfileInputSchema = z.object({
  address: z.string().min(1).describe("Wallet address (EVM 0x… or Solana base58)."),
  chain: z
    .enum(["ethereum", "solana", "arbitrum", "base", "optimism", "polygon", "bsc"])
    .default("ethereum"),
});
export const getWalletProfileDefinition = {
  name: "get_wallet_profile",
  description:
    "Wallet summary: native balance, ERC-20/SPL token list, labels. Starter tier. Use for wallet research and clustering.",
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
  hash: z.string().min(1).describe("Transaction hash."),
  chain: z
    .enum(["ethereum", "solana", "arbitrum", "base", "optimism", "polygon", "bsc"])
    .default("ethereum"),
});
export const getTxDefinition = {
  name: "get_tx",
  description:
    "Decode a transaction: sender, receiver, value, decoded events, status. Starter tier.",
};
export async function runGetTx(
  input: z.infer<typeof getTxInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/tx`, { hash: input.hash, chain: input.chain });
}

// --- get_token_holders -----------------------------------------------------
export const getTokenHoldersInputSchema = z.object({
  contract: z.string().min(1).describe("Token contract address (EVM)."),
  chain: z
    .enum(["ethereum", "arbitrum", "base", "optimism", "polygon", "bsc"])
    .default("ethereum")
    .describe("EVM chain only."),
  limit: z.number().int().min(1).max(200).default(50),
});
export const getTokenHoldersDefinition = {
  name: "get_token_holders",
  description:
    "Top token holders with balance and %-supply. EVM-only, Pro tier. Use for concentration/risk analysis.",
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
  protocol: z.string().min(1).describe("DefiLlama protocol slug (e.g. 'aave', 'uniswap')."),
});
export const getDefiProtocolDefinition = {
  name: "get_defi_protocol",
  description:
    "DeFi protocol snapshot: TVL, chains, volume, fees. Via DefiLlama. Free tier.",
};
export async function runGetDefiProtocol(
  input: z.infer<typeof getDefiProtocolInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/onchain/defi`, { protocol: input.protocol });
}
