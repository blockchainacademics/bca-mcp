# @elizaos/plugin-bca — Specification

Spec for the Eliza (elizaOS) plugin that wraps the `@blockchainacademics/mcp` MCP server so Eliza characters can call all 99 BCA tools natively.

> Authoritative upstream: <https://github.com/elizaOS/eliza> and <https://elizaos.github.io>. This spec follows the current elizaOS plugin convention — confirm exact action / provider / evaluator API surface against the latest `@elizaos/core` release before publishing.

---

## 1. Plugin summary

| Field | Value |
|---|---|
| Package name | `@elizaos/plugin-bca` |
| Display name | Blockchain Academics |
| Version | `0.1.0` (tracks `@blockchainacademics/mcp@0.2.2`) |
| Description | Wraps the Blockchain Academics MCP (99 tools: news, entities, academy, market, on-chain, sentiment, proprietary indicators, async agent-backed research) so Eliza characters can query ground-truth crypto data with full attribution. |
| License | MIT |
| Repository | `https://github.com/blockchainacademics/elizaos-plugin-bca` |
| Maintainer | Blockchain Academics `<dev@blockchainacademics.com>` |
| PR target | `elizaOS/registry` (community plugin index) — _not_ `elizaOS/eliza` core |
| Secondary listing | `elizaOS/awesome-eliza` README (plugins section) |

---

## 2. npm package structure

```
@elizaos/plugin-bca/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── src/
│   ├── index.ts             # default export: Plugin
│   ├── mcp-client.ts        # spawns @blockchainacademics/mcp over stdio, caches Client
│   ├── actions/
│   │   ├── searchNews.ts
│   │   ├── getEntity.ts
│   │   ├── getExplainer.ts
│   │   ├── getPrice.ts
│   │   ├── getSentiment.ts
│   │   ├── generateDueDiligence.ts
│   │   └── ...              # one action per high-value BCA tool (15–25 hand-picked)
│   ├── providers/
│   │   └── bcaContext.ts    # injects trending entities + fear/greed into prompt context
│   ├── evaluators/
│   │   └── citationEvaluator.ts  # flags responses that drop BCA attribution
│   └── types.ts
├── dist/                    # tsup output
└── test/
    └── actions.test.ts
```

### `package.json`

```jsonc
{
  "name": "@elizaos/plugin-bca",
  "version": "0.1.0",
  "description": "Blockchain Academics plugin for Eliza — 99 crypto research tools with attribution.",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "keywords": ["eliza", "elizaos", "plugin", "crypto", "blockchain", "mcp", "bca", "ai-agents"],
  "peerDependencies": {
    "@elizaos/core": ">=0.1.9"
  },
  "dependencies": {
    "@blockchainacademics/mcp": "^0.2.2",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@elizaos/core": "^0.1.9",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": { "node": ">=18.17" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/blockchainacademics/elizaos-plugin-bca.git"
  },
  "author": "Blockchain Academics <dev@blockchainacademics.com>",
  "license": "MIT",
  "publishConfig": { "access": "public" }
}
```

---

## 3. Plugin manifest (`src/index.ts`)

```ts
import type { Plugin } from "@elizaos/core";

import { searchNewsAction } from "./actions/searchNews.js";
import { getEntityAction } from "./actions/getEntity.js";
import { getExplainerAction } from "./actions/getExplainer.js";
import { getPriceAction } from "./actions/getPrice.js";
import { getSentimentAction } from "./actions/getSentiment.js";
import { getFearGreedAction } from "./actions/getFearGreed.js";
import { getCoverageIndexAction } from "./actions/getCoverageIndex.js";
import { getNarrativeStrengthAction } from "./actions/getNarrativeStrength.js";
import { generateDueDiligenceAction } from "./actions/generateDueDiligence.js";
import { summarizeWhitepaperAction } from "./actions/summarizeWhitepaper.js";
import { checkRugpullRiskAction } from "./actions/checkRugpullRisk.js";
import { trackSecFilingsAction } from "./actions/trackSecFilings.js";
import { scanContractAction } from "./actions/scanContract.js";
import { bcaContextProvider } from "./providers/bcaContext.js";
import { citationEvaluator } from "./evaluators/citationEvaluator.js";

export const bcaPlugin: Plugin = {
  name: "bca",
  description:
    "Blockchain Academics — 99 crypto research tools (news, entities, academy, market, on-chain, sentiment, proprietary indicators, agent-backed research) with cite_url + as_of + source_hash attribution on every response.",
  actions: [
    searchNewsAction,
    getEntityAction,
    getExplainerAction,
    getPriceAction,
    getSentimentAction,
    getFearGreedAction,
    getCoverageIndexAction,
    getNarrativeStrengthAction,
    generateDueDiligenceAction,
    summarizeWhitepaperAction,
    checkRugpullRiskAction,
    trackSecFilingsAction,
    scanContractAction,
  ],
  providers: [bcaContextProvider],
  evaluators: [citationEvaluator],
  services: [],
  clients: [],
};

export default bcaPlugin;
```

### Action shape (example: `searchNewsAction`)

```ts
import type { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { callBcaTool } from "../mcp-client.js";

export const searchNewsAction: Action = {
  name: "BCA_SEARCH_NEWS",
  similes: ["CRYPTO_NEWS", "SEARCH_CRYPTO_NEWS", "BCA_NEWS"],
  description:
    "Full-text search across 3,501+ editorial crypto articles from Blockchain Academics. Use when the user asks about recent crypto news, coverage of a project, regulatory developments, or market events.",
  validate: async (_runtime, _message) => {
    return Boolean(process.env.BCA_API_KEY);
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, _options, callback) => {
    const query = (message.content.text ?? "").trim();
    const result = await callBcaTool("search_news", { query, limit: 5 });
    const text = formatWithCitation(result);
    callback?.({ text, source: "bca", metadata: result.attribution });
    return true;
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "What's the latest on stablecoin regulation?" } },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the 5 most recent articles on stablecoin regulation from Blockchain Academics…",
          action: "BCA_SEARCH_NEWS",
        },
      },
    ],
  ],
};
```

