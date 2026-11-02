## Hacker News: Show HN

---

**Title:**
Show HN: bca-mcp, 105 crypto tools for AI agents with a proprietary corpus

---

**Body:**

Hi HN,

I'm Wael, founder of Blockchain Academics. For the past several months we've been building bca-mcp, a Model Context Protocol server (plus open REST API) exposing 105 tools for AI agents that need to reason about crypto markets.

What makes it different from the existing MCPs in this space is the data layer. Most crypto MCPs I've seen are thin wrappers over CoinGecko, Etherscan, or DEXTools. Ours sits on top of a proprietary editorial corpus: 3,800+ curated and deduplicated articles, 150+ entity dossiers with alias resolution (e.g., "CZ" and "Changpeng Zhao" collapse to the same entity), 38 academy lessons in 8 courses, a cross-domain entity graph, and a history API for backtesting sentiment and narrative features.

Tool breakdown (19 categories, 105 total):
- content and corpus (7), market (4), on-chain (4), sentiment and crypto Twitter (6)
- indicators (6), fundamentals (6), agent jobs (6)
- 66 more across 12 categories: directories, chains, compute, memes, microstructure, narrative, regulatory, security, services, history, corpus meta, memos/theses/social/currencies

Technical notes:
- Every response is wrapped in a canonical JSON:API-inspired envelope: `{data, attribution: {citations: [{cite_url, as_of, source_hash}]}, meta: {status, request_id, pageInfo}}`. `source_hash` is content-addressed so agents can verify a fact hasn't drifted between calls. `citations` is an array: `citations[0]` is primary, additional entries corroborate (multi-source is a first-class citizen). `meta.status` says whether an answer is complete, partial, stale or unseeded.
- MCP server packages are OSS (MIT): `@blockchainacademics/mcp` on npm, `bca-mcp` on PyPI, both at v0.6.3.
- REST API is open at api.blockchainacademics.com with a landing page + OpenAPI.
- Free tier: 2,000 calls/month, no credit card. Five tiers total. Pricing at blockchainacademics.com/crypto-api/pricing.
- Docs: blockchainacademics.com/crypto-api/docs.
- Stack: FastAPI + Postgres + Redis, MCP servers in TypeScript and Python.

What I'd genuinely like feedback on:
1. The envelope shape (`{data, attribution.citations[], meta}`): is `source_hash` useful or overkill? We went array-only on `citations` specifically to avoid the singleton-vs-array drift that burned us in v0.2.x.
2. Tool surface: what's missing that an agent developer would want?
3. The history API (point-in-time queries for sentiment/narrative features): useful for backtesting?

Happy to answer anything in the thread. The fastest way to form an opinion is to install it and point an agent at it.

npm i -g @blockchainacademics/mcp
pip install bca-mcp

Wael
