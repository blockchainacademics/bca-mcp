# Blockchain Academics: ElizaOS Plugin Registry Submission

## Plugin Name
`@blockchainacademics/eliza-plugin`

## Repo
https://github.com/blockchainacademics/bca-eliza-plugin

## Version
0.6.3 (tracks `@blockchainacademics/mcp`)

## Category
Crypto / DeFi / Intelligence

## Description
Drop-in ElizaOS plugin exposing 105 Blockchain Academics tools (prices, on-chain data, news, sentiment and crypto Twitter, proprietary indicators, fundamentals, and agent-backed due diligence reports) to any Eliza character. Every answer carries citations and an honest status (complete, partial, stale or unseeded).

## Install

```bash
npm install @blockchainacademics/eliza-plugin
# or
pnpm add @blockchainacademics/eliza-plugin
```

## Environment

```
BCA_API_KEY=bca_xxxxxxxxxxxxxxxxxxxxx
```

Optional: without a key the MCP server runs on its public demo key (17 tools, shared daily cap). Free key (2,000 calls a month) at https://blockchainacademics.com/crypto-api/signup; paid plans at https://blockchainacademics.com/crypto-api/pricing.

## Register in `agent/src/index.ts`

```ts
import { bcaPlugin } from "@blockchainacademics/eliza-plugin";

export const agent = new AgentRuntime({
  plugins: [bcaPlugin],
  // ...
});
```

## Example `character.json`

```json
{
  "name": "Satoshi",
  "bio": [
    "Crypto research analyst with on-chain and news intelligence at hand.",
    "Writes investment memos, tracks narratives, flags regulatory risk."
  ],
  "lore": [
    "Reads BCA news, sentiment, and on-chain feeds in real time.",
    "Starts due diligence reports on request via BCA agent jobs."
  ],
  "plugins": ["@blockchainacademics/eliza-plugin"],
  "settings": {
    "secrets": {
      "BCA_API_KEY": "bca_xxxxxxxxxxxxxxxxxxxxx"
    }
  },
  "clients": ["telegram", "twitter", "discord"],
  "modelProvider": "anthropic",
  "style": {
    "all": [
      "Cite sources via BCA entity slugs when relevant",
      "Prefer data over opinion",
      "Flag risks before upside"
    ]
  },
  "topics": [
    "bitcoin", "ethereum", "defi", "stablecoins", "rwa", "ai agents", "depin"
  ],
  "messageExamples": [
    [
      { "user": "{{user1}}", "content": { "text": "What's BTC doing?" } },
      {
        "user": "Satoshi",
        "content": {
          "text": "BTC is at $X. News sentiment reads Y and the fear and greed index is Z. Want a full due diligence report?",
          "action": "BCA_GET_PRICE"
        }
      }
    ]
  ]
}
```

## Exposed Actions (selected)

| Action | Maps To | Use |
|---|---|---|
| `BCA_GET_PRICE` | `get_price` | Spot price, 24h change, market cap |
| `BCA_SEARCH_NEWS` | `search_news` | Entity- and ticker-tagged news search |
| `BCA_GET_SENTIMENT` | `get_sentiment` | News sentiment bucket for an entity |
| `BCA_GENERATE_DD` | `generate_due_diligence` | Async due diligence report (poll `get_agent_job`) |
| `BCA_GET_WALLET` | `get_wallet_profile` | Native balance and token holdings |
| `BCA_GET_NARRATIVE` | `track_narrative` | Narrative strength over 7d, 30d or 90d |
| `BCA_GET_ENTITY` | `get_entity` | Canonical entity record |

(Full list: 105 actions, one per tool, across the 19 tool categories.)

## Providers
- `bcaNewsProvider`: injects the top 3 recent BCA stories into each message context
- `bcaMarketProvider`: injects live prices for symbols mentioned by the user

## Evaluators
- `bcaRiskEvaluator`: flags messages that cite tokens with a high BCA risk score or a failed rugpull check

## License
MIT

## Contact
- Docs: https://blockchainacademics.com/crypto-api/docs
- Issues: https://github.com/blockchainacademics/bca-eliza-plugin/issues
