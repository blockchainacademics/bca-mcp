# @blockchainacademics/mcp

The canonical crypto MCP server for AI agents. **99 tools** spanning 3,501+ editorial articles, 200+ entity dossiers, 43 academy lessons, aggregated market + on-chain data, proprietary indicators, and async agent-backed generation — all accessible as MCP tools your AI agent can call natively.

## Tool categories (v0.2.0)

| Category | Count | Examples |
|---|---|---|
| Content & corpus | 7 | `search_news`, `get_article`, `get_entity`, `get_explainer`, `list_entity_mentions`, `get_as_of_snapshot` |
| Market data | 4 | `get_price`, `get_ohlc`, `get_market_overview`, `get_pair_data` |
| On-chain | 4 | `get_wallet_profile`, `get_tx`, `get_token_holders`, `get_defi_protocol` |
| Sentiment | 3 | `get_sentiment`, `get_social_pulse`, `get_fear_greed` |
| Proprietary indicators | 6 | `get_coverage_index`, `get_narrative_strength`, `get_sentiment_velocity`, `get_editorial_premium`, `get_kol_influence`, `get_risk_score` |
| Agent-backed (async, Pro+) | 6 | `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper`, `translate_contract`, `monitor_keyword`, `get_agent_job` |
| Directories | 13 | `list_stablecoins`, `list_yields`, `list_aggregators`, `list_mcps`, `list_vcs`, `list_jobs`, `build_custom_indicator`, … |
| Fundamentals | 6 | `get_tokenomics`, `get_audit_reports`, `get_team_info`, `compare_protocols`, `check_rugpull_risk` |
| Chain-specific | 4 | `get_solana_ecosystem`, `get_l2_comparison`, `get_bitcoin_l2_status`, `get_ton_ecosystem` |
| Markets microstructure | 5 | `get_funding_rates`, `get_options_flow`, `get_liquidation_heatmap`, `get_exchange_flows`, `predict_listing` |
| Narrative / meta | 5 | `track_narrative`, `get_ai_agent_tokens`, `get_depin_projects`, `get_rwa_tokens`, `get_prediction_markets` |
| Regulatory | 4 | `get_regulatory_status`, `track_sec_filings`, `get_mica_status`, `get_tax_rules` |
| Security | 4 | `check_exploit_history`, `check_phishing_domain`, `get_bug_bounty_programs`, `scan_contract` |
| Memes / degen | 4 | `track_pumpfun`, `track_bonkfun`, `check_memecoin_risk`, `get_degen_leaderboard` |
| Services (revenue) | 3 | `book_kol_campaign`, `request_custom_research`, `submit_listing` |
| History time-series | 4 | `get_history_prices`, `get_history_sentiment`, `get_history_correlation`, `get_history_coverage` |
| Compute / AI crypto | 2 | `get_compute_pricing`, `get_ai_crypto_metrics` |
| Corpus meta | 7 | `list_entities`, `get_topic`, `search_academy`, `get_trending`, `get_unified_feed`, `list_sources`, `get_recent_stories` |
| Memos + theses + social | 6 | `list_memos`, `get_memo`, `list_theses`, `get_thesis`, `get_social_signals`, `get_social_signals_detail` |
| Currencies | 2 | `list_currencies`, `get_currency_feed` |

Every tool response carries `cite_url` (with UTM src attribution), `as_of` (time-travel snapshot), and `source_hash` (content integrity).

Tools for unreleased integrations (Twitter social pulse, DEXTools, bonk.fun, Bittensor) return `{status: "integration_pending", reason, eta}` rather than failing. The MCP server is fully usable today.

## Why

LLMs hallucinate about crypto. BCA ships ground-truth editorial content with full attribution. Plug this MCP server into Claude Desktop, LangChain, Eliza, or any MCP-compatible agent and your model queries the BCA corpus like any other tool — with citations, timestamps, and source hashes on every response.

## Install

### Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

Restart Claude Desktop. All 99 tools appear in the tool picker.

### Programmatic (LangChain, Eliza, custom agents)

