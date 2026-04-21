/**
 * Agent-backed generation tools (category 6). Async — return {job_id, status_url};
 * callers poll get_agent_job until status=completed. Pro/Team tier.
 *
 * Backend endpoints confirmed from /v1/agent-jobs/*: due-diligence,
 * tokenomics-model, summarize-whitepaper, translate-contract, monitor-keyword.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import type { ResponseEnvelope } from "../types.js";

// --- generate_due_diligence -----------------------------------------------
export const generateDueDiligenceInputSchema = z.object({
  entity_slug: z.string().min(1).describe("Target entity slug."),
  depth: z.enum(["light", "standard", "deep"]).default("standard").describe("Depth of the report: light|standard|deep."),
  focus: z
    .array(z.string())
    .optional()
    .describe("Optional focus areas (e.g. ['tokenomics', 'audits'])."),
});
export const generateDueDiligenceDefinition = {
  name: "generate_due_diligence",
  description:
    "Kick off a full due-diligence report (tokenomics + team + audits + risk + narrative). Required: entity_slug. depth ∈ {light, standard, deep}. Async — returns {job_id, status_url}; poll get_agent_job. Pro tier.",
};
export async function runGenerateDueDiligence(
  input: z.infer<typeof generateDueDiligenceInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().post(`/v1/agent-jobs/due-diligence`, {
    entity_slug: input.entity_slug,
    depth: input.depth,
    focus: input.focus ?? [],
  });
}

// --- generate_tokenomics_model --------------------------------------------
export const generateTokenomicsModelInputSchema = z.object({
  entity_slug: z.string().min(1),
  horizon_days: z.number().int().min(30).max(3650).default(365),
  scenarios: z
    .array(z.enum(["base", "bull", "bear"]))
    .default(["base", "bull", "bear"]),
});
export const generateTokenomicsModelDefinition = {
  name: "generate_tokenomics_model",
  description:
    "Simulate emission/unlock impact on FDV across scenarios. Async, Team tier. Returns {job_id, status_url}.",
};
export async function runGenerateTokenomicsModel(
  input: z.infer<typeof generateTokenomicsModelInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().post(`/v1/agent-jobs/tokenomics-model`, input);
}

// --- summarize_whitepaper --------------------------------------------------
export const summarizeWhitepaperInputSchema = z.object({
  url: z.string().url().describe("Public URL of the whitepaper (PDF or HTML)."),
  length: z.enum(["brief", "standard", "deep"]).default("standard"),
});
export const summarizeWhitepaperDefinition = {
  name: "summarize_whitepaper",
  description:
    "Fetch + structurally summarize a whitepaper URL. Async, Pro tier. Returns {job_id, status_url}.",
};
export async function runSummarizeWhitepaper(
  input: z.infer<typeof summarizeWhitepaperInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().post(`/v1/agent-jobs/summarize-whitepaper`, input);
}

// --- translate_contract ----------------------------------------------------
export const translateContractInputSchema = z.object({
  source_code: z.string().min(10),
  source_language: z.enum(["solidity", "vyper", "move", "rust-anchor"]).describe("Source contract language."),
  target_language: z.enum(["solidity", "vyper", "move", "rust-anchor"]).describe("Target contract language."),
});
export const translateContractDefinition = {
  name: "translate_contract",
  description:
    "Translate a smart contract between languages (Solidity ↔ Vyper ↔ Move ↔ Anchor). Required: source_code, source_language, target_language. Async, Team tier.",
};
export async function runTranslateContract(
  input: z.infer<typeof translateContractInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().post(`/v1/agent-jobs/translate-contract`, input);
}

// --- monitor_keyword -------------------------------------------------------
export const monitorKeywordInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  webhook_url: z.string().url().describe("HTTPS webhook URL for notifications (required)."),
  window_hours: z.number().int().min(1).max(168).default(24),
});
export const monitorKeywordDefinition = {
  name: "monitor_keyword",
  description:
    "Register a keyword monitor: fires a webhook when the keyword appears across corpus. Required: keyword, webhook_url (https URL). Async, Pro tier.",
};
export async function runMonitorKeyword(
  input: z.infer<typeof monitorKeywordInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().post(`/v1/agent-jobs/monitor-keyword`, input);
}

// --- get_agent_job ---------------------------------------------------------
export const getAgentJobInputSchema = z.object({
  job_id: z.string().min(1).describe("Job ID returned from any generate_* tool."),
});
export const getAgentJobDefinition = {
  name: "get_agent_job",
  description:
    "Poll the status of an async agent job. Returns {status: queued|running|completed|failed, output?, error?}.",
};
export async function runGetAgentJob(
  input: z.infer<typeof getAgentJobInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request(`/v1/agent-jobs/${encodeURIComponent(input.job_id)}`);
}
