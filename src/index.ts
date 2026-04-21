#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { BcaError } from "./errors.js";
import {
  searchNewsInputSchema,
  searchNewsDefinition,
  runSearchNews,
} from "./tools/search_news.js";
import {
  getEntityInputSchema,
  getEntityDefinition,
  runGetEntity,
} from "./tools/get_entity.js";
import {
  getExplainerInputSchema,
  getExplainerDefinition,
  runGetExplainer,
} from "./tools/get_explainer.js";
import * as content from "./tools/content.js";
import * as market from "./tools/market.js";
import * as onchain from "./tools/onchain.js";
import * as sentiment from "./tools/sentiment.js";
import * as indicators from "./tools/indicators.js";
import * as agentJobs from "./tools/agent_jobs.js";
import * as ext from "./tools/extended.js";

// --- zod -> JSON Schema (minimal, MCP-compatible) ---------------------------
// Uses zod's built-in toJSONSchema when present (zod 3.23+), else a minimal
// hand-rolled shim that introspects the top-level ZodObject shape. MCP clients
// only need a syntactically valid JSON Schema object for tool advertisement.
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Prefer zod's own exporter if present (zod >= 3.23 ships z.toJSONSchema in some builds)
  const zAny = z as unknown as {
    toJSONSchema?: (s: z.ZodTypeAny) => Record<string, unknown>;
  };
  if (typeof zAny.toJSONSchema === "function") {
    try {
      return zAny.toJSONSchema(schema);
    } catch {
      /* fall through */
    }
  }

  // Fallback: derive from ZodObject shape. Handles Optional/Default wrappers.
  const unwrap = (s: z.ZodTypeAny): z.ZodTypeAny => {
    let cur: z.ZodTypeAny = s;
    while ((cur as any)?._def?.innerType) cur = (cur as any)._def.innerType as z.ZodTypeAny;
    return cur;
  };

  const describe = (s: z.ZodTypeAny): Record<string, unknown> => {
    const inner = unwrap(s);
    const typeName: string | undefined = (inner as any)?._def?.typeName;
    const description: string | undefined = (s as any)._def?.description;
    const base: Record<string, unknown> = {};
    if (description) base["description"] = description;

    switch (typeName) {
      case "ZodString":
        base["type"] = "string";
        break;
      case "ZodNumber":
        base["type"] = "number";
        break;
      case "ZodBoolean":
        base["type"] = "boolean";
        break;
      case "ZodArray":
        base["type"] = "array";
        break;
      default:
        base["type"] = "string";
    }
    return base;
  };

  const root = unwrap(schema);
  const shape: Record<string, z.ZodTypeAny> | undefined = (root as any)?.shape;
  if (!shape) return { type: "object" };

  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    properties[key] = describe(value);
    const tn: string | undefined = (value as any)?._def?.typeName;
    if (tn !== "ZodOptional" && tn !== "ZodDefault") required.push(key);
  }

  const out: Record<string, unknown> = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) out["required"] = required;
  return out;
}

interface ToolEntry {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly run: (args: unknown) => Promise<{
    data: unknown;
    cite_url?: string;
    as_of?: string;
    source_hash?: string;
    meta?: Record<string, unknown>;
  }>;
}

/** Factory that produces a ToolEntry from a (schema, definition, runner) triad. */
function entry<T>(
  schema: any,
  def: { name: string; description: string },
  runner: (input: T) => Promise<any>,
): ToolEntry {
  return {
    name: def.name,
    description: def.description,
    inputSchema: zodToJsonSchema(schema),
    run: async (args) => runner(schema.parse(args ?? {})),
  };
}

