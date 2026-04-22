# Blockchain Academics MCP — Virtuals Protocol Agent Registry Submission

## Agent / Plugin Name
Blockchain Academics Intelligence Plugin

## Package
- npm: `@blockchainacademics/mcp` v0.2.3
- PyPI: `bca-mcp` v0.2.3
- Repo: https://github.com/blockchainacademics/bca-mcp-ts

## Category
DeFi Intelligence / Research / News / On-Chain Analytics

## Summary
98-tool MCP server that gives Virtuals agents the full crypto data stack — prices, on-chain flows, news, sentiment, technical signals, fundamentals, and on-demand AI-written research. Drop-in for any G.A.M.E.-compatible agent.

## Agent Use Cases

### 1. Autonomous DeFi Trading Agents
- Pull live OHLCV + RSI/MACD/Bollinger via `get_ohlcv`, `get_rsi`, `get_macd`
- Confirm with sentiment (`get_sentiment`, `get_fear_greed`) and on-chain flow (`get_whale_transfers`, `get_exchange_netflow`)
- Gate entries on narrative strength (`get_narrative_score`) and regulatory risk (`get_regulatory_events`)

### 2. Crypto News Agents
- `search_news` across 200+ vetted sources with entity-tagged results
- `get_trending_topics` for hourly pulse
- `get_article` with full body + BCA-enriched entities + sentiment
- Feed into Twitter/Farcaster/Telegram autoposters

### 3. Due-Diligence / Research Agents
- `generate_due_diligence(ticker)` — returns structured memo (tokenomics, team, audits, unlocks, risks)
- `generate_thesis(ticker, timeframe)` — bull/bear/base case writeup
- `get_tokenomics`, `get_team`, `get_audit_status` for granular checks
- `get_memo`, `list_theses` — fetch existing BCA research library

### 4. Portfolio / Wallet Monitoring Agents
- `get_wallet_balance`, `get_tx_history`, `get_pnl`
- Cross-chain: Ethereum, Solana, Bitcoin, BNB Chain, Base, Arbitrum
- Trigger alerts on large inflows/outflows

### 5. Meme / Narrative Rotation Agents
- `get_meme_leaderboard`, `get_narrative_tokens(narrative)`
- Early-signal rotation tracking (AI agents, RWA, DePIN, DeSci, etc.)

## Top Tool Highlights

| Tool | Purpose | Typical Latency |
|---|---|---|
| `get_price(symbol)` | Live + historical price, 200+ assets | <100ms |
| `search_news(query, limit)` | Entity-tagged, sentiment-scored news search | <300ms |
| `get_sentiment(symbol)` | Aggregated social + news sentiment | <200ms |
| `generate_due_diligence(symbol)` | AI-written structured DD memo | 8-15s |
| `get_entity(slug)` | Canonical entity (project/person/org) record | <100ms |
| `get_wallet_balance(address, chain)` | Multi-chain balance + token positions | <500ms |
| `get_narrative_score(narrative)` | Narrative momentum index | <200ms |

## Installation for Virtuals G.A.M.E. Framework

```bash
npm install @blockchainacademics/mcp
```

```ts
import { BCAClient } from '@blockchainacademics/mcp';

const bca = new BCAClient({ apiKey: process.env.BCA_API_KEY });

// Register as agent tools
agent.addTools(bca.tools); // all 98, or filter by category
```

## Auth
Single env var: `BCA_API_KEY`. Free tier available, paid plans at https://brain.blockchainacademics.com/pricing.

## Rate Limits
- Free: 60 req/min
- Pro: 600 req/min
- Agent: 6,000 req/min (webhook + batch support)

## Support
- Docs: https://docs.blockchainacademics.com
- Landing: https://api.blockchainacademics.com
- Email: agents@blockchainacademics.com