### MCP client bootstrap (`src/mcp-client.ts`)

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let clientPromise: Promise<Client> | null = null;

export async function getBcaClient(): Promise<Client> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@blockchainacademics/mcp"],
      env: {
        ...process.env,
        BCA_API_KEY: process.env.BCA_API_KEY!,
      },
    });
    const client = new Client({ name: "elizaos-plugin-bca", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);
    return client;
  })();
  return clientPromise;
}

export async function callBcaTool(name: string, args: unknown) {
  const client = await getBcaClient();
  const res = await client.callTool({ name, arguments: args as Record<string, unknown> });
  const text = (res.content?.[0] as { text?: string } | undefined)?.text ?? "{}";
  return JSON.parse(text) as {
    data: unknown;
    attribution: { cite_url: string | null; as_of: string | null; source_hash: string | null };
    meta: unknown;
  };
}
```

---

## 4. `character.json` example — crypto-researcher using BCA

```json
{
  "name": "Axiom",
  "username": "axiom_research",
  "bio": [
    "On-chain research analyst trained on 3,500+ BCA editorial articles.",
    "Never speculates without a cite_url. Treats missing attribution as a hard failure."
  ],
  "lore": [
    "Built by Blockchain Academics to replace hallucinating crypto Twitter threads with cited ground truth.",
    "Always surfaces the `cite_url` and `as_of` timestamp from BCA tool responses."
  ],
  "knowledge": [
    "Editorial attribution is mandatory — if the BCA tool response lacks cite_url, say so explicitly.",
    "Proprietary indicators (coverage_index, narrative_strength, sentiment_velocity) are Pro-tier."
  ],
  "plugins": ["@elizaos/plugin-bca"],
  "settings": {
    "secrets": {
      "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxx"
    },
    "voice": { "model": "en_US-male-medium" }
  },
  "style": {
    "all": [
      "Cite the BCA URL for every factual claim.",
      "State the `as_of` timestamp when data freshness matters.",
      "Never invent on-chain numbers — call a BCA tool."
    ],
    "chat": ["Be concise. Lead with the cite_url."],
    "post": ["Always include the canonical BCA link."]
  },
  "topics": [
    "stablecoins",
    "L2 scaling",
    "DeFi protocol fundamentals",
    "regulatory developments",
    "KOL influence and narrative velocity"
  ],
  "adjectives": ["rigorous", "cite-obsessed", "skeptical", "on-chain-native"],
  "messageExamples": [
    [
      { "user": "{{user1}}", "content": { "text": "Is Circle still on track for IPO?" } },
      {
        "user": "Axiom",
        "content": {
          "text": "Per BCA coverage as of 2026-04-19 — Circle re-filed its S-1 on 2026-04-10 after the April stablecoin hearings. Source: https://blockchainacademics.com/news/circle-s1-refile?utm_source=eliza",
          "action": "BCA_SEARCH_NEWS"
        }
      }
    ],
    [
      { "user": "{{user1}}", "content": { "text": "What's Solana's narrative strength this week?" } },
      {
        "user": "Axiom",
        "content": {
          "text": "Solana narrative_strength = 0.82 (BCA proprietary index, window 7d, as_of 2026-04-21T00:00Z). Up from 0.71 last week on DePIN coverage spike.",
          "action": "BCA_GET_NARRATIVE_STRENGTH"
        }
      }
    ]
  ],
  "postExamples": [
    "BCA coverage index on $TIA hit a 30-day high today — 14 articles across 9 editorial sources. Full breakdown: https://blockchainacademics.com/indicators/coverage?entity=celestia"
  ]
}
```

---

## 5. Installation & usage

```bash
# 1. Install the plugin
pnpm add @elizaos/plugin-bca

# 2. Get a BCA API key (free tier: 2,000 calls/month)
# https://blockchainacademics.com/api

# 3. Set the env var
echo "BCA_API_KEY=bca_live_xxxxxxxxxxxxxxxx" >> .env

# 4. Reference in your character.json
# "plugins": ["@elizaos/plugin-bca"]

# 5. Run Eliza
pnpm start --character=characters/axiom.character.json
```

---

## 6. Submission targets

1. **npm publish** — `npm publish --access public` from `@elizaos/plugin-bca` once the elizaOS org grants scope access (fallback scope: `@blockchainacademics/elizaos-plugin-bca`).
2. **Registry PR** — fork `elizaOS/registry`, add the plugin entry to the community index (name, npm package, repo URL, description, tags), open PR.
3. **Awesome list** — PR against `elizaOS/awesome-eliza` README under the Plugins / Data Providers section.
4. **Docs** — optional blog post on `elizaos.github.io` walking through the crypto-researcher character pattern.

---

## 7. Status & caveats

- Plugin scaffold and 13 high-value actions ready to generate; remaining 86 BCA tools exposed via a generic `BCA_CALL_TOOL` pass-through action for power users.
- SSE transport (`https://api.blockchainacademics.com/mcp`) lands Phase 3, Q2 2026 — until then the plugin spawns the stdio MCP via `npx`.
- Confirm the exact `Action` / `Provider` / `Evaluator` TypeScript signatures against the latest `@elizaos/core` release before first publish; this spec targets the `0.1.9`-era API.
