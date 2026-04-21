/**
 * Extended tool surface (Phase 3c/3d/3e). Wraps the remaining /v1/* endpoints
 * beyond the core 29 tools. Each tool is one (schema, definition, run) triad.
 *
 * Design note: tools here are packed densely (one file per category would be
 * ~15 files of near-identical boilerplate). Schemas + descriptions stay rich
 * enough for MCP clients to render useful tool advertisements.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

const clientGet = (path: string, params?: Record<string, any>) =>
  getClient().request(path, params);
const clientPost = (path: string, body?: Record<string, any>) =>
  getClient().post(path, body);

// =========================================================================
// Directories (category 7) — curated lists, editorial moat
// =========================================================================

export const listStablecoinsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listStablecoinsDefinition = {
  name: "list_stablecoins",
  description:
    "Ranked stablecoins by TVL / peg stability / audit status / chain coverage. Composite of DefiLlama + BCA risk scoring.",
};
export const runListStablecoins = (i: any) =>
  clientGet(`/v1/directories/stablecoins`, { limit: i.limit });

export const listNftCommunitiesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listNftCommunitiesDefinition = {
  name: "list_nft_communities",
  description: "Top NFT communities ranked by floor, holders, Discord activity, OG status.",
};
export const runListNftCommunities = (i: any) =>
  clientGet(`/v1/directories/nft-communities`, { limit: i.limit });

export const listYieldsInputSchema = z.object({
  chain: z.string().optional(),
  min_apy: z.number().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export const listYieldsDefinition = {
  name: "list_yields",
  description:
    "Best staking / LP / vault opportunities by chain and risk tier. DefiLlama yields + BCA risk overlay. Starter tier.",
};
export const runListYields = (i: any) => clientGet(`/v1/directories/yields`, i);

export const listAggregatorsInputSchema = z.object({
  kind: z.enum(["dex", "bridge", "yield"]).describe("Required. Aggregator kind: dex|bridge|yield."),
});
export const listAggregatorsDefinition = {
  name: "list_aggregators",
  description: "DEX, bridge, or yield aggregators ranked by volume, fees, chain support. Required: kind ∈ {dex, bridge, yield}.",
};
export const runListAggregators = (i: any) =>
  clientGet(`/v1/directories/aggregators`, { kind: i.kind });

export const listMcpsInputSchema = z.object({});
export const listMcpsDefinition = {
  name: "list_mcps",
  description:
    "Directory of crypto MCP servers (meta: the MCP-of-MCPs). Discover peer MCPs with their tool surfaces.",
};
export const runListMcps = () => clientGet(`/v1/directories/mcps`);

export const listTradingBotsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listTradingBotsDefinition = {
  name: "list_trading_bots",
  description: "Ranked trading bots / copy-trade platforms with fees, exchanges, track record.",
};
export const runListTradingBots = (i: any) =>
  clientGet(`/v1/directories/trading-bots`, { limit: i.limit });

export const listVcsInputSchema = z.object({
  focus: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const listVcsDefinition = {
  name: "list_vcs",
  description:
    "Crypto VC directory: focus, ticket size, stage, portfolio count, recent deals. Starter tier.",
};
export const runListVcs = (i: any) => clientGet(`/v1/directories/vcs`, i);

export const listJobsInputSchema = z.object({
  remote: z.boolean().optional(),
  seniority: z.string().optional(),
  chain: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const listJobsDefinition = {
  name: "list_jobs",
  description:
    "Aggregated crypto job board, deduped from Crypto Jobs List / Web3 Career / Wellfound / AngelList.",
};
export const runListJobs = (i: any) => clientGet(`/v1/directories/jobs`, i);

export const listSmartContractTemplatesInputSchema = z.object({});
export const listSmartContractTemplatesDefinition = {
  name: "list_smart_contract_templates",
  description:
    "Audited Solidity templates: ERC20, ERC721, Vesting, Multisig, Staking, Airdrop. OpenZeppelin + BCA academy assets.",
};
export const runListSmartContractTemplates = () =>
  clientGet(`/v1/directories/smart-contract-templates`);

export const getSmartContractTemplateInputSchema = z.object({
  slug: z.string().min(1),
});
export const getSmartContractTemplateDefinition = {
  name: "get_smart_contract_template",
  description: "Fetch a specific smart contract template by slug. Includes attributed header.",
};
export const runGetSmartContractTemplate = (i: any) =>
  clientGet(`/v1/directories/smart-contract-templates/${encodeURIComponent(i.slug)}`);

export const listMarketingTemplatesInputSchema = z.object({});
export const listMarketingTemplatesDefinition = {
  name: "list_marketing_templates",
  description:
    "Campaign templates: TGE checklist, airdrop ops, NFT mint script, influencer brief, press kit. Starter tier.",
};
export const runListMarketingTemplates = () =>
  clientGet(`/v1/directories/marketing-templates`);

export const getMarketingTemplateInputSchema = z.object({
  slug: z.string().min(1),
});
export const getMarketingTemplateDefinition = {
  name: "get_marketing_template",
  description: "Fetch a specific marketing template by slug.",
};
export const runGetMarketingTemplate = (i: any) =>
  clientGet(`/v1/directories/marketing-templates/${encodeURIComponent(i.slug)}`);

export const buildCustomIndicatorInputSchema = z.object({
  formula: z.string().min(1).describe("Formula over data primitives, e.g. 'coverage_index(X)/price_change_7d(X)'."),
  target: z.string().optional(),
});
export const buildCustomIndicatorDefinition = {
  name: "build_custom_indicator",
  description:
    "Define a custom indicator formula over BCA primitives. Returns time-series. Pro tier.",
};
export const runBuildCustomIndicator = (i: any) =>
  clientGet(`/v1/directories/custom-indicator`, i);

// =========================================================================
// Fundamentals (category 8a)
// =========================================================================

export const getTokenomicsInputSchema = z.object({ entity_slug: z.string().min(1) });
export const getTokenomicsDefinition = {
  name: "get_tokenomics",
  description:
    "Supply, emission, vesting, unlock cliffs, circulating %. Pro tier. Single source replacing spreadsheet scraping.",
};
export const runGetTokenomics = (i: any) => clientGet(`/v1/fundamentals/tokenomics`, i);

export const getAuditReportsInputSchema = z.object({ entity_slug: z.string().min(1) });
export const getAuditReportsDefinition = {
  name: "get_audit_reports",
  description:
    "Aggregated audits from Trail of Bits, Certik, OpenZeppelin, Consensys Diligence, Code4rena + BCA review score.",
};
export const runGetAuditReports = (i: any) => clientGet(`/v1/fundamentals/audits`, i);

export const getTeamInfoInputSchema = z.object({ entity_slug: z.string().min(1) });
export const getTeamInfoDefinition = {
  name: "get_team_info",
  description:
    "Founders, LinkedIn-verified backgrounds, prior exits, doxx status. Entity-graph backed. Pro tier.",
};
export const runGetTeamInfo = (i: any) => clientGet(`/v1/fundamentals/team`, i);

export const getRoadmapInputSchema = z.object({ entity_slug: z.string().min(1) });
export const getRoadmapDefinition = {
  name: "get_roadmap",
  description: "Project roadmap with BCA editorial fact-check. Starter tier.",
};
export const runGetRoadmap = (i: any) => clientGet(`/v1/fundamentals/roadmap`, i);

export const compareProtocolsInputSchema = z.object({
  entity_slugs: z.string().describe("Comma-separated entity slugs."),
});
export const compareProtocolsDefinition = {
  name: "compare_protocols",
  description:
    "Side-by-side comparison: TVL, fees, tokenomics, team, audits, risk. Pro tier.",
};
export const runCompareProtocols = (i: any) => clientGet(`/v1/fundamentals/compare`, i);

export const checkRugpullRiskInputSchema = z.object({
  entity_slug: z.string().min(1).describe("Required. Target entity slug."),
});
export const checkRugpullRiskDefinition = {
  name: "check_rugpull_risk",
  description:
    "Composite rugpull risk: honeypot + LP lock + ownership renounce + contract verification + team risk. Required: entity_slug. Pro tier.",
};
export const runCheckRugpullRisk = (i: any) => clientGet(`/v1/fundamentals/rugpull`, i);

// =========================================================================
// Chain-specific (category 8e)
// =========================================================================

export const getSolanaEcosystemInputSchema = z.object({});
export const getSolanaEcosystemDefinition = {
  name: "get_solana_ecosystem",
  description: "Solana metrics + top projects + SPL activity.",
};
export const runGetSolanaEcosystem = () => clientGet(`/v1/chains/solana`);

export const getL2ComparisonInputSchema = z.object({});
export const getL2ComparisonDefinition = {
  name: "get_l2_comparison",
  description:
    "L2 side-by-side: Base, Arbitrum, Optimism, zkSync, Starknet, Linea, Scroll, Mantle, Blast.",
};
export const runGetL2Comparison = () => clientGet(`/v1/chains/l2-comparison`);

export const getBitcoinL2StatusInputSchema = z.object({});
export const getBitcoinL2StatusDefinition = {
  name: "get_bitcoin_l2_status",
  description:
    "BTC L2s: Stacks, Rootstock, BOB, Babylon, Merlin, Bitlayer. Starter tier.",
};
export const runGetBitcoinL2Status = () => clientGet(`/v1/chains/bitcoin-l2`);

export const getTonEcosystemInputSchema = z.object({});
export const getTonEcosystemDefinition = {
  name: "get_ton_ecosystem",
  description: "TON + Telegram mini-apps ecosystem snapshot.",
};
export const runGetTonEcosystem = () => clientGet(`/v1/chains/ton`);

// =========================================================================
// Compute / AI crypto (category 9d)
// =========================================================================

export const getComputePricingInputSchema = z.object({
  gpu: z.string().optional().describe("GPU type filter (e.g. 'A100', 'H100')."),
});
export const getComputePricingDefinition = {
  name: "get_compute_pricing",
  description: "Akash, Render, IO.net pricing per GPU type.",
};
export const runGetComputePricing = (i: any) => clientGet(`/v1/compute/pricing`, i);

export const getAiCryptoMetricsInputSchema = z.object({});
export const getAiCryptoMetricsDefinition = {
  name: "get_ai_crypto_metrics",
  description: "Bittensor subnets, Ritual, Prime Intellect. Starter tier.",
};
export const runGetAiCryptoMetrics = () => clientGet(`/v1/compute/ai-metrics`);

// =========================================================================
// Memes (category 9c)
// =========================================================================

export const trackPumpfunInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const trackPumpfunDefinition = {
  name: "track_pumpfun",
  description: "pump.fun trending + new launches.",
};
export const runTrackPumpfun = (i: any) => clientGet(`/v1/memes/pumpfun`, i);

export const trackBonkfunInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const trackBonkfunDefinition = {
  name: "track_bonkfun",
  description: "Solana meme launcher — trending launches.",
};
export const runTrackBonkfun = (i: any) => clientGet(`/v1/memes/bonkfun`, i);

export const checkMemecoinRiskInputSchema = z.object({
  mint: z.string().min(1).describe("Required. Solana token mint address."),
});
export const checkMemecoinRiskDefinition = {
  name: "check_memecoin_risk",
  description:
    "Memecoin-specific risk: bundler detection, dev sells, sniper detection. Required: mint (Solana token mint address). Pro tier.",
};
export const runCheckMemecoinRisk = (i: any) => clientGet(`/v1/memes/risk`, i);

export const getDegenLeaderboardInputSchema = z.object({
  window: z.enum(["1d", "7d", "30d"]).default("7d"),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getDegenLeaderboardDefinition = {
  name: "get_degen_leaderboard",
  description: "Top PnL wallets on memes. Pro tier.",
};
export const runGetDegenLeaderboard = (i: any) => clientGet(`/v1/memes/leaderboard`, i);

// =========================================================================
// Microstructure (category 9a) — prop desk / institutional
// =========================================================================

export const getFundingRatesInputSchema = z.object({
  symbol: z.string().min(1).describe("e.g. 'BTC', 'ETH'."),
  exchanges: z.string().optional().describe("Comma-separated exchange list."),
});
export const getFundingRatesDefinition = {
  name: "get_funding_rates",
  description:
    "Perps funding across Binance / Bybit / dYdX / Hyperliquid / Drift. Pro tier.",
};
export const runGetFundingRates = (i: any) =>
  clientGet(`/v1/microstructure/funding-rates`, i);

export const getOptionsFlowInputSchema = z.object({
  symbol: z.string().min(1),
});
export const getOptionsFlowDefinition = {
  name: "get_options_flow",
  description: "IV, strike heatmap, block trades (Deribit + Lyra + Aevo). Pro tier.",
};
export const runGetOptionsFlow = (i: any) => clientGet(`/v1/microstructure/options-flow`, i);

export const getLiquidationHeatmapInputSchema = z.object({
  symbol: z.string().min(1),
});
export const getLiquidationHeatmapDefinition = {
  name: "get_liquidation_heatmap",
  description: "Where leveraged positions get wiped. Pro tier.",
};
export const runGetLiquidationHeatmap = (i: any) =>
  clientGet(`/v1/microstructure/liquidation-heatmap`, i);

export const getExchangeFlowsInputSchema = z.object({
  symbol: z.string().min(1),
  window: z.enum(["1d", "7d", "30d"]).default("7d"),
});
export const getExchangeFlowsDefinition = {
  name: "get_exchange_flows",
  description: "Net in/out from CEXs — smart-money signal. Pro tier.",
};
export const runGetExchangeFlows = (i: any) =>
  clientGet(`/v1/microstructure/exchange-flows`, i);

export const predictListingInputSchema = z.object({
  entity_slug: z.string().min(1),
});
export const predictListingDefinition = {
  name: "predict_listing",
  description: "Binance/Coinbase/Upbit listing probability score. Pro tier.",
};
export const runPredictListing = (i: any) =>
  clientGet(`/v1/microstructure/predict-listing`, i);

// =========================================================================
// Narrative (category 9d)
// =========================================================================

export const trackNarrativeInputSchema = z.object({
  narrative: z.string().min(1).describe("e.g. 'ai-agents', 'rwa', 'depin', 'modular'."),
  window: z.enum(["1d", "7d", "30d"]).default("7d"),
});
export const trackNarrativeDefinition = {
  name: "track_narrative",
  description:
    "Real-time narrative strength (AI agents, RWA, DePIN, modular, memes, Bitcoin L2s, SocialFi, GameFi). Composite of BCA Narrative Strength Score. Starter tier.",
};
export const runTrackNarrative = (i: any) => clientGet(`/v1/narrative/track`, i);

export const getAiAgentTokensInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getAiAgentTokensDefinition = {
  name: "get_ai_agent_tokens",
  description:
    "AI agent tokens tracker: Virtuals, ai16z, Aixbt, Griffain, Zerebro.",
};
export const runGetAiAgentTokens = (i: any) => clientGet(`/v1/narrative/ai-agents`, i);

export const getDepinProjectsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getDepinProjectsDefinition = {
  name: "get_depin_projects",
  description: "DePIN ecosystem tracker.",
};
export const runGetDepinProjects = (i: any) => clientGet(`/v1/narrative/depin`, i);

export const getRwaTokensInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getRwaTokensDefinition = {
  name: "get_rwa_tokens",
  description: "Real-world asset tokenization tracker. Starter tier.",
};
export const runGetRwaTokens = (i: any) => clientGet(`/v1/narrative/rwa`, i);

export const getPredictionMarketsInputSchema = z.object({
  topic: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getPredictionMarketsDefinition = {
  name: "get_prediction_markets",
  description: "Polymarket + Kalshi + Azuro odds.",
};
export const runGetPredictionMarkets = (i: any) =>
  clientGet(`/v1/narrative/prediction-markets`, i);

// =========================================================================
// Regulatory (category 9b)
// =========================================================================

export const getRegulatoryStatusInputSchema = z.object({
  country: z.string().min(2).describe("ISO country code or name."),
});
export const getRegulatoryStatusDefinition = {
  name: "get_regulatory_status",
  description: "Country-by-country crypto regulation state. Starter tier.",
};
export const runGetRegulatoryStatus = (i: any) => clientGet(`/v1/regulatory/status`, i);

export const trackSecFilingsInputSchema = z.object({
  ticker: z.string().min(1).describe("e.g. MSTR, COIN, HOOD."),
});
export const trackSecFilingsDefinition = {
  name: "track_sec_filings",
  description: "SEC filings for listed crypto companies. Starter tier.",
};
export const runTrackSecFilings = (i: any) => clientGet(`/v1/regulatory/sec-filings`, i);

export const getMicaStatusInputSchema = z.object({
  entity_slug: z.string().min(1),
});
export const getMicaStatusDefinition = {
  name: "get_mica_status",
  description: "EU MiCA compliance tracker per project. Pro tier.",
};
export const runGetMicaStatus = (i: any) => clientGet(`/v1/regulatory/mica`, i);

export const getTaxRulesInputSchema = z.object({
  country: z.string().min(2),
});
export const getTaxRulesDefinition = {
  name: "get_tax_rules",
  description: "Crypto tax rules per jurisdiction. Starter tier.",
};
export const runGetTaxRules = (i: any) => clientGet(`/v1/regulatory/tax-rules`, i);

// =========================================================================
// Security (category 9c) — all free tier
// =========================================================================

export const checkExploitHistoryInputSchema = z.object({
  entity_slug: z.string().min(1),
});
export const checkExploitHistoryDefinition = {
  name: "check_exploit_history",
  description: "Historical exploits per protocol (Rekt + DefiLlama hacks).",
};
export const runCheckExploitHistory = (i: any) => clientGet(`/v1/security/exploits`, i);

export const checkPhishingDomainInputSchema = z.object({
  domain: z.string().min(1),
});
export const checkPhishingDomainDefinition = {
  name: "check_phishing_domain",
  description: "Known phishing / scam domains + contracts.",
};
export const runCheckPhishingDomain = (i: any) => clientGet(`/v1/security/phishing`, i);

export const getBugBountyProgramsInputSchema = z.object({
  min_payout: z.number().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getBugBountyProgramsDefinition = {
  name: "get_bug_bounty_programs",
  description: "Active bounties (Immunefi + Hackerone crypto).",
};
export const runGetBugBountyPrograms = (i: any) => clientGet(`/v1/security/bug-bounties`, i);

export const scanContractInputSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Required. EVM contract address (0x + 40 hex chars)."),
});
export const scanContractDefinition = {
  name: "scan_contract",
  description:
    "Basic static analysis on any EVM address: bytecode verification, honeypot check. Required: address (0x EVM address). Starter tier.",
};
export const runScanContract = (i: any) => clientGet(`/v1/security/scan-contract`, i);

// =========================================================================
// Services (category 9d) — POST, revenue plays
// =========================================================================

export const bookKolCampaignInputSchema = z.object({
  contact_email: z.string().email().describe("Required. Contact email for campaign coordination."),
  budget_usd: z.number().min(100),
  objective: z.string().min(1),
  target_audience: z.string().optional(),
  launch_window_days: z.number().int().min(1).max(365).default(30),
});
export const bookKolCampaignDefinition = {
  name: "book_kol_campaign",
  description:
    "Broker a KOL campaign via BCA Studio CRM. Required: contact_email, budget_usd, objective. Pro tier. Returns campaign_id + next steps.",
};
export const runBookKolCampaign = (i: any) =>
  clientPost(`/v1/services/book-kol-campaign`, i);

export const requestCustomResearchInputSchema = z.object({
  contact_email: z.string().email().describe("Required. Contact email for report delivery."),
  topic: z.string().min(1),
  depth: z.enum(["light", "standard", "deep"]).default("standard"),
  deadline_days: z.number().int().min(1).max(30).default(7),
});
export const requestCustomResearchDefinition = {
  name: "request_custom_research",
  description:
    "Escalate to BCA deep-researcher skill. Required: contact_email, topic. Pro tier. Returns order_id + pricing.",
};
export const runRequestCustomResearch = (i: any) =>
  clientPost(`/v1/services/custom-research`, i);

export const submitListingInputSchema = z.object({
  listing_name: z.string().min(1).describe("Required. Display name for the listing."),
  directory: z.string().min(1).describe("Target directory, e.g. 'vcs', 'aggregators'."),
  entity: z.string().min(1),
  contact_email: z.string().email(),
});
export const submitListingDefinition = {
  name: "submit_listing",
  description:
    "Submit a listing to a BCA directory (vcs, aggregators, trading-bots, etc.). Required: listing_name, directory, entity, contact_email. Free to call, paid to feature.",
};
export const runSubmitListing = (i: any) =>
  clientPost(`/v1/services/submit-listing`, i);

// =========================================================================
// History (category 7b) — time series
// =========================================================================

export const getHistoryPricesInputSchema = z.object({
  symbol: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(365),
});
export const getHistoryPricesDefinition = {
  name: "get_history_prices",
  description: "Long-range historical price series for a symbol.",
};
export const runGetHistoryPrices = (i: any) =>
  clientGet(`/v1/history/prices/${encodeURIComponent(i.symbol)}`, { days: i.days });

export const getHistorySentimentInputSchema = z.object({
  symbol: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(365),
});
export const getHistorySentimentDefinition = {
  name: "get_history_sentiment",
  description: "Historical sentiment series for a symbol.",
};
export const runGetHistorySentiment = (i: any) =>
  clientGet(`/v1/history/sentiment/${encodeURIComponent(i.symbol)}`, { days: i.days });

export const getHistoryCorrelationInputSchema = z.object({
  symbol: z.string().min(1),
  peer: z.string().min(1).describe("Peer symbol to correlate against."),
  days: z.number().int().min(7).max(3650).default(365),
});
export const getHistoryCorrelationDefinition = {
  name: "get_history_correlation",
  description:
    "Correlation series between two symbols (price/sentiment). Useful for pair trades.",
};
export const runGetHistoryCorrelation = (i: any) =>
  clientGet(`/v1/history/correlation/${encodeURIComponent(i.symbol)}`, {
    peer: i.peer,
    days: i.days,
  });

export const getHistoryCoverageInputSchema = z.object({
  entity_slug: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(365),
});
export const getHistoryCoverageDefinition = {
  name: "get_history_coverage",
  description: "Historical BCA coverage series per entity.",
};
export const runGetHistoryCoverage = (i: any) => clientGet(`/v1/history/coverage`, i);

// =========================================================================
// Entities / topics / sources / stories / trending / feed (corpus meta)
// =========================================================================

export const listEntitiesInputSchema = z.object({
  kind: z
    .enum(["chain", "project", "person", "ticker", "protocol", "exchange", "fund"])
    .optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export const listEntitiesDefinition = {
  name: "list_entities",
  description:
    "Browse the BCA entity universe (~200 entities). Filter by kind.",
};
export const runListEntities = (i: any) => clientGet(`/v1/entities`, i);

export const getTopicInputSchema = z.object({ slug: z.string().min(1) });
export const getTopicDefinition = {
  name: "get_topic",
  description: "Fetch a topic node from the taxonomy (articles under it, parents, siblings).",
};
export const runGetTopic = (i: any) =>
  clientGet(`/v1/topics/${encodeURIComponent(i.slug)}`);

export const searchAcademyInputSchema = z.object({
  q: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
});
export const searchAcademyDefinition = {
  name: "search_academy",
  description:
    "Full-text search across academy lessons. Returns course + lesson anchor per hit.",
};
export const runSearchAcademy = (i: any) => clientGet(`/v1/academy/search`, i);

export const getTrendingInputSchema = z.object({
  window: z.enum(["1h", "24h", "7d"]).default("24h"),
  limit: z.number().int().min(1).max(50).default(20),
});
export const getTrendingDefinition = {
  name: "get_trending",
  description: "Trending entities + articles by window.",
};
export const runGetTrending = (i: any) => clientGet(`/v1/trending`, i);

export const getUnifiedFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getUnifiedFeedDefinition = {
  name: "get_unified_feed",
  description: "Chronological cross-source news feed (articles + stories).",
};
export const runGetUnifiedFeed = (i: any) => clientGet(`/v1/feed`, i);

export const listSourcesInputSchema = z.object({});
export const listSourcesDefinition = {
  name: "list_sources",
  description: "All editorial news sources BCA ingests, with trust tier.",
};
export const runListSources = () => clientGet(`/v1/sources`);

export const getRecentStoriesInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});
export const getRecentStoriesDefinition = {
  name: "get_recent_stories",
  description: "Recent clustered stories (deduped across sources).",
};
export const runGetRecentStories = (i: any) => clientGet(`/v1/stories/recent`, i);

// =========================================================================
// Memos + theses (investment research — public tier)
// =========================================================================

export const listMemosInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});
export const listMemosDefinition = {
  name: "list_memos",
  description: "Browse public investment memos (paid fields redacted).",
};
export const runListMemos = (i: any) => clientGet(`/v1/memos`, i);

export const getMemoInputSchema = z.object({ slug: z.string().min(1) });
export const getMemoDefinition = {
  name: "get_memo",
  description: "Fetch a specific investment memo by slug.",
};
export const runGetMemo = (i: any) => clientGet(`/v1/memos/${encodeURIComponent(i.slug)}`);

export const listThesesInputSchema = z.object({
  status: z.enum(["active", "closed", "all"]).default("active"),
  limit: z.number().int().min(1).max(100).default(20),
});
export const listThesesDefinition = {
  name: "list_theses",
  description: "Browse public trade theses (entry / invalidation / targets).",
};
export const runListTheses = (i: any) => clientGet(`/v1/theses`, i);

export const getThesisInputSchema = z.object({ slug: z.string().min(1) });
export const getThesisDefinition = {
  name: "get_thesis",
  description: "Fetch a specific trade thesis by slug.",
};
export const runGetThesis = (i: any) => clientGet(`/v1/theses/${encodeURIComponent(i.slug)}`);

// =========================================================================
// Social signals (category: hybrid sentiment)
// =========================================================================

export const getSocialSignalsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});
export const getSocialSignalsDefinition = {
  name: "get_social_signals",
  description: "Cross-symbol social signal feed.",
};
export const runGetSocialSignals = (i: any) => clientGet(`/v1/social-signals`, i);

export const getSocialSignalsDetailInputSchema = z.object({
  symbol: z.string().min(1),
});
export const getSocialSignalsDetailDefinition = {
  name: "get_social_signals_detail",
  description: "Social signal detail for a single symbol.",
};
export const runGetSocialSignalsDetail = (i: any) =>
  clientGet(`/v1/social-signals/${encodeURIComponent(i.symbol)}`);

// =========================================================================
// Currencies (meta registry)
// =========================================================================

export const listCurrenciesInputSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
});
export const listCurrenciesDefinition = {
  name: "list_currencies",
  description: "All tracked currencies with symbol, id, and chain metadata.",
};
export const runListCurrencies = (i: any) => clientGet(`/v1/currencies`, i);

export const getCurrencyFeedInputSchema = z.object({
  symbol: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(50),
});
export const getCurrencyFeedDefinition = {
  name: "get_currency_feed",
  description: "Chronological news feed for a single currency.",
};
export const runGetCurrencyFeed = (i: any) =>
  clientGet(`/v1/currencies/${encodeURIComponent(i.symbol)}/feed`, { limit: i.limit });
