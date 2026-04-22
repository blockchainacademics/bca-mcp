# Blockchain Academics MCP — Anthropic MCP Directory Submission

## One-Line Pitch
Production-grade MCP server delivering 98 crypto intelligence tools — real-time prices, on-chain data, news, sentiment, technical indicators, fundamentals, and AI-generated research — to Claude and any MCP-compatible agent.

## Package Info
- **TypeScript/Node:** `@blockchainacademics/mcp` v0.2.3 (npm)
- **Python:** `bca-mcp` v0.2.3 (PyPI)
- **License:** MIT
- **Maintainer:** Blockchain Academics (blockchainacademics.com)
- **Repos:**
  - https://github.com/blockchainacademics/bca-mcp-ts
  - https://github.com/blockchainacademics/bca-mcp-python

## Install

### TypeScript / Node
```bash
npm install -g @blockchainacademics/mcp
```

### Python
```bash
pip install bca-mcp
# or
uvx bca-mcp
```

## Authentication
Set `BCA_API_KEY` in your environment. Free tier + paid plans at https://brain.blockchainacademics.com/pricing.

## Tool Count by Category (98 total)
| Category | Tools | Examples |
|---|---|---|
| News | 11 | `search_news`, `get_article`, `get_trending_topics` |
| Market | 14 | `get_price`, `get_ohlcv`, `get_market_cap`, `get_gainers_losers` |
| On-Chain | 12 | `get_wallet_balance`, `get_tx`, `get_token_holders` |
| Sentiment | 8 | `get_sentiment`, `get_social_volume`, `get_fear_greed` |
| Indicators | 10 | `get_rsi`, `get_macd`, `get_bollinger_bands` |
| Fundamentals | 9 | `get_tokenomics`, `get_team`, `get_audit_status` |
| Agent Jobs | 6 | `generate_due_diligence`, `generate_thesis`, `generate_memo` |
| Extended | 21 | directories, chains, compute, memes, microstructure, narrative, regulatory, security, history, memos, theses, currencies |
| Entity / Search | 7 | `get_entity`, `resolve_entity`, `list_entities` |

## Claude Desktop `config.json` Snippet

```json
{
  "mcpServers": {
    "blockchain-academics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": {
        "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Python alternative
```json
{
  "mcpServers": {
    "blockchain-academics": {
      "command": "uvx",
      "args": ["bca-mcp"],
      "env": {
        "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Landing & Docs
- API landing: https://api.blockchainacademics.com
- Docs: https://docs.blockchainacademics.com
- Pricing / signup: https://brain.blockchainacademics.com/pricing

## Transport Support
- stdio (default, Claude Desktop / Claude Code)
- HTTP + SSE (remote agents)
- Streamable HTTP (MCP spec 2025-06-18)

## Why List It
First MCP server covering the full crypto intelligence stack in a single install — previously required 6+ separate API integrations (CoinGecko, Etherscan, LunarCrush, Messari, TokenTerminal, news aggregator). One key, one server, 98 tools.
