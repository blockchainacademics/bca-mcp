# Blockchain Academics — ElizaOS Plugin Registry Submission

## Plugin Name
`@blockchainacademics/eliza-plugin`

## Repo
https://github.com/blockchainacademics/bca-eliza-plugin

## Version
0.2.3 (tracks `@blockchainacademics/mcp`)

## Category
Crypto / DeFi / Intelligence

## Description
Drop-in ElizaOS plugin exposing 98 Blockchain Academics tools — prices, on-chain data, news, sentiment, technical indicators, fundamentals, and AI-generated research memos/theses — to any Eliza character.

## Install

```bash
npm install @blockchainacademics/eliza-plugin
# or
pnpm add @blockchainacademics/eliza-plugin
```

## Environment

```
BCA_API_KEY=bca_live_xxxxxxxxxxxxxxxxxxxxx
```

Sign up at https://brain.blockchainacademics.com/pricing.

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
    "Generates due diligence memos on request via BCA agent-jobs."
  ],
  "plugins": ["@blockchainacademics/eliza-plugin"],
  "settings": {
    "secrets": {
      "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxxxxxxx"
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
          "text": "BTC is at $X. Sentiment reads Y, RSI(14) is Z. Whale netflow flipped negative 6h ago. Want the full memo?",
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
| `BCA_GET_PRICE` | `get_price` | Live + historical price |
| `BCA_SEARCH_NEWS` | `search_news` | Entity-tagged news search |
| `BCA_GET_SENTIMENT` | `get_sentiment` | Social + news sentiment |
| `BCA_GENERATE_DD` | `generate_due_diligence` | AI memo (8-15s) |
| `BCA_GET_WALLET` | `get_wallet_balance` | Multi-chain balance |
| `BCA_GET_NARRATIVE` | `get_narrative_score` | Narrative momentum |
| `BCA_GET_ENTITY` | `get_entity` | Canonical entity record |

(Full list: 98 actions across news, market, on-chain, sentiment, indicators, fundamentals, agent-jobs, extended.)

## Providers
- `bcaNewsProvider` — injects top 3 trending BCA articles into each message context
- `bcaMarketProvider` — injects live prices for symbols mentioned by the user

## Evaluators
- `bcaRiskEvaluator` — flags messages that cite tokens with active regulatory events or failed audits

## License
MIT

## Contact
- Docs: https://docs.blockchainacademics.com
- Issues: https://github.com/blockchainacademics/bca-eliza-plugin/issues
