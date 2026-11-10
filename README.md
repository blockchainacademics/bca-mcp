# @blockchainacademics/mcp

Crypto MCP server for AI agents: cited news, prices, onchain data, sentiment and indicators. **105 tools** spanning 3,800+ editorial articles, about 150 entity dossiers, 38 academy lessons in 8 courses, aggregated market and onchain data, proprietary indicators and async agent-backed generation, all exposed as MCP tools your agent can call.

## Tool categories

| Category | Count | Examples |
|---|---|---|
| Content & corpus | 7 | `search_news`, `get_article`, `get_entity`, `get_explainer`, `list_entity_mentions`, `get_as_of_snapshot` |
| Market data | 4 | `get_price`, `get_ohlc`, `get_market_overview`, `get_pair_data` |
| On-chain | 4 | `get_wallet_profile`, `get_tx`, `get_token_holders`, `get_defi_protocol` |
| Sentiment + crypto Twitter | 6 | `get_sentiment`, `get_social_pulse`, `get_fear_greed`, `get_ct_pulse`, `get_x_signals`, `get_kol_consensus` |
| Proprietary indicators | 6 | `get_coverage_index`, `get_narrative_strength`, `get_sentiment_velocity`, `get_editorial_premium`, `get_kol_influence`, `get_risk_score` |
| Agent-backed (async, Pro+) | 6 | `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper`, `translate_contract`, `monitor_keyword`, `get_agent_job` |
| Directories | 16 | `list_stablecoins`, `list_yields`, `list_aggregators`, `list_mcps`, `list_vcs`, `list_jobs`, `get_job`, `search_grants`, `get_grant`, `build_custom_indicator`, … |
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
| Memos / theses / social / currencies | 8 | `list_memos`, `get_memo`, `list_theses`, `get_thesis`, `get_social_signals`, `get_social_signals_detail`, `list_currencies`, `get_currency_feed` |