const TOOLS: ReadonlyArray<ToolEntry> = [
  // --- v0.1 core (already shipped) -----------------------------------------
  entry(searchNewsInputSchema, searchNewsDefinition, runSearchNews),
  entry(getEntityInputSchema, getEntityDefinition, runGetEntity),
  entry(getExplainerInputSchema, getExplainerDefinition, runGetExplainer),

  // --- Content & corpus (category 1) ---------------------------------------
  entry(content.getArticleInputSchema, content.getArticleDefinition, content.runGetArticle),
  entry(
    content.listEntityMentionsInputSchema,
    content.listEntityMentionsDefinition,
    content.runListEntityMentions,
  ),
  entry(content.listTopicsInputSchema, content.listTopicsDefinition, content.runListTopics),
  entry(
    content.getAsOfSnapshotInputSchema,
    content.getAsOfSnapshotDefinition,
    content.runGetAsOfSnapshot,
  ),

  // --- Market data (category 2) --------------------------------------------
  entry(market.getPriceInputSchema, market.getPriceDefinition, market.runGetPrice),
  entry(market.getOhlcInputSchema, market.getOhlcDefinition, market.runGetOhlc),
  entry(
    market.getMarketOverviewInputSchema,
    market.getMarketOverviewDefinition,
    market.runGetMarketOverview,
  ),
  entry(market.getPairDataInputSchema, market.getPairDataDefinition, market.runGetPairData),

  // --- On-chain (category 3) -----------------------------------------------
  entry(
    onchain.getWalletProfileInputSchema,
    onchain.getWalletProfileDefinition,
    onchain.runGetWalletProfile,
  ),
  entry(onchain.getTxInputSchema, onchain.getTxDefinition, onchain.runGetTx),
  entry(
    onchain.getTokenHoldersInputSchema,
    onchain.getTokenHoldersDefinition,
    onchain.runGetTokenHolders,
  ),
  entry(
    onchain.getDefiProtocolInputSchema,
    onchain.getDefiProtocolDefinition,
    onchain.runGetDefiProtocol,
  ),

  // --- Sentiment (category 4) ----------------------------------------------
  entry(
    sentiment.getSentimentInputSchema,
    sentiment.getSentimentDefinition,
    sentiment.runGetSentiment,
  ),
  entry(
    sentiment.getSocialPulseInputSchema,
    sentiment.getSocialPulseDefinition,
    sentiment.runGetSocialPulse,
  ),
  entry(
    sentiment.getFearGreedInputSchema,
    sentiment.getFearGreedDefinition,
    sentiment.runGetFearGreed,
  ),

  // --- Proprietary indicators (category 5) ---------------------------------
  entry(
    indicators.getCoverageIndexInputSchema,
    indicators.getCoverageIndexDefinition,
    indicators.runGetCoverageIndex,
  ),
  entry(
    indicators.getNarrativeStrengthInputSchema,
    indicators.getNarrativeStrengthDefinition,
    indicators.runGetNarrativeStrength,
  ),
  entry(
    indicators.getSentimentVelocityInputSchema,
    indicators.getSentimentVelocityDefinition,
    indicators.runGetSentimentVelocity,
  ),
  entry(
    indicators.getEditorialPremiumInputSchema,
    indicators.getEditorialPremiumDefinition,
    indicators.runGetEditorialPremium,
  ),
  entry(
    indicators.getKolInfluenceInputSchema,
    indicators.getKolInfluenceDefinition,
    indicators.runGetKolInfluence,
  ),
  entry(
    indicators.getRiskScoreInputSchema,
    indicators.getRiskScoreDefinition,
    indicators.runGetRiskScore,
  ),

  // --- Agent-backed generation (category 6) --------------------------------
  entry(
    agentJobs.generateDueDiligenceInputSchema,
    agentJobs.generateDueDiligenceDefinition,
    agentJobs.runGenerateDueDiligence,
  ),
  entry(
    agentJobs.generateTokenomicsModelInputSchema,
    agentJobs.generateTokenomicsModelDefinition,
    agentJobs.runGenerateTokenomicsModel,
  ),
  entry(
    agentJobs.summarizeWhitepaperInputSchema,
    agentJobs.summarizeWhitepaperDefinition,
    agentJobs.runSummarizeWhitepaper,
  ),
  entry(
    agentJobs.translateContractInputSchema,
    agentJobs.translateContractDefinition,
    agentJobs.runTranslateContract,
  ),
  entry(
    agentJobs.monitorKeywordInputSchema,
    agentJobs.monitorKeywordDefinition,
    agentJobs.runMonitorKeyword,
  ),
  entry(agentJobs.getAgentJobInputSchema, agentJobs.getAgentJobDefinition, agentJobs.runGetAgentJob),

  // --- Directories (category 7) --------------------------------------------
  entry(ext.listStablecoinsInputSchema, ext.listStablecoinsDefinition, ext.runListStablecoins),
  entry(ext.listNftCommunitiesInputSchema, ext.listNftCommunitiesDefinition, ext.runListNftCommunities),
  entry(ext.listYieldsInputSchema, ext.listYieldsDefinition, ext.runListYields),
  entry(ext.listAggregatorsInputSchema, ext.listAggregatorsDefinition, ext.runListAggregators),
  entry(ext.listMcpsInputSchema, ext.listMcpsDefinition, ext.runListMcps),
  entry(ext.listTradingBotsInputSchema, ext.listTradingBotsDefinition, ext.runListTradingBots),
  entry(ext.listVcsInputSchema, ext.listVcsDefinition, ext.runListVcs),
  entry(ext.listJobsInputSchema, ext.listJobsDefinition, ext.runListJobs),
  entry(ext.listSmartContractTemplatesInputSchema, ext.listSmartContractTemplatesDefinition, ext.runListSmartContractTemplates),
  entry(ext.getSmartContractTemplateInputSchema, ext.getSmartContractTemplateDefinition, ext.runGetSmartContractTemplate),
  entry(ext.listMarketingTemplatesInputSchema, ext.listMarketingTemplatesDefinition, ext.runListMarketingTemplates),
  entry(ext.getMarketingTemplateInputSchema, ext.getMarketingTemplateDefinition, ext.runGetMarketingTemplate),
  entry(ext.buildCustomIndicatorInputSchema, ext.buildCustomIndicatorDefinition, ext.runBuildCustomIndicator),

  // --- Fundamentals (category 8) -------------------------------------------
  entry(ext.getTokenomicsInputSchema, ext.getTokenomicsDefinition, ext.runGetTokenomics),
  entry(ext.getAuditReportsInputSchema, ext.getAuditReportsDefinition, ext.runGetAuditReports),
  entry(ext.getTeamInfoInputSchema, ext.getTeamInfoDefinition, ext.runGetTeamInfo),
  entry(ext.getRoadmapInputSchema, ext.getRoadmapDefinition, ext.runGetRoadmap),
  entry(ext.compareProtocolsInputSchema, ext.compareProtocolsDefinition, ext.runCompareProtocols),
  entry(ext.checkRugpullRiskInputSchema, ext.checkRugpullRiskDefinition, ext.runCheckRugpullRisk),

  // --- Chain-specific ------------------------------------------------------
  entry(ext.getSolanaEcosystemInputSchema, ext.getSolanaEcosystemDefinition, ext.runGetSolanaEcosystem),
  entry(ext.getL2ComparisonInputSchema, ext.getL2ComparisonDefinition, ext.runGetL2Comparison),
  entry(ext.getBitcoinL2StatusInputSchema, ext.getBitcoinL2StatusDefinition, ext.runGetBitcoinL2Status),
  entry(ext.getTonEcosystemInputSchema, ext.getTonEcosystemDefinition, ext.runGetTonEcosystem),

  // --- Compute / AI crypto -------------------------------------------------
  entry(ext.getComputePricingInputSchema, ext.getComputePricingDefinition, ext.runGetComputePricing),
  entry(ext.getAiCryptoMetricsInputSchema, ext.getAiCryptoMetricsDefinition, ext.runGetAiCryptoMetrics),

  // --- Memes ---------------------------------------------------------------
  entry(ext.trackPumpfunInputSchema, ext.trackPumpfunDefinition, ext.runTrackPumpfun),
  entry(ext.trackBonkfunInputSchema, ext.trackBonkfunDefinition, ext.runTrackBonkfun),
  entry(ext.checkMemecoinRiskInputSchema, ext.checkMemecoinRiskDefinition, ext.runCheckMemecoinRisk),
  entry(ext.getDegenLeaderboardInputSchema, ext.getDegenLeaderboardDefinition, ext.runGetDegenLeaderboard),

  // --- Microstructure ------------------------------------------------------
  entry(ext.getFundingRatesInputSchema, ext.getFundingRatesDefinition, ext.runGetFundingRates),
  entry(ext.getOptionsFlowInputSchema, ext.getOptionsFlowDefinition, ext.runGetOptionsFlow),
  entry(ext.getLiquidationHeatmapInputSchema, ext.getLiquidationHeatmapDefinition, ext.runGetLiquidationHeatmap),
  entry(ext.getExchangeFlowsInputSchema, ext.getExchangeFlowsDefinition, ext.runGetExchangeFlows),
  entry(ext.predictListingInputSchema, ext.predictListingDefinition, ext.runPredictListing),

  // --- Narrative -----------------------------------------------------------
  entry(ext.trackNarrativeInputSchema, ext.trackNarrativeDefinition, ext.runTrackNarrative),
  entry(ext.getAiAgentTokensInputSchema, ext.getAiAgentTokensDefinition, ext.runGetAiAgentTokens),
  entry(ext.getDepinProjectsInputSchema, ext.getDepinProjectsDefinition, ext.runGetDepinProjects),
  entry(ext.getRwaTokensInputSchema, ext.getRwaTokensDefinition, ext.runGetRwaTokens),
  entry(ext.getPredictionMarketsInputSchema, ext.getPredictionMarketsDefinition, ext.runGetPredictionMarkets),

  // --- Regulatory ----------------------------------------------------------
  entry(ext.getRegulatoryStatusInputSchema, ext.getRegulatoryStatusDefinition, ext.runGetRegulatoryStatus),
  entry(ext.trackSecFilingsInputSchema, ext.trackSecFilingsDefinition, ext.runTrackSecFilings),
  entry(ext.getMicaStatusInputSchema, ext.getMicaStatusDefinition, ext.runGetMicaStatus),
  entry(ext.getTaxRulesInputSchema, ext.getTaxRulesDefinition, ext.runGetTaxRules),

  // --- Security ------------------------------------------------------------
  entry(ext.checkExploitHistoryInputSchema, ext.checkExploitHistoryDefinition, ext.runCheckExploitHistory),
  entry(ext.checkPhishingDomainInputSchema, ext.checkPhishingDomainDefinition, ext.runCheckPhishingDomain),
  entry(ext.getBugBountyProgramsInputSchema, ext.getBugBountyProgramsDefinition, ext.runGetBugBountyPrograms),
  entry(ext.scanContractInputSchema, ext.scanContractDefinition, ext.runScanContract),

  // --- Services (POST, revenue plays) --------------------------------------
  entry(ext.bookKolCampaignInputSchema, ext.bookKolCampaignDefinition, ext.runBookKolCampaign),
  entry(ext.requestCustomResearchInputSchema, ext.requestCustomResearchDefinition, ext.runRequestCustomResearch),
  entry(ext.submitListingInputSchema, ext.submitListingDefinition, ext.runSubmitListing),

  // --- History time series -------------------------------------------------
  entry(ext.getHistoryPricesInputSchema, ext.getHistoryPricesDefinition, ext.runGetHistoryPrices),
  entry(ext.getHistorySentimentInputSchema, ext.getHistorySentimentDefinition, ext.runGetHistorySentiment),
  entry(ext.getHistoryCorrelationInputSchema, ext.getHistoryCorrelationDefinition, ext.runGetHistoryCorrelation),
  entry(ext.getHistoryCoverageInputSchema, ext.getHistoryCoverageDefinition, ext.runGetHistoryCoverage),

  // --- Corpus meta ---------------------------------------------------------
  entry(ext.listEntitiesInputSchema, ext.listEntitiesDefinition, ext.runListEntities),
  entry(ext.getTopicInputSchema, ext.getTopicDefinition, ext.runGetTopic),
  entry(ext.searchAcademyInputSchema, ext.searchAcademyDefinition, ext.runSearchAcademy),
  entry(ext.getTrendingInputSchema, ext.getTrendingDefinition, ext.runGetTrending),
  entry(ext.getUnifiedFeedInputSchema, ext.getUnifiedFeedDefinition, ext.runGetUnifiedFeed),
  entry(ext.listSourcesInputSchema, ext.listSourcesDefinition, ext.runListSources),
  entry(ext.getRecentStoriesInputSchema, ext.getRecentStoriesDefinition, ext.runGetRecentStories),

  // --- Memos + theses ------------------------------------------------------
  entry(ext.listMemosInputSchema, ext.listMemosDefinition, ext.runListMemos),
  entry(ext.getMemoInputSchema, ext.getMemoDefinition, ext.runGetMemo),
  entry(ext.listThesesInputSchema, ext.listThesesDefinition, ext.runListTheses),
  entry(ext.getThesisInputSchema, ext.getThesisDefinition, ext.runGetThesis),

  // --- Social signals ------------------------------------------------------
  entry(ext.getSocialSignalsInputSchema, ext.getSocialSignalsDefinition, ext.runGetSocialSignals),
  entry(ext.getSocialSignalsDetailInputSchema, ext.getSocialSignalsDetailDefinition, ext.runGetSocialSignalsDetail),

  // --- Currencies ----------------------------------------------------------
  entry(ext.listCurrenciesInputSchema, ext.listCurrenciesDefinition, ext.runListCurrencies),
  entry(ext.getCurrencyFeedInputSchema, ext.getCurrencyFeedDefinition, ext.runGetCurrencyFeed),
];

const server = new Server(
  { name: "@blockchainacademics/mcp", version: "0.2.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: {
              code: "BCA_BAD_REQUEST",
              message: `Unknown tool: ${req.params.name}`,
            },
          }),
        },
      ],
    };
  }

  try {
    const envelope = await tool.run(req.params.arguments ?? {});
    // Attribution surfacing: cite_url/as_of/source_hash always present
    // (null when upstream omits) so downstream agents can detect provenance.
    const payload = {
      data: envelope.data,
      attribution: {
        cite_url: envelope.cite_url ?? null,
        as_of: envelope.as_of ?? null,
        source_hash: envelope.source_hash ?? null,
      },
      meta: envelope.meta ?? null,
    };
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  } catch (err) {
    const code = err instanceof BcaError ? err.code : "BCA_UNKNOWN";
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: { code, message } }, null, 2),
        },
      ],
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Deliberately no console.log — stdio transport owns stdout.
}

main().catch((err) => {
  // Fatal startup errors go to stderr so the host sees them without corrupting stdio.
  process.stderr.write(
    `[bca-mcp] fatal: ${err?.stack ?? String(err)}\n`,
  );
  process.exit(1);
});
