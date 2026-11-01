/**
 * Extended tool surface (Phase 3c/3d/3e). Wraps the remaining /v1/* endpoints
 * beyond the core 30 tools. Each tool is one (schema, definition, run) triad.
 *
 * Design note: tools here are packed densely (one file per category would be
 * about 15 files of near-identical boilerplate). Schemas and descriptions
 * stay rich enough for MCP clients to render useful tool advertisements.
 *
 * Bounds and enums follow the API routes in app/api/v1/*.py (2026-11-01):
 * a value the client accepts is a value the API accepts. A few argument
 * names differ from the API's query names and are mapped in the runner
 * (list_yields min_apy is sent as min_apy_pct).
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { countryCodeSchema, slugSchema, tickerSchema } from "../schema.js";

const clientGet = (path: string, params?: Record<string, any>) =>
  getClient().request(path, params);
const clientPost = (path: string, body?: Record<string, any>) =>
  getClient().post(path, body);

// Chain slug filter as the directory and security routes take it.
const chainFilterSchema = (what = "Chain slug filter (e.g. 'ethereum', 'solana').") =>
  z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, "chain must be letters, digits and hyphens")
    .optional()
    .describe(what);

// Symbols the microstructure routes take: 2 to 20 letters or digits (BTC).
const marketSymbolSchema = () =>
  z
    .string()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9]{2,12}$/, "symbol must be 2-12 letters or digits (e.g. 'BTC')");

// =========================================================================
// Directories (category 7): curated lists, editorial moat
// =========================================================================

export const listStablecoinsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listStablecoinsDefinition = {
  name: "list_stablecoins",
  description:
    "Stablecoins from DefiLlama in DefiLlama's order: peg type and mechanism, circulating supply in USD, price and chains, plus BCA's risk score and notes where BCA has rated the coin (null otherwise).",
};
export const runListStablecoins = (i: any) =>
  clientGet(`/v1/directories/stablecoins`, { limit: i.limit });

export const listNftCommunitiesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listNftCommunitiesDefinition = {
  name: "list_nft_communities",
  description:
    "Curated NFT communities: chain, website and X links, description and tags. Floor price, holders and editorial rank are not collected yet, so rows missing them answer partial (meta.diagnostic.missing).",
};
export const runListNftCommunities = (i: any) =>
  clientGet(`/v1/directories/nft-communities`, { limit: i.limit });

export const listYieldsInputSchema = z.object({
  chain: slugSchema("chain", 32).optional().describe("Chain filter (e.g. 'ethereum', 'arbitrum')."),
  min_apy: z
    .number()
    .min(0)
    .max(1000)
    .optional()
    .describe("Minimum APY in percent (e.g. 5 for 5%). With it, pools are ranked by APY."),
  limit: z.number().int().min(1).max(100).default(20),
});
export const listYieldsDefinition = {
  name: "list_yields",
  description:
    "Yield pools from DefiLlama with at least 100,000 USD TVL: project, chain, symbol, TVL, APY (base and reward), stablecoin and IL risk flags, plus BCA's risk tier where rated; highest APY first. Filter by chain and a minimum APY. Starter tier.",
};
// The API's name for the minimum is min_apy_pct; it also accepts min_apy.
export const runListYields = (i: any) =>
  clientGet(`/v1/directories/yields`, {
    chain: i.chain,
    min_apy_pct: i.min_apy,
    limit: i.limit,
  });

export const listAggregatorsInputSchema = z.object({
  kind: z.enum(["dex", "bridge", "yield"]).describe("Required. Aggregator kind: dex|bridge|yield."),
  chain: slugSchema("chain", 32).optional().describe("Optional chain filter (e.g. 'ethereum')."),
  limit: z.number().int().min(1).max(200).optional().describe("Max rows (1 to 200, default 50)."),
});
export const listAggregatorsDefinition = {
  name: "list_aggregators",
  description:
    "Swap, bridge and yield aggregators (curated: 1inch, Jumper, LI.FI, Rubic, ParaSwap and others) ranked by 30 day volume from DefiLlama, with 24h, 7d and 30d volume in USD; fees are not included. Rows without a DefiLlama volume (yield aggregators, unmatched names) answer partial. Required: kind (dex, bridge or yield).",
};
export const runListAggregators = (i: any) =>
  clientGet(`/v1/directories/aggregators`, { kind: i.kind, chain: i.chain, limit: i.limit });

export const listMcpsInputSchema = z.object({});
export const listMcpsDefinition = {
  name: "list_mcps",
  description:
    "Directory of MCP servers (Blockchain Academics, well-known crypto servers and the reference servers) with vendor, transport, endpoint, auth requirement and official repository. Answers unseeded while the directory is empty.",
};
export const runListMcps = () => clientGet(`/v1/directories/mcps`);

export const listTradingBotsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listTradingBotsDefinition = {
  name: "list_trading_bots",
  description:
    "Curated trading bots (Telegram snipers, Solana terminals, copy trading tools): name, website, chains, pricing model, description and tags, sorted by name. Starter tier.",
};
export const runListTradingBots = (i: any) =>
  clientGet(`/v1/directories/trading-bots`, { limit: i.limit });

export const listVcsInputSchema = z.object({
  focus: z.string().max(128).optional().describe("Sector focus (e.g. 'defi', 'infra'; 'DeFi' reads as defi)."),
  stage: z
    .string()
    .max(64)
    .regex(/^[A-Za-z0-9_\- ]+$/, "stage must be letters, digits, spaces, _ or -")
    .optional()
    .describe("Stage (e.g. 'seed', 'series_a'; 'Series A' reads as series_a)."),
  limit: z.number().int().min(1).max(100).default(50),
});
export const listVcsDefinition = {
  name: "list_vcs",
  description:
    "Crypto VC directory: website, X, HQ, stages, sectors, AUM in USD and portfolio entities, filterable by focus and stage. Answers unseeded while no VC record is public. Starter tier.",
};
export const runListVcs = (i: any) => clientGet(`/v1/directories/vcs`, i);

export const listJobsInputSchema = z.object({
  q: z.string().min(2).max(100).optional().describe("Search title or company, e.g. 'solidity', 'Coinbase'"),
  tag: z
    .enum(["engineering", "security", "data", "research", "product", "design", "marketing", "sales-bd", "legal-compliance", "finance", "trading", "support", "operations", "other"])
    .optional()
    .describe("Role category"),
  remote: z.boolean().optional().describe("true = remote roles only"),
  location: z.string().min(2).max(100).optional().describe("Location substring, e.g. 'London', 'Singapore'"),
  employment_type: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  company_slug: slugSchema("company_slug", 160).optional().describe("e.g. coinbase, binance, phantom"),
  include_description: z.boolean().default(false).describe("Full job descriptions (large); use get_job for one role"),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});
export const listJobsDefinition = {
  name: "list_jobs",
  description:
    "Live crypto jobs (1,300+ open roles at 50+ crypto companies: Coinbase, Binance, OKX, Ripple, Circle, Phantom, Uniswap...) collected every 6h from the companies' own job boards. Filter by role, remote, location, company, keyword. Apply links go to the company's own application page. Works without an API key.",
};
export const runListJobs = (i: any) => clientGet(`/v1/directories/jobs`, i);

export const getJobInputSchema = z.object({
  slug: slugSchema("slug").describe("Job slug from list_jobs"),
});
export const getJobDefinition = {
  name: "get_job",
  description:
    "One crypto job in full: description, company, location, remote, salary when published, apply link, BCA job page URL. Errors once the role is filled. Works without an API key.",
};
export const runGetJob = (i: any) => clientGet(`/v1/directories/jobs/${encodeURIComponent(i.slug)}`);

// Grants: the live directory behind blockchainacademics.com/grants. Agents
// check every listing against its source page daily; expired deadlines are
// never returned.
const ecosystemSchema = z.enum(["web3", "ai", "web2_cloud", "gov", "edu"]);
export const searchGrantsInputSchema = z.object({
  q: z.string().min(2).max(100).optional().describe("Search title / funder, e.g. 'Solana', 'public goods'"),
  ecosystem: ecosystemSchema.optional().describe("web3 | ai | web2_cloud | gov | edu"),
  country: z.string().max(64).optional().describe("Eligibility country; global grants always match"),
  min_amount: z.number().int().min(0).optional().describe("Minimum max-award in USD"),
  max_complexity: z.number().int().min(1).max(5).optional().describe("1 (simple) to 5 (heavy application)"),
  deadline_before: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .describe("Only grants closing on or before this date"),
  has_deadline: z.boolean().optional().describe("true = dated rounds only, false = rolling only"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
export const searchGrantsDefinition = {
  name: "search_grants",
  description:
    "Live crypto, web3, AI and public-funding grants (200+ programs) with amounts, deadlines, eligibility and apply links. Verified against each funder's page weekly; expired rounds never returned. Soonest deadline first; page with offset. Works without an API key.",
};
export const runSearchGrants = (i: any) => clientGet(`/v1/grants`, i);

export const getGrantInputSchema = z.object({
  slug: slugSchema("slug").describe("Grant slug or id from search_grants"),
});
export const getGrantDefinition = {
  name: "get_grant",
  description:
    "One grant program in full: funder, amount range, deadline, focus areas, geography, application complexity, summary, apply link, last verified date. Works without an API key.",
};
export const runGetGrant = (i: any) => clientGet(`/v1/grants/${encodeURIComponent(i.slug)}`);

export const listSmartContractTemplatesInputSchema = z.object({});
export const listSmartContractTemplatesDefinition = {
  name: "list_smart_contract_templates",
  description:
    "Smart contract template catalog (OpenZeppelin references and BCA academy demos such as ERC20, ERC721, vesting, multisig, staking and airdrop): name, category, version, description and the canonical source_url. The code itself is not hosted.",
};
export const runListSmartContractTemplates = () =>
  clientGet(`/v1/directories/smart-contract-templates`);

export const getSmartContractTemplateInputSchema = z.object({
  slug: slugSchema("slug", 160),
});
export const getSmartContractTemplateDefinition = {
  name: "get_smart_contract_template",
  description:
    "One smart contract template's catalog entry by slug: name, category, version, description and the canonical source_url. The code itself is not hosted, so the answer is partial with source_code missing.",
};
export const runGetSmartContractTemplate = (i: any) =>
  clientGet(`/v1/directories/smart-contract-templates/${encodeURIComponent(i.slug)}`);

export const listMarketingTemplatesInputSchema = z.object({});
export const listMarketingTemplatesDefinition = {
  name: "list_marketing_templates",
  description:
    "Marketing and campaign templates (channel, format, tags). The bodies are still placeholders: such rows carry body_md null and body_status placeholder, and the answer is unseeded while every body is one. Starter tier.",
};
export const runListMarketingTemplates = () =>
  clientGet(`/v1/directories/marketing-templates`);

export const getMarketingTemplateInputSchema = z.object({
  slug: slugSchema("slug", 200),
});
export const getMarketingTemplateDefinition = {
  name: "get_marketing_template",
  description:
    "Fetch a specific marketing template by slug. Unseeded, with body_md null, while its body is still a placeholder. Starter tier.",
};
export const runGetMarketingTemplate = (i: any) =>
  clientGet(`/v1/directories/marketing-templates/${encodeURIComponent(i.slug)}`);

export const buildCustomIndicatorInputSchema = z.object({
  formula: z
    .string()
    .min(3)
    .max(256)
    .describe(
      "Formula over BCA primitives with entity slugs as arguments, e.g. 'coverage_index(ethereum) / price_change_7d(ethereum)'. Functions: coverage_index, sentiment_velocity, price_change_7d, risk_score; operators + - * /.",
    ),
  target: z
    .string()
    .max(256)
    .optional()
    .describe("Not read by the API: name the entity slugs inside the formula instead."),
});
export const buildCustomIndicatorDefinition = {
  name: "build_custom_indicator",
  description:
    "Evaluate a custom formula over BCA primitives (coverage_index, sentiment_velocity, price_change_7d, risk_score, each taking an entity slug; operators + - * /) on 7 day values. Returns the computed value plus each function's component value. Unseeded when a value the formula needs is not computed yet; a formula the evaluator cannot parse is an error. Pro tier.",
};
// Only the formula is sent: the API has no target parameter.
export const runBuildCustomIndicator = (i: any) =>
  clientGet(`/v1/directories/custom-indicator`, { formula: i.formula });

// =========================================================================
// Fundamentals (category 8a)
// =========================================================================

export const getTokenomicsInputSchema = z.object({ entity_slug: slugSchema("entity_slug") });
export const getTokenomicsDefinition = {
  name: "get_tokenomics",
  description:
    "Token supply data for an entity where BCA has a row: circulating, total and max supply, FDV, emission schedule, vesting cliffs, next unlock and 6 month dilution. Unseeded when there is no row (supply numbers are never invented); stale when the row could not be refreshed within 24 hours. Pro tier.",
};
export const runGetTokenomics = (i: any) => clientGet(`/v1/fundamentals/tokenomics`, i);

export const getAuditReportsInputSchema = z.object({ entity_slug: slugSchema("entity_slug") });
export const getAuditReportsDefinition = {
  name: "get_audit_reports",
  description:
    "Audits on file for an entity: BCA-reviewed audits with firm, date, report link, findings by severity and BCA's editorial score (averaged into bca_editorial_score). Rows with source defillama are audit links from DefiLlama protocol metadata: firm parsed from the link, no date or findings. Partial when only such links are on file; unseeded when nothing is on file. Starter tier.",
};
export const runGetAuditReports = (i: any) => clientGet(`/v1/fundamentals/audits`, i);

export const getTeamInfoInputSchema = z.object({ entity_slug: slugSchema("entity_slug") });
export const getTeamInfoDefinition = {
  name: "get_team_info",
  description:
    "Team of an entity from BCA's entity dossier: founders (name, role, X and GitHub handles), doxx status and team size. Backgrounds and prior exits are not tracked, so the answer is partial and meta.diagnostic.missing names them, along with any tracked field the dossier leaves empty. Pro tier.",
};
export const runGetTeamInfo = (i: any) => clientGet(`/v1/fundamentals/team`, i);

export const getRoadmapInputSchema = z.object({ entity_slug: slugSchema("entity_slug") });
export const getRoadmapDefinition = {
  name: "get_roadmap",
  description:
    "Roadmap milestones for an entity: title, target date, status and description, with a per milestone bca_verified flag for BCA's editorial fact check. Stale when no milestone was rewritten in 90 days (true of the current seed); unseeded when there are none. Starter tier.",
};
export const runGetRoadmap = (i: any) => clientGet(`/v1/fundamentals/roadmap`, i);

export const compareProtocolsInputSchema = z.object({
  entity_slugs: z
    .string()
    .min(1)
    .max(512)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*){0,4}$/,
      "entity_slugs must be 1-5 comma-separated kebab-case slugs",
    )
    .describe("Comma-separated entity slugs, 1 to 5 (e.g. 'aave,compound')."),
});
export const compareProtocolsDefinition = {
  name: "compare_protocols",
  description:
    "Side by side comparison of 1 to 5 entities: live TVL with 1d and 7d change, fees and revenue (DefiLlama), market cap and FDV (CoinGecko), plus BCA's tokenomics, audits, team and indicator rows. Each row lists its empty sections under missing, tokenomics last refreshed over 30 days ago under stale, and why a live section is empty under unavailable; partial when any row misses a section or has stale tokenomics, unseeded when no row has data. Pro tier.",
};
export const runCompareProtocols = (i: any) => clientGet(`/v1/fundamentals/compare`, i);

export const checkRugpullRiskInputSchema = z.object({
  entity_slug: slugSchema("entity_slug").describe("Required. Target entity slug."),
});
export const checkRugpullRiskDefinition = {
  name: "check_rugpull_risk",
  description:
    "Six check rugpull checklist with a weighted score: Etherscan source verification (when a contract address is on file), audit on file, team doxx status and the BCA risk score (passes below 0.5). LP lock and ownership renounce are not checked yet, and there is no honeypot test. Unknown checks are left out of the score and listed under missing (partial); unseeded when no check could be evaluated. Required: entity_slug. Pro tier.",
};
export const runCheckRugpullRisk = (i: any) => clientGet(`/v1/fundamentals/rugpull`, i);

// =========================================================================
// Chain-specific (category 8e)
// =========================================================================

export const getSolanaEcosystemInputSchema = z.object({});
export const getSolanaEcosystemDefinition = {
  name: "get_solana_ecosystem",
  description:
    "Solana overview: DefiLlama chain TVL plus BCA's curated list of notable projects (Jito, Jupiter, Marinade, Raydium, Drift, Kamino, Tensor, Helium and others). Partial when DefiLlama has no TVL.",
};
export const runGetSolanaEcosystem = () => clientGet(`/v1/chains/solana`);

export const getL2ComparisonInputSchema = z.object({});
export const getL2ComparisonDefinition = {
  name: "get_l2_comparison",
  description:
    "L2 side by side: DefiLlama TVL plus rollup kind and stack for Base, Arbitrum, OP Mainnet, zkSync Era, Starknet, Linea, Scroll, Mantle and Blast. Partial when a row has no DefiLlama TVL.",
};
export const runGetL2Comparison = () => clientGet(`/v1/chains/l2-comparison`);

export const getBitcoinL2StatusInputSchema = z.object({});
export const getBitcoinL2StatusDefinition = {
  name: "get_bitcoin_l2_status",
  description:
    "Bitcoin L2s (Stacks, Rootstock, BOB, Babylon, Merlin, Bitlayer): DefiLlama chain TVL and kind for each. Partial when a row has no DefiLlama TVL. Starter tier.",
};
export const runGetBitcoinL2Status = () => clientGet(`/v1/chains/bitcoin-l2`);

export const getTonEcosystemInputSchema = z.object({});
export const getTonEcosystemDefinition = {
  name: "get_ton_ecosystem",
  description:
    "TON overview: DefiLlama chain TVL plus BCA's curated Telegram mini app and DeFi highlights (Notcoin, Hamster Kombat, STON.fi, DeDust, Tonstakers, tgBTC). Partial when DefiLlama has no TVL.",
};
export const runGetTonEcosystem = () => clientGet(`/v1/chains/ton`);

// =========================================================================
// Compute / AI crypto (category 9d)
// =========================================================================

export const getComputePricingInputSchema = z.object({
  gpu: z
    .string()
    .max(32)
    .regex(/^[A-Za-z0-9]{1,32}$/, "gpu must be alphanumeric (e.g. 'A100', 'H100')")
    .optional()
    .describe("GPU type filter (e.g. 'A100', 'H100')."),
});
export const getComputePricingDefinition = {
  name: "get_compute_pricing",
  description:
    "GPU rental prices in USD per GPU hour from Akash (live: min, max, average and median across providers, with availability), optionally filtered by GPU model. io.net and Render have no public pricing feed and are listed as pending, so the answer is partial.",
};
export const runGetComputePricing = (i: any) => clientGet(`/v1/compute/pricing`, i);

export const getAiCryptoMetricsInputSchema = z.object({});
export const getAiCryptoMetricsDefinition = {
  name: "get_ai_crypto_metrics",
  description:
    "Bittensor subnet metrics from Taostats; unseeded while the server has no Taostats key. Ritual and Prime Intellect are listed as not wired. Starter tier.",
};
export const runGetAiCryptoMetrics = () => clientGet(`/v1/compute/ai-metrics`);

// =========================================================================
// Memes (category 9c)
// =========================================================================

export const trackPumpfunInputSchema = z.object({
  mode: z
    .enum(["trending", "new"])
    .optional()
    .describe("trending (most 24h volume, the default) or new (newest launches)."),
  limit: z.number().int().min(1).max(100).default(20).describe("Coins to return; at most 60 come back per call."),
});
export const trackPumpfunDefinition = {
  name: "track_pumpfun",
  description:
    "pump.fun coins, trending by 24h volume or newest launches (mode), with price, FDV, liquidity, 24h volume and trades and links to pump.fun and GeckoTerminal, via GeckoTerminal. Up to 60 per call. Creator and social links are not in this source.",
};
export const runTrackPumpfun = (i: any) =>
  clientGet(`/v1/memes/pumpfun`, { mode: i.mode, limit: i.limit });

export const trackBonkfunInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const trackBonkfunDefinition = {
  name: "track_bonkfun",
  description:
    "bonk.fun (Solana meme launcher) trending launches. Not connected yet: answers unseeded until the bonk.fun feed is wired.",
};
export const runTrackBonkfun = (i: any) => clientGet(`/v1/memes/bonkfun`, i);

export const checkMemecoinRiskInputSchema = z.object({
  mint: z
    .string()
    .min(32)
    .max(48)
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,48}$/, "mint must be a Solana base58 address (32-48 chars)")
    .describe("Required. Solana token mint address."),
});
export const checkMemecoinRiskDefinition = {
  name: "check_memecoin_risk",
  description:
    "Memecoin risk checks for a Solana mint (bundler, sniper and dev sell detection, LP burn, mint authority). Not computed yet: the analyzer is not built, so every call answers unseeded with the planned checks and a Solscan link to inspect the mint by hand. Required: mint. Pro tier.",
};
export const runCheckMemecoinRisk = (i: any) => clientGet(`/v1/memes/risk`, i);

export const getDegenLeaderboardInputSchema = z.object({
  window: z.enum(["1d", "7d", "30d"]).default("7d"),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getDegenLeaderboardDefinition = {
  name: "get_degen_leaderboard",
  description:
    "Top PnL wallets on memes. Not built yet: needs a Solana wallet scoring pipeline, so every call answers unseeded. Pro tier.",
};
export const runGetDegenLeaderboard = (i: any) => clientGet(`/v1/memes/leaderboard`, i);

// =========================================================================
// Microstructure (category 9a): prop desk / institutional
// =========================================================================

export const getFundingRatesInputSchema = z.object({
  symbol: marketSymbolSchema().describe("e.g. 'BTC', 'ETH'."),
  exchanges: z
    .string()
    .max(256)
    .optional()
    .describe("Not applied yet: every call covers Binance, Bybit and Hyperliquid."),
});
export const getFundingRatesDefinition = {
  name: "get_funding_rates",
  description:
    "Perpetual funding rates for a symbol on Binance, Bybit and Hyperliquid (USDT pairs): rate, mark price and next funding time per venue, and the mean across the venues that answered. dYdX is listed as pending. Pro tier.",
};
export const runGetFundingRates = (i: any) =>
  clientGet(`/v1/microstructure/funding-rates`, i);

export const getOptionsFlowInputSchema = z.object({
  symbol: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Za-z]{3}$/, "symbol must be BTC, ETH or SOL")
    .describe("BTC, ETH or SOL."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Instruments returned, largest open interest first (1 to 200, default 50)."),
  // The API's _normalise_expiry takes 13NOV26 or 2026-11-13 and answers 422
  // for anything else; the Python sibling checks the same two forms.
  expiry: z
    .string()
    .min(7)
    .max(10)
    .regex(
      /^(?:[0-9]{1,2}[A-Za-z]{3}[0-9]{2}|[0-9]{4}-[0-9]{2}-[0-9]{2})$/,
      "expiry must look like 13NOV26 or 2026-11-13",
    )
    .optional()
    .describe("Only this expiry, as 13NOV26 or 2026-11-13."),
});
export const getOptionsFlowDefinition = {
  name: "get_options_flow",
  description:
    "Deribit options book for BTC, ETH or SOL: the top instruments by open interest (strike, expiry, call or put, mark IV, open interest and 24h volume), open interest per expiry and the put/call open interest ratio. limit and expiry narrow it. Lyra and Aevo are not wired. Pro tier.",
};
export const runGetOptionsFlow = (i: any) => clientGet(`/v1/microstructure/options-flow`, i);

export const getLiquidationHeatmapInputSchema = z.object({
  symbol: marketSymbolSchema(),
});
export const getLiquidationHeatmapDefinition = {
  name: "get_liquidation_heatmap",
  description:
    "Liquidation heatmap (where leveraged positions get wiped) from CoinGlass. CoinGlass is not connected, so this answers unseeded today. Pro tier.",
};
export const runGetLiquidationHeatmap = (i: any) =>
  clientGet(`/v1/microstructure/liquidation-heatmap`, i);

export const getExchangeFlowsInputSchema = z.object({
  symbol: marketSymbolSchema(),
  window: z
    .enum(["1d", "7d", "30d"])
    .optional()
    .describe("Accepted but not applied yet: there is no flows source to pass it to."),
});
export const getExchangeFlowsDefinition = {
  name: "get_exchange_flows",
  description:
    "Net exchange inflows and outflows for an asset from CoinGlass. CoinGlass is not connected, so this answers unseeded today. Pro tier.",
};
export const runGetExchangeFlows = (i: any) =>
  clientGet(`/v1/microstructure/exchange-flows`, i);

export const predictListingInputSchema = z.object({
  entity_slug: slugSchema("entity_slug"),
  exchange: z
    .enum(["binance", "coinbase", "upbit"])
    .optional()
    .describe("Exchange to check: binance (default), coinbase or upbit."),
});
export const predictListingDefinition = {
  name: "predict_listing",
  description:
    "Listing check and heuristic listing probability (0 to 1) for an entity on Binance, Coinbase or Upbit. An asset that already trades there (CoinGecko tickers) answers listed true with no probability. Otherwise a BCA editorial heuristic over coverage, narrative strength, risk, audit and team signals, with the components shown; not a forecast. Unseeded when the indicator inputs are missing; partial when the entity has no CoinGecko id or some inputs are unknown. Pro tier.",
};
export const runPredictListing = (i: any) =>
  clientGet(`/v1/microstructure/predict-listing`, i);

// =========================================================================
// Narrative (category 9d)
// =========================================================================

export const trackNarrativeInputSchema = z.object({
  narrative: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "narrative must be kebab-case lowercase [a-z0-9-]")
    .describe("e.g. 'ai-agents', 'rwa', 'depin', 'modular'."),
  window: z.enum(["7d", "30d", "90d"]).default("7d").describe("Rolling window: 7d, 30d or 90d."),
});
export const trackNarrativeDefinition = {
  name: "track_narrative",
  description:
    "Strength of a narrative (ai-agents, rwa, depin, modular, memes, bitcoin-l2, socialfi, gamefi): the mean BCA narrative strength score of its member entities over 7d, 30d or 90d, with each member's score. Recomputed every 4 hours; partial when some members have no score, unseeded when none does, stale when the scores are older than 8 hours. An unknown narrative is an error that lists the known ones. Starter tier.",
};
export const runTrackNarrative = (i: any) => clientGet(`/v1/narrative/track`, i);

export const getAiAgentTokensInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getAiAgentTokensDefinition = {
  name: "get_ai_agent_tokens",
  description:
    "AI agent tokens (Virtuals Protocol, elizaOS (formerly ai16z), aixbt, Griffain, Zerebro, Bittensor, Artificial Superintelligence Alliance) with CoinGecko price, market cap, 24h volume and change, ranked by market cap.",
};
export const runGetAiAgentTokens = (i: any) => clientGet(`/v1/narrative/ai-agents`, i);

export const getDepinProjectsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getDepinProjectsDefinition = {
  name: "get_depin_projects",
  description:
    "DePIN tokens (Helium, Render, Filecoin, Akash Network, IoTeX, DIMO, Hivemapper) with CoinGecko price, market cap, 24h volume and change, ranked by market cap.",
};
export const runGetDepinProjects = (i: any) => clientGet(`/v1/narrative/depin`, i);

export const getRwaTokensInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getRwaTokensDefinition = {
  name: "get_rwa_tokens",
  description:
    "Real-world asset tokens (Ondo, Maple Finance, Centrifuge, Goldfinch, Pendle) with CoinGecko price, market cap, 24h volume and change, ranked by market cap. Starter tier.",
};
export const runGetRwaTokens = (i: any) => clientGet(`/v1/narrative/rwa`, i);

export const getPredictionMarketsInputSchema = z.object({
  venue: z
    .enum(["polymarket", "kalshi", "all"])
    .optional()
    .describe("polymarket, kalshi or all (both, the default)."),
  topic: slugSchema("topic", 64)
    .optional()
    .describe("crypto (default), bitcoin, ethereum, solana, any Polymarket tag slug, or all for no filter. Kalshi covers the four crypto topics only."),
  limit: z.number().int().min(1).max(100).default(50).describe("Markets per venue."),
});
export const getPredictionMarketsDefinition = {
  name: "get_prediction_markets",
  description:
    "Live prediction market odds from Polymarket and Kalshi, most traded first. Each market's outcomes is a list of {outcome, price}, the price being the implied probability (0 to 1). Pick the venue and a topic (crypto by default); partial, with meta.diagnostic.missing naming the venue, when a venue fails, has no markets or does not cover the topic.",
};
export const runGetPredictionMarkets = (i: any) =>
  clientGet(`/v1/narrative/prediction-markets`, i);

// =========================================================================
// Regulatory (category 9b)
// =========================================================================

export const getRegulatoryStatusInputSchema = z.object({
  country: countryCodeSchema().describe("ISO 3166 alpha-2 country code (e.g. 'US', 'GB'); EL and UK are read as GR and GB."),
});
export const getRegulatoryStatusDefinition = {
  name: "get_regulatory_status",
  description:
    "Crypto regulation state for a country from BCA's curated table: overall status, regulators, key laws and notes, citing the regulator. Unseeded for a country BCA does not cover; partial while its key laws are not on file. Starter tier.",
};
export const runGetRegulatoryStatus = (i: any) => clientGet(`/v1/regulatory/status`, i);

export const trackSecFilingsInputSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z]{1,12}$/, "ticker must be 1-12 letters")
    .describe("e.g. MSTR, COIN, HOOD."),
});
export const trackSecFilingsDefinition = {
  name: "track_sec_filings",
  description:
    "Recent SEC EDGAR filings (form, filing date, document link) for the crypto-related listed companies BCA maps: MSTR, COIN, HOOD, MARA, RIOT, CLSK, BKKT and Galaxy Digital (ticker 'galaxy'). Any other ticker is an error (HTTP 404). Starter tier.",
};
export const runTrackSecFilings = (i: any) => clientGet(`/v1/regulatory/sec-filings`, i);

export const getMicaStatusInputSchema = z.object({
  country: countryCodeSchema()
    .optional()
    .describe("ISO-2 country code (e.g. 'DE', 'FR'), or EU for every Member State. Omit for the full list."),
  entity_slug: slugSchema("entity_slug")
    .optional()
    .describe("Accepted but ignored: per project MiCA status is not tracked yet (the answer is then partial)."),
});
export const getMicaStatusDefinition = {
  name: "get_mica_status",
  description:
    "EU MiCA applicability by country, with national authorities: one country (ISO-2), or every Member State on file when country is omitted or EU (27 EU Member States, EEA states once seeded). Partial while some Member States have no row. A country outside the EU and EEA lists answers unseeded unless BCA has a reviewed row for it. Per project status is not tracked: entity_slug is ignored. Pro tier.",
};
export const runGetMicaStatus = (i: any) => clientGet(`/v1/regulatory/mica`, i);

export const getTaxRulesInputSchema = z.object({
  country: countryCodeSchema().describe("ISO 3166 alpha-2 country code (e.g. 'US', 'DE')."),
});
export const getTaxRulesDefinition = {
  name: "get_tax_rules",
  description:
    "Crypto tax rules for a jurisdiction: BCA's reviewed tax summary plus the tax authority's guidance link. Unseeded while no summary is on file (rates are never invented). Not tax advice. Starter tier.",
};
export const runGetTaxRules = (i: any) => clientGet(`/v1/regulatory/tax-rules`, i);

// =========================================================================
// Security (category 9c): all free tier but scan_contract
// =========================================================================

export const checkExploitHistoryInputSchema = z.object({
  entity_slug: slugSchema("entity_slug"),
  chain: chainFilterSchema("Optional chain filter (e.g. 'Ethereum', 'BSC')."),
  min_usd_loss: z.number().int().min(0).optional().describe("Optional minimum loss in USD."),
  limit: z.number().int().min(1).max(200).optional().describe("Max hacks (1 to 200, default 50)."),
});
export const checkExploitHistoryDefinition = {
  name: "check_exploit_history",
  description:
    "Hack history from DefiLlama's hacks dataset, newest first, amounts in USD: filtered by entity slug (whole word match on the hack name, or DefiLlama's parent protocol), and optionally by chain and minimum loss.",
};
export const runCheckExploitHistory = (i: any) => clientGet(`/v1/security/exploits`, i);

export const checkPhishingDomainInputSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/,
      "domain must be a valid hostname",
    ),
});
export const checkPhishingDomainDefinition = {
  name: "check_phishing_domain",
  description:
    "Checks a domain against MetaMask's phishing list (blocklist, allowlist and lookalikes of major domains) plus a pattern heuristic. Verdict: blocklisted, suspicious, allowlisted or clean_local. Partial when the list cannot be loaded; stale when the cached copy is over 6 hours old.",
};
export const runCheckPhishingDomain = (i: any) => clientGet(`/v1/security/phishing`, i);

export const getBugBountyProgramsInputSchema = z.object({
  chain: chainFilterSchema("Optional chain filter (e.g. 'ethereum')."),
  min_payout: z.number().min(0).optional().describe("Minimum top bounty in USD."),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getBugBountyProgramsDefinition = {
  name: "get_bug_bounty_programs",
  description:
    "Active Immunefi bug bounty programs, largest top bounty first, filterable by chain and minimum payout (USD). The Immunefi feed is off on the server for now, so this answers unseeded.",
};
export const runGetBugBountyPrograms = (i: any) => clientGet(`/v1/security/bug-bounties`, i);

export const scanContractInputSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Required. EVM contract address (0x + 40 hex chars)."),
});
export const scanContractDefinition = {
  name: "scan_contract",
  description:
    "Etherscan source check for an Ethereum contract: verified or not, contract name, compiler version, proxy flag and implementation address, license and a source preview. No owner lookup, honeypot test or exploit simulation. Required: address (0x EVM address). Starter tier.",
};
export const runScanContract = (i: any) => clientGet(`/v1/security/scan-contract`, i);

// =========================================================================
// Services (category 9d): POST, revenue plays
//
// The three schemas mirror the API request models in
// app/api/v1/services.py (KOLCampaignRequest, CustomResearchRequest,
// ListingSubmissionRequest): same field names, required fields and bounds,
// so a call that passes here is not rejected upstream with a 422. Each
// endpoint is free to call with any real key, free tier included (the demo
// key is not on the demo allowlist), files a service request for a human to
// review, and answers 201 {request_id, status, next_step}.
// =========================================================================

const contactNameSchema = z.string().max(200).optional().describe("Optional contact name.");
const companySchema = z.string().max(200).optional().describe("Optional company name.");
const notesSchema = (what: string) =>
  z.string().max(4000).optional().describe(`Optional ${what} (up to 4,000 characters).`);

export const bookKolCampaignInputSchema = z.object({
  contact_email: z
    .string()
    .email()
    .max(254)
    .describe("Required. Where BCA Studio sends the recommended KOL slate and quote."),
  project_name: z
    .string()
    .min(2)
    .max(200)
    .describe("Required. Project or brand name (2 to 200 characters)."),
  campaign_type: z
    .enum(["thread", "video", "space", "podcast", "hybrid"])
    .describe("Required. Campaign format: thread, video, space, podcast or hybrid."),
  budget_usd: z
    .number()
    .int()
    .min(500)
    .max(2_000_000)
    .describe("Required. Budget in whole US dollars, 500 to 2,000,000."),
  contact_name: contactNameSchema,
  company: companySchema,
  project_slug: slugSchema("project_slug")
    .optional()
    .describe("Optional BCA entity slug for the project (e.g. 'ethereum')."),
  target_chains: z
    .array(z.string().min(1).max(64))
    .max(12)
    .optional()
    .describe("Optional chains the campaign targets, up to 12 (e.g. ['solana', 'base'])."),
  notes: notesSchema("brief: goals, audience, timing"),
});
export const bookKolCampaignDefinition = {
  name: "book_kol_campaign",
  description:
    "Send a KOL campaign brief to BCA Studio. Required: contact_email, project_name, campaign_type (thread, video, space, podcast or hybrid) and budget_usd (500 to 2,000,000 USD). Free to submit; needs an API key (the free tier is enough). Each brief alerts BCA Studio, who reply to contact_email by hand with a recommended KOL slate and quote (nothing is emailed automatically). Returns request_id, status and next_step.",
};
export const runBookKolCampaign = (i: any) =>
  clientPost(`/v1/services/book-kol-campaign`, i);

export const requestCustomResearchInputSchema = z.object({
  contact_email: z
    .string()
    .email()
    .max(254)
    .describe("Required. Where BCA Research sends the scope and quote."),
  topic: z
    .string()
    .min(4)
    .max(256)
    .describe("Required. What to research (4 to 256 characters)."),
  depth: z
    .enum(["light", "standard", "deep"])
    .default("standard")
    .describe("Report depth: light, standard or deep."),
  target_wordcount: z
    .number()
    .int()
    .min(500)
    .max(20_000)
    .default(3000)
    .describe("Target report length in words, 500 to 20,000."),
  deadline: z
    .string()
    .max(40)
    .optional()
    .describe("Optional deadline: an ISO date or free text such as 'within 2 weeks' (up to 40 characters)."),
  contact_name: contactNameSchema,
  company: companySchema,
  notes: notesSchema("notes for the research team"),
});
export const requestCustomResearchDefinition = {
  name: "request_custom_research",
  description:
    "Request a custom research report from BCA Research. Required: contact_email and topic (4 to 256 characters). Free to submit; needs an API key (the free tier is enough). Each request alerts BCA Research, who reply to contact_email by hand with scope and a quote; payment is by Stripe invoice. Returns request_id, status and next_step.",
};
export const runRequestCustomResearch = (i: any) =>
  clientPost(`/v1/services/custom-research`, i);

export const submitListingInputSchema = z.object({
  contact_email: z
    .string()
    .email()
    .max(254)
    .describe("Required. Where the editorial team replies with featured listing pricing."),
  directory: z
    .enum([
      "vcs",
      "aggregators",
      "trading_bots",
      "mcps",
      "nft_communities",
      "jobs",
      "stablecoins",
      "trading_yields",
    ])
    .describe("Required. Target directory."),
  listing_name: z
    .string()
    .min(2)
    .max(200)
    .describe("Required. Display name for the listing (2 to 200 characters)."),
  listing_url: z
    .string()
    .url()
    .max(2083)
    .regex(/^https?:\/\//, "listing_url must start with http:// or https://")
    .describe("Required. Public http or https URL of the project or product."),
  description: z
    .string()
    .min(20)
    .max(2000)
    .describe("Required. What the listing is (20 to 2,000 characters)."),
  contact_name: contactNameSchema,
  tags: z
    .array(z.string().min(1).max(64))
    .max(24)
    .optional()
    .describe("Optional tags, up to 24."),
});
export const submitListingDefinition = {
  name: "submit_listing",
  description:
    "Submit a listing to a BCA directory: vcs, aggregators, trading_bots, mcps, nft_communities, jobs, stablecoins or trading_yields. Required: contact_email, directory, listing_name, listing_url and description (20 to 2,000 characters). Free to submit (needs an API key; the free tier is enough), paid to be featured: each submission alerts the editors, who review it for fit and reply to contact_email by hand with featured listing pricing. Returns request_id, status and next_step.",
};
export const runSubmitListing = (i: any) =>
  clientPost(`/v1/services/submit-listing`, i);

// =========================================================================
// History (category 7b): time series
//
// The API caps every history window at 365 days.
// =========================================================================

export const getHistoryPricesInputSchema = z.object({
  symbol: tickerSchema(),
  days: z.number().int().min(1).max(365).default(365),
  granularity: z
    .enum(["hourly", "daily"])
    .optional()
    .describe("hourly or daily. Default: hourly up to 30 days, daily averages for longer windows."),
});
export const getHistoryPricesDefinition = {
  name: "get_history_prices",
  description:
    "Price history for a symbol from BCA's hourly price snapshots (USD price, market cap, 24h volume and change), up to 365 days: hourly up to 30 days and daily averages beyond, unless granularity says otherwise. Partial when days in the window have no snapshot, stale when the newest snapshot is over 3 hours old, unseeded when the window is empty.",
};
export const runGetHistoryPrices = (i: any) =>
  clientGet(`/v1/history/prices/${encodeURIComponent(i.symbol)}`, {
    days: i.days,
    granularity: i.granularity,
  });

export const getHistorySentimentInputSchema = z.object({
  symbol: tickerSchema(),
  days: z.number().int().min(1).max(365).default(365),
});
export const getHistorySentimentDefinition = {
  name: "get_history_sentiment",
  description:
    "Daily sentiment index for a symbol, up to 365 days, from BCA's nightly rollup of article (and, when collected, tweet) sentiment. tweet_count is null for days after the newest collected tweet, and the answer is partial for those days while the X reader is off; stale only when the rollup itself has stopped.",
};
export const runGetHistorySentiment = (i: any) =>
  clientGet(`/v1/history/sentiment/${encodeURIComponent(i.symbol)}`, { days: i.days });

export const getHistoryCorrelationInputSchema = z.object({
  symbol: tickerSchema(),
  peer: tickerSchema()
    .optional()
    .describe("Optional peer symbol (e.g. 'ETH'): adds the correlation of the two coins' daily price changes."),
  days: z.number().int().min(7).max(365).default(365),
});
export const getHistoryCorrelationDefinition = {
  name: "get_history_correlation",
  description:
    "Pearson correlation of a coin's daily price change against its daily BCA sentiment and, with peer, against the peer's daily price change, with the aligned daily series (each row carries peer_price_change_pct when peer is given). Partial below 7 paired days, for a flat series, or when an input is missing for part of the window.",
};
export const runGetHistoryCorrelation = (i: any) =>
  clientGet(`/v1/history/correlation/${encodeURIComponent(i.symbol)}`, {
    peer: i.peer,
    days: i.days,
  });

export const getHistoryCoverageInputSchema = z.object({
  entity_slug: slugSchema("entity_slug"),
  days: z.number().int().min(1).max(365).default(365),
});
export const getHistoryCoverageDefinition = {
  name: "get_history_coverage",
  description:
    "Daily BCA article coverage for an entity, up to 365 days: article count and average sentiment per day for the currency the entity maps to (ethereum to ETH, avalanche to AVAX). Unseeded when the entity has no tracked currency or no coverage in the window.",
};
export const runGetHistoryCoverage = (i: any) => clientGet(`/v1/history/coverage`, i);

// =========================================================================
// Entities / topics / sources / stories / trending / feed (corpus meta)
// =========================================================================

export const listEntitiesInputSchema = z.object({
  kind: z
    .enum(["chain", "project", "person", "ticker", "protocol", "exchange", "fund"])
    .optional()
    .describe("Kind filter. chain, project, person and ticker hold entities; protocol, exchange and fund hold none yet and answer unseeded."),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Entities to skip, for paging (default 0). meta.pageInfo.hasNextPage says whether more exist."),
});
export const listEntitiesDefinition = {
  name: "list_entities",
  description:
    "Browse the BCA entity registry (about 150 entities: chains, projects, people and tickers), most mentioned first. Filter by kind; page with offset. Partial when none of the listed dossiers has a summary or mentions yet.",
};
export const runListEntities = (i: any) => clientGet(`/v1/entities`, i);

export const getTopicInputSchema = z.object({ slug: slugSchema("slug") });
export const getTopicDefinition = {
  name: "get_topic",
  description:
    "Fetch one topic from the taxonomy: its live article count, child topics and up to 5 recent articles. Partial when no article is tagged with it yet. Works without an API key.",
};
export const runGetTopic = (i: any) =>
  clientGet(`/v1/topics/${encodeURIComponent(i.slug)}`);

export const searchAcademyInputSchema = z.object({
  q: z.string().min(2).max(512).describe("Search query (2 to 512 characters)."),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Hits to skip, for paging (default 0). meta.pageInfo.hasNextPage says whether more exist."),
});
export const searchAcademyDefinition = {
  name: "search_academy",
  description:
    "Full-text search across academy lessons. Each hit has the course and lesson slugs, title, summary, publish date and site_url, the lesson's page on blockchainacademics.com: link with site_url. Unseeded when nothing matches. Works without an API key.",
};
export const runSearchAcademy = (i: any) => clientGet(`/v1/academy/search`, i);

export const getTrendingInputSchema = z.object({
  window: z.enum(["1h", "6h", "24h", "7d"]).default("24h"),
  limit: z.number().int().min(1).max(50).default(20),
});
export const getTrendingDefinition = {
  name: "get_trending",
  description:
    "Trending coins by mentions over 1h, 6h, 24h or 7d: article and tweet mention counts and average sentiment per symbol. No tweets are collected while the X reader is paused, so the answer is partial with tweets missing. Works without an API key.",
};
export const runGetTrending = (i: any) => clientGet(`/v1/trending`, i);

export const getUnifiedFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getUnifiedFeedDefinition = {
  name: "get_unified_feed",
  description:
    "Chronological news feed from the RSS and Reddit sources BCA ingests, newest first.",
};
export const runGetUnifiedFeed = (i: any) => clientGet(`/v1/feed`, i);

export const listSourcesInputSchema = z.object({
  type: z
    .string()
    .max(32)
    .regex(
      /^(?:rss|twitter|reddit)(?:,(?:rss|twitter|reddit))*$/,
      "type must be rss, twitter or reddit, comma-separated",
    )
    .optional()
    .describe("Optional type filter, comma-separated: rss, twitter, reddit."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Max sources (1 to 500; default 500, the whole registry)."),
  offset: z.number().int().min(0).optional().describe("Sources to skip, for paging (default 0)."),
});
export const listSourcesDefinition = {
  name: "list_sources",
  description:
    "The active news sources BCA ingests (RSS feeds, X accounts, Reddit) with type, URL and trust tier, by tier, plus whether BCA collects each one now (collecting, not_collecting_reason) and when it last stored an item from it (last_fetched_at). X accounts stay listed but answer collecting false (x_reader_off) while the X reader is off. Returns the whole registry by default (162 sources on 2026-11-01); has_more and next_offset say when to page.",
};
export const runListSources = (i: any) =>
  clientGet(`/v1/sources`, { type: i.type, limit: i.limit, offset: i.offset });

export const getRecentStoriesInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});
export const getRecentStoriesDefinition = {
  name: "get_recent_stories",
  description:
    "Recent stories: related articles from the last 24 hours clustered into one story each (deduplicated across sources), with any X signals attached. Works without an API key.",
};
export const runGetRecentStories = (i: any) => clientGet(`/v1/stories/recent`, i);

// =========================================================================
// Memos + theses (investment research, starter tier)
// =========================================================================

// Shared status line: the tables hold only the seeded test fixture so far.
const FIXTURE_NOTE =
  "No real one is published yet: the only public row is a test fixture, so this answers unseeded (fixture_rows_only) with the row flagged fixture.";

export const listMemosInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listMemosDefinition = {
  name: "list_memos",
  description: `Browse public investment memos (paid fields redacted). ${FIXTURE_NOTE} Starter tier.`,
};
export const runListMemos = (i: any) => clientGet(`/v1/memos`, i);

export const getMemoInputSchema = z.object({ slug: slugSchema("slug") });
export const getMemoDefinition = {
  name: "get_memo",
  description: `Fetch a specific investment memo by slug. ${FIXTURE_NOTE} Starter tier.`,
};
export const runGetMemo = (i: any) => clientGet(`/v1/memos/${encodeURIComponent(i.slug)}`);

export const listThesesInputSchema = z.object({
  status: z
    .enum(["active", "closed", "invalidated", "pending", "all"])
    .default("active")
    .describe("Thesis status; all means no filter."),
  limit: z.number().int().min(1).max(100).default(20),
});
export const listThesesDefinition = {
  name: "list_theses",
  description: `Browse public trade theses (entry, invalidation and targets at band granularity). ${FIXTURE_NOTE} Starter tier.`,
};
export const runListTheses = (i: any) => clientGet(`/v1/theses`, i);

export const getThesisInputSchema = z.object({ slug: slugSchema("slug") });
export const getThesisDefinition = {
  name: "get_thesis",
  description: `Fetch a specific trade thesis by slug. ${FIXTURE_NOTE} Starter tier.`,
};
export const runGetThesis = (i: any) => clientGet(`/v1/theses/${encodeURIComponent(i.slug)}`);

// =========================================================================
// Social signals (category: hybrid sentiment)
//
// Derived from the tweets table, whose X reader is paused on purpose since
// 2026-10-30: answers carry feed {latest_tweet_at, last_fetched_at} and are
// stale or unseeded while it stays paused.
// =========================================================================

const socialWindowSchema = () =>
  z
    .enum(["1h", "6h", "24h", "7d"])
    .optional()
    .describe("Time window: 1h, 6h, 24h (the default) or 7d.");

export const getSocialSignalsInputSchema = z.object({
  window: socialWindowSchema(),
  currencies: z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9]+(?: *, *[A-Za-z0-9]+)*$/, "currencies must be comma-separated symbols (e.g. 'BTC,ETH')")
    .optional()
    .describe("Optional comma-separated symbols (e.g. 'BTC,ETH')."),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getSocialSignalsDefinition = {
  name: "get_social_signals",
  description:
    "Social signals per currency from collected X posts: mentions, unique accounts, sentiment (average, min, max, label) and engagement, most mentioned first, with feed telling when tweets were last collected. Stale while the X reader is paused (unseeded when the window has no tweets); empty answers still carry data with results [].",
};
export const runGetSocialSignals = (i: any) =>
  clientGet(`/v1/social-signals`, { window: i.window, currencies: i.currencies, limit: i.limit });

export const getSocialSignalsDetailInputSchema = z.object({
  symbol: tickerSchema(),
  window: socialWindowSchema(),
});
export const getSocialSignalsDetailDefinition = {
  name: "get_social_signals_detail",
  description:
    "Social signal detail for one currency from collected X posts: mentions, unique accounts, sentiment, the top accounts by engagement (with last_tweet_at) and a sentiment breakdown. Unseeded when the window has no mentions, which is the usual answer while the X reader is paused.",
};
export const runGetSocialSignalsDetail = (i: any) =>
  clientGet(`/v1/social-signals/${encodeURIComponent(i.symbol)}`, { window: i.window });

// =========================================================================
// Currencies (meta registry)
// =========================================================================

export const listCurrenciesInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(100),
});
export const listCurrenciesDefinition = {
  name: "list_currencies",
  description: "All tracked currencies with symbol, name and CoinGecko id, by symbol.",
};
export const runListCurrencies = (i: any) => clientGet(`/v1/currencies`, i);

export const getCurrencyFeedInputSchema = z.object({
  symbol: tickerSchema(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getCurrencyFeedDefinition = {
  name: "get_currency_feed",
  description:
    "Articles and collected X posts that mention one currency (by symbol), newest first, with sentiment. An unknown symbol is an error (HTTP 404).",
};
export const runGetCurrencyFeed = (i: any) =>
  clientGet(`/v1/currencies/${encodeURIComponent(i.symbol)}/feed`, { limit: i.limit });