Every tool response carries `attribution.citations[]` (each entry a `cite_url`, an `as_of` time and a `source_hash`) and a `meta.status` that says how complete the answer is (see [Response status](#response-status)).

Tools whose data source is not connected yet (bonk.fun, CoinGlass liquidations and exchange flows, the degen leaderboard, the memecoin analyzer, among others) answer with `meta.status: "unseeded"` and a reason instead of failing, and their descriptions say so.

## Why

Every answer says where it came from and how complete it is. `attribution.citations[]` lists the sources, primary source first, with timestamps and source hashes, and `meta.status` says whether the answer is complete, partial, stale or unseeded. An agent can cite each fact and tell a full answer from a thin one. The server works in Claude Desktop, LangChain, Eliza and any other MCP client.

## Not financial advice

The tools return data, analysis and their sources. Nothing they return is financial, investment or tax advice, or a recommendation to buy or sell anything.

## Install

### Claude Desktop (zero-config demo)

The package ships with a public demo key baked in. No signup needed to try it. Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"]
    }
  }
}
```

Restart Claude Desktop. 17 tools work without a key, with real data and real citations:

`get_price`, `get_trending`, `get_fear_greed`, `get_market_overview`, `search_news`, `get_article`, `get_sentiment`, `get_entity`, `get_explainer`, `get_recent_stories`, `get_topic`, `search_grants`, `get_grant`, `list_jobs`, `get_job`, `search_academy`, `get_as_of_snapshot`

`get_entity` works by slug without a key; its ticker form needs one. Every other tool answers with a clean upgrade message (`BCA_TIER_LOCKED`) that links to the free signup. Demo calls share a daily cap: 100 calls a day across all demo users, and 20 a day per IP.

### Claude Desktop (with an API key)

Get a free key at [blockchainacademics.com/crypto-api/signup](https://blockchainacademics.com/crypto-api/signup?ref=mcp-npm-readme) (2,000 calls/month per user) and add the env block:

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

Restart Claude Desktop. All 105 tools appear in the tool picker: a free key opens 52 of them, and paid plans open the rest (see [API Key](#api-key)).

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

### Eliza

[`@elizaos/plugin-mcp`](https://www.npmjs.com/package/@elizaos/plugin-mcp) loads the server into an Eliza agent. Add it to the character file:

```json
{
  "name": "Your Character",
  "plugins": ["@elizaos/plugin-mcp"],
  "settings": {
    "mcp": {
      "servers": {
        "blockchain-academics": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "@blockchainacademics/mcp"],
          "env": { "BCA_API_KEY": "" }
        }
      }
    }
  }
}
```

Leave `BCA_API_KEY` empty to use the 17 tools that need no key, or paste your own key.

## Tools

### `search_news`

Full-text search across 3,800+ editorial crypto articles.

| arg | type | required | description |
|---|---|---|---|
| `query` | string (1-512) | yes | Search query |
| `entity` | string | no | Entity slug filter (e.g. `ethereum`) |
| `ticker` | string | no | Ticker filter (e.g. `ETH`) |
| `since` | ISO 8601 | no | Earliest publish date |
| `topic` | string | no | Topic filter (e.g. `regulation`) |
| `limit` | number (1-50) | no | Default 10 |
| `offset` | number | no | Results to skip, for paging (default 0) |

Example: `{ "query": "circle IPO", "since": "2026-01-01T00:00:00Z", "limit": 5 }`

### `get_entity`

Fetch an entity dossier. Provide exactly one of:

| arg | type | description |
|---|---|---|
| `slug` | string | e.g. `"vitalik-buterin"`, `"circle"`; works without a key |
| `ticker` | string | e.g. `"ETH"`, `"SOL"` (case-insensitive); returns every matching entity and needs an API key |

Aliases in slug form resolve to the canonical entity (`cz` → `changpeng-zhao`, `maker` → `makerdao`, `bsc` → `bnb-chain`, …).

### `get_explainer`

Fetch BCA Academy material (38 lessons in 8 courses). Provide exactly one of:

| arg | type | description |
|---|---|---|
| `slug` | string | Course slug (e.g. `"defi-fundamentals"`, `"understanding-bitcoin"`) for the course and its lesson index, or lesson slug (e.g. `"decentralized-exchanges"`) for the lesson with its full text |
| `topic` | string | Topic keyword that resolves to matching academy material, e.g. `"defi"` |

## Response status

`meta.status` says how complete an answer is. Branch on it before you trust `data`:

| `meta.status` | Meaning | Where the detail is |
|---|---|---|
| `complete` | A full, fresh answer. | no `meta.diagnostic` |
| `partial` | Data is returned, but some inputs or sections are missing or defaulted, or one upstream source failed. | `meta.diagnostic.reason`, plus `meta.diagnostic.missing` (what is absent) or, for a failed source, `vendor` and `upstream_status` |
| `stale` | Data is returned, but it is older than the tool promises. | `meta.diagnostic.reason`, `meta.diagnostic.as_of` (when the data was produced) and `meta.diagnostic.age_seconds` |
| `unseeded` | There is no real data yet: nothing matched, the table is empty, or the source is not connected. `data` may still carry the echoed query or placeholders. | `meta.diagnostic.reason` and `meta.diagnostic.eta` |

Lists that page by offset (`search_news`, `search_grants`, `list_entities`, `list_entity_mentions`, `search_academy`) set `meta.pageInfo.hasNextPage` when more results exist.

## Attribution

Every response includes a structured `attribution` block with a `citations` array:

```json
{
  "data": { ... },
  "attribution": {
    "citations": [
      {
        "cite_url": "https://www.coingecko.com/en/coins/bitcoin",
        "as_of": "2026-11-01T12:34:56Z",
        "source_hash": "sha256:..."
      },
      {
        "cite_url": "https://blockchainacademics.com/...?src=...",
        "as_of": "2026-11-01T12:34:56Z",
        "source_hash": "sha256:..."
      }
    ]
  },
  "meta": { "status": "complete", "request_id": "...", "pageInfo": { ... } }
}
```

`citations[0]` is the primary source: the upstream page when the data has one (the original article, CoinGecko, Etherscan, DefiLlama, a regulator), otherwise the BCA page for the record, otherwise the tool's entry in the API reference. A BCA link follows the upstream one only where the site has a page for the data. When your agent surfaces BCA content to a user, attribute via `citations[0].cite_url`. Fields are preserved as `null` when upstream omits them so downstream agents can detect missing provenance.

## API Key

**Not required to try it.** When `BCA_API_KEY` is unset, the server falls back to a baked-in public demo key: the 17 tools listed under [Install](#install) work, and every other tool answers with a clean upgrade message.

For more, get a free key at [blockchainacademics.com/crypto-api/signup](https://blockchainacademics.com/crypto-api/signup?ref=mcp-npm-apikey) (2,000 calls/month): it opens the 52 free-tier tools. Paid tiers unlock the rest, such as agent-backed research generation, crypto Twitter intelligence and the proprietary indicators; each tool's description names its tier when it is not free.

Set `BCA_API_KEY` in your MCP client env. Optionally override `BCA_API_BASE` (default `https://api.blockchainacademics.com`). `BCA_API_BASE_URL` is also accepted for backward compatibility.