```bash
npm install @blockchainacademics/mcp
```

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@blockchainacademics/mcp"],
  env: { BCA_API_KEY: process.env.BCA_API_KEY! },
});
const client = new Client({ name: "my-agent", version: "0.0.1" }, { capabilities: {} });
await client.connect(transport);

const res = await client.callTool({
  name: "search_news",
  arguments: { query: "stablecoin regulation", limit: 5 },
});
console.log(res.content);
```

See [`examples/research-agent.ts`](./examples/research-agent.ts) for a full tool-chaining loop.

## Tools

### `search_news`

Full-text search across 3,501+ editorial crypto articles.

| arg | type | required | description |
|---|---|---|---|
| `query` | string (1-512) | yes | Search query |
| `entity` | string | no | Entity slug filter (e.g. `ethereum`) |
| `since` | ISO 8601 | no | Earliest publish date |
| `topic` | string | no | Topic filter (e.g. `regulation`) |
| `limit` | number (1-50) | no | Default 10 |

Example: `{ "query": "circle IPO", "since": "2026-01-01T00:00:00Z", "limit": 5 }`

### `get_entity`

Fetch a canonical entity dossier. Provide exactly one of:

| arg | type | description |
|---|---|---|
| `slug` | string | e.g. `"vitalik-buterin"`, `"circle"` |
| `ticker` | string | e.g. `"ETH"`, `"SOL"` (case-insensitive) |

Aliases resolve automatically (`CZ` → `changpeng-zhao`, `Maker` → `makerdao`, `BSC` → `bnb-chain`, …).

### `get_explainer`

Fetch a canonical academy lesson. Provide exactly one of:

| arg | type | description |
|---|---|---|
| `slug` | string | Lesson slug, e.g. `"what-is-a-blockchain"` |
| `topic` | string | Topic keyword that resolves to the canonical lesson |

## Attribution

Every response includes a structured `attribution` block:

```json
{
  "data": { ... },
  "attribution": {
    "cite_url": "https://blockchainacademics.com/...",
    "as_of": "2026-04-19T12:34:56Z",
    "source_hash": "sha256:..."
  }
}
```

When your agent surfaces BCA content to a user, attribute via the `cite_url`. Fields are preserved as `null` when upstream omits them so downstream agents can detect missing provenance.

## API Key

Get an API key at https://blockchainacademics.com/api (free tier: 2,000 calls/month). Paid tiers unlock agent-backed research generation and proprietary on-chain indicators.

Set `BCA_API_KEY` in your MCP client env. Optionally override `BCA_API_BASE` (default `https://api.blockchainacademics.com`). `BCA_API_BASE_URL` is also accepted for backward compatibility.

## Errors

The server never crashes the stdio process. All failures surface as MCP responses with `isError: true` and a JSON body:

```json
{ "error": { "code": "BCA_AUTH", "message": "..." } }
```

| Code | Meaning |
|---|---|
| `BCA_AUTH` | Missing/invalid `BCA_API_KEY` (HTTP 401/403) |
| `BCA_RATE_LIMIT` | Rate limit exceeded (HTTP 429 — honor `Retry-After`) |
| `BCA_UPSTREAM` | BCA API returned 5xx or malformed JSON |
| `BCA_NETWORK` | Network failure or 20s timeout exceeded |
| `BCA_BAD_REQUEST` | Invalid tool arguments |

## Development

```bash
npm install
npm run build    # tsc -> dist/
npm test         # node:test smoke suite
npm run dev      # tsx src/index.ts (stdio)
```

### Pre-commit hooks

This repo uses [`pre-commit`](https://pre-commit.com) to enforce formatting, lint, secret scanning, and large-file caps before every commit. Install once per clone:

```bash
pip install pre-commit          # or: brew install pre-commit
pre-commit install              # wires .git/hooks/pre-commit
pre-commit run --all-files      # optional: lint the full tree now
```

Hooks configured in [`.pre-commit-config.yaml`](./.pre-commit-config.yaml): `prettier --check`, `eslint`, `gitleaks`, `detect-private-key`, `check-added-large-files` (500KB cap).

## Security

See [`SECURITY.md`](./SECURITY.md) for vulnerability reporting, supported versions, and our 90-day coordinated disclosure policy.

## License

MIT © 2026 Blockchain Academics
