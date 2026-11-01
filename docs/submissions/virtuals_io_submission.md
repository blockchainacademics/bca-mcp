# Blockchain Academics MCP: Virtuals Protocol Agent Registry Submission

## Agent / Plugin Name
Blockchain Academics Intelligence Plugin

## Package
- npm: `@blockchainacademics/mcp` v0.6.3
- PyPI: `bca-mcp` v0.6.3
- Repo: https://github.com/blockchainacademics/bca-mcp

## Category
DeFi Intelligence / Research / News / On-Chain Analytics

## Summary
105-tool MCP server that gives Virtuals agents the crypto data stack: prices, on-chain data, news, sentiment and crypto Twitter, proprietary indicators, fundamentals, and async research jobs. Every answer carries `attribution.citations[]` and an honest `meta.status` (complete, partial, stale or unseeded). Drop-in for any MCP-compatible agent framework.

## Agent Use Cases

### 1. Autonomous DeFi Trading Agents
- Pull OHLC candles and derivatives data via `get_ohlc`, `get_funding_rates`, `get_options_flow`
- Confirm with sentiment (`get_sentiment`, `get_fear_greed`) and DeFi data (`get_defi_protocol`, `list_yields`)
- Gate entries on narrative strength (`track_narrative`, `get_narrative_strength`) and regulatory status (`get_regulatory_status`)

### 2. Crypto News Agents
- `search_news` across 3,800+ editorial articles with entity and ticker tags
- `get_trending` and `get_recent_stories` for the latest clustered stories
- `get_article` with the full body, entities and sentiment
- Feed into Twitter/Farcaster/Telegram autoposters

### 3. Due-Diligence / Research Agents
- `generate_due_diligence(entity_slug)`: starts an async report (tokenomics, team, audits, risk, narrative); poll `get_agent_job`
- `summarize_whitepaper(url)`: async structured summary of a whitepaper
- `get_tokenomics`, `get_team_info`, `get_audit_reports`, `check_rugpull_risk` for granular checks

### 4. Portfolio / Wallet Agents
- `get_wallet_profile`, `get_tx`
- Chains: Ethereum, Solana, Arbitrum, Base, Optimism, Polygon, BNB Chain

### 5. Meme / Narrative Rotation Agents
- `track_pumpfun` (trending or new launches), `get_ai_agent_tokens`, `get_depin_projects`, `get_rwa_tokens`
- Narrative tracking with `track_narrative` (ai-agents, rwa, depin, modular, memes, bitcoin-l2, socialfi, gamefi)

## Top Tool Highlights

| Tool | Purpose | Tier |
|---|---|---|
| `get_price(ids)` | Spot price, 24h change, market cap, up to 50 CoinGecko ids | Free (also without a key) |
| `search_news(query, limit)` | Entity- and ticker-tagged news search | Free (also without a key) |
| `get_sentiment(entity_slug)` | News sentiment bucket with drivers | Free (also without a key) |
| `generate_due_diligence(entity_slug)` | Async due diligence report | Pro |
| `get_entity(slug)` | Entity dossier (chain, project, person, ticker) | Free (also without a key) |
| `get_wallet_profile(address, chain)` | Native balance and token holdings | Starter |
| `track_narrative(narrative)` | Narrative strength over 7d, 30d or 90d | Starter |

## Installation for Virtuals Agents

Run the MCP server over stdio and register its tools with your agent:

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
const bca = new Client({ name: "virtuals-agent", version: "0.0.1" }, { capabilities: {} });
await bca.connect(transport);

// All 105 tools, with their JSON Schemas; register them with your agent
// framework and route each call to bca.callTool({ name, arguments }).
const { tools } = await bca.listTools();
```

## Auth
Single env var: `BCA_API_KEY`, optional. Without it, 16 tools work on the public demo key under a shared daily cap. Free key (2,000 calls a month) at https://blockchainacademics.com/crypto-api/signup; paid plans at https://blockchainacademics.com/crypto-api/pricing.

## Rate Limits
Per key, enforced by the API (requests per second and calls per UTC day):
- Free: 2 a second, 87 a day (2,000 a month)
- Starter: 5 a second (25,000 a month)
- Pro: 20 a second (250,000 a month)
- Team: 100 a second (1,500,000 a month)

## Support
- Docs: https://blockchainacademics.com/crypto-api/docs
- Landing: https://blockchainacademics.com/crypto-api
- Email: agents@blockchainacademics.com
