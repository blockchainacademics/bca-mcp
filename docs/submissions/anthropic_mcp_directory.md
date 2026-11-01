# Blockchain Academics MCP: Anthropic MCP Directory Submission

## One-Line Pitch
Production-grade MCP server delivering 105 crypto intelligence tools (live prices, on-chain data, news, sentiment and crypto Twitter, proprietary indicators, fundamentals, and agent-generated research) to Claude and any MCP-compatible agent, with a citation and an honest status on every answer.

## Package Info
- **TypeScript/Node:** `@blockchainacademics/mcp` v0.6.3 (npm)
- **Python:** `bca-mcp` v0.6.3 (PyPI)
- **License:** MIT
- **Maintainer:** Blockchain Academics (blockchainacademics.com)
- **Repos:**
  - https://github.com/blockchainacademics/bca-mcp
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
Optional. Without `BCA_API_KEY`, 16 tools work on a public demo key under a shared daily cap. Set `BCA_API_KEY` for all 105: a free key gives 2,000 calls a month; paid plans at https://blockchainacademics.com/crypto-api/pricing.

## Tool Count by Category (105 total, 19 categories)
| Category | Tools | Examples |
|---|---|---|
| Content & corpus | 7 | `search_news`, `get_article`, `get_entity`, `get_explainer` |
| Market data | 4 | `get_price`, `get_ohlc`, `get_market_overview`, `get_pair_data` |
| On-chain | 4 | `get_wallet_profile`, `get_tx`, `get_token_holders`, `get_defi_protocol` |
| Sentiment + crypto Twitter | 6 | `get_sentiment`, `get_fear_greed`, `get_ct_pulse`, `get_x_signals` |
| Proprietary indicators | 6 | `get_coverage_index`, `get_narrative_strength`, `get_risk_score` |
| Agent-backed generation | 6 | `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper` |
| Directories | 16 | `list_stablecoins`, `list_yields`, `list_jobs`, `search_grants` |
| Fundamentals | 6 | `get_tokenomics`, `get_team_info`, `get_audit_reports`, `compare_protocols` |
| Chain-specific | 4 | `get_solana_ecosystem`, `get_l2_comparison`, `get_bitcoin_l2_status`, `get_ton_ecosystem` |
| Microstructure | 5 | `get_funding_rates`, `get_options_flow`, `predict_listing` |
| Narrative / meta | 5 | `track_narrative`, `get_ai_agent_tokens`, `get_prediction_markets` |
| Regulatory | 4 | `get_regulatory_status`, `track_sec_filings`, `get_mica_status`, `get_tax_rules` |
| Security | 4 | `check_exploit_history`, `check_phishing_domain`, `scan_contract` |
| Memes / degen | 4 | `track_pumpfun`, `track_bonkfun`, `check_memecoin_risk` |
| Compute / AI crypto | 2 | `get_compute_pricing`, `get_ai_crypto_metrics` |
| Services | 3 | `book_kol_campaign`, `request_custom_research`, `submit_listing` |
| History time-series | 4 | `get_history_prices`, `get_history_sentiment`, `get_history_correlation` |
| Corpus meta | 7 | `list_entities`, `search_academy`, `get_trending`, `get_recent_stories` |
| Memos / theses / social / currencies | 8 | `list_memos`, `list_theses`, `get_social_signals`, `list_currencies` |

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
- API landing: https://blockchainacademics.com/crypto-api
- Docs: https://blockchainacademics.com/crypto-api/docs
- Pricing / signup: https://blockchainacademics.com/crypto-api/pricing

## Transport Support
- stdio (Claude Desktop, Claude Code, Cursor and any MCP host that launches a local server). There is no hosted HTTP endpoint yet.

## Why List It
First MCP server covering the full crypto intelligence stack in a single install: news, entities and academy content, market and on-chain data, sentiment, indicators, fundamentals and research jobs, which previously took several separate API integrations. One key, one server, 105 tools, and every answer says how complete it is (`meta.status`) and where it came from (`attribution.citations[]`).