## Privacy

- Each tool call sends its arguments (for example a search phrase, a coin name, or a wallet or contract address you ask about) and your key, if you set one, over HTTPS to api.blockchainacademics.com, our own API, or to the staging or local base you set in `BCA_API_BASE`. The server sends nothing to any other host; `monitor_keyword` only looks up the webhook's host name in DNS to refuse private addresses.
- The server stores nothing on your computer. The API counts calls per key per day and does not log request bodies or query parameters that could contain personal data.
- Full policy, retention and your rights: [blockchainacademics.com/privacy](https://blockchainacademics.com/privacy), section 12 (Crypto API and MCP Server). Privacy requests: [privacy@blockchainacademics.com](mailto:privacy@blockchainacademics.com).

## Errors

Every failed tool call returns an MCP tool result with `isError: true` and a JSON body:

```json
{ "error": { "code": "BCA_AUTH", "message": "..." } }
```

A request that is not a valid MCP call at all (arguments that are not an object, for example) is answered by the MCP SDK with a JSON-RPC error instead.

| Code | Meaning |
|---|---|
| `BCA_AUTH` | Invalid `BCA_API_KEY` (HTTP 401/403), or a key that cannot be sent as a header value (a line break inside it); the key itself is never repeated in the message |
| `BCA_TIER_LOCKED` | Tool not in your current tier's allowlist (HTTP 403 without a key, HTTP 402 with a key on a lower plan). Without a key this applies to 88 of the 105 tools; the message includes the signup URL, or the pricing URL for a key on a lower plan. |
| `BCA_RATE_LIMIT` | Rate limit exceeded (HTTP 429; honor `Retry-After`). A read the per-second limit turned away is sent again first, up to twice. The message carries the API's own reason, which names the limit that was hit (up to 500 characters, inside an `<untrusted_content>` fence). |
| `BCA_UPSTREAM` | BCA API returned an error status or malformed JSON. For a 4xx the message carries the API's own detail (up to 500 characters) inside an `<untrusted_content>` fence; a 5xx stays generic. |
| `BCA_NETWORK` | Network failure or 20s timeout exceeded |
| `BCA_BAD_REQUEST` | Invalid tool arguments, caught before any request is sent. The message lists each problem as `field: problem`, e.g. `Invalid arguments for search_news: limit: Number must be less than or equal to 50`. |

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

## Getting help

- **Questions:** ask in [GitHub Discussions Q&A](https://github.com/blockchainacademics/bca-mcp/discussions/categories/q-a). Search first, since someone may have asked already.
- **Bugs:** open an [issue](https://github.com/blockchainacademics/bca-mcp/issues).
- **Account and billing:** email [support@blockchainacademics.com](mailto:support@blockchainacademics.com).
- **Security reports:** follow [`SECURITY.md`](./SECURITY.md), never a public issue.

**Never post a full API key.** If we need to know which key, share only the key prefix, the part before the dots on your dashboard (for example `bca_1a2b3c4d`). Our team will never ask for your key or a seed phrase. Response times by plan are in [How to get help](https://github.com/blockchainacademics/bca-mcp/discussions/15).

## Security

See [`SECURITY.md`](./SECURITY.md) for vulnerability reporting, supported versions, and our 90-day coordinated disclosure policy.

## License

MIT © 2026 Blockchain Academics
