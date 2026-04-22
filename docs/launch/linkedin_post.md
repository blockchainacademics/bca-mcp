## LinkedIn Post — Wael Rajab

---

Seven years in crypto data. One thing kept bothering me.

Every AI agent I saw trying to reason about crypto markets was built on the same thin stack: CoinGecko prices, maybe Etherscan, a scraped Twitter feed if they were ambitious. Then the prompt would ask the model to "analyze" — and the model would confidently hallucinate a narrative that nobody could trace.

That's not intelligence. That's a liability wearing a trench coat.

So we built the thing I wished existed.

Today we're launching Blockchain Academics MCP — 98 tools across 9 categories, designed from day one for AI agents that need to reason, cite, and be audited. News, market, on-chain, sentiment, indicators, fundamentals, agent jobs, plus 61 extended tools covering directories, narrative, regulatory, security, memos, and more.

The difference: a proprietary editorial corpus underneath it. 3,500+ curated articles, 200+ entity dossiers, 43 academy lessons, an alias-resolved entity graph, and a history API for backtesting. Not a wrapper. A substrate.

Every single response ships with a canonical JSON:API-inspired envelope — `data`, `attribution` (a citations array with cite URL, as-of timestamp, and source hash per entry), and `meta` (status, request_id for support, pageInfo for cursor pagination). Your agent can prove where every fact came from. That's the minimum bar for serious work.

Shipping today:
- @blockchainacademics/mcp v0.3.0 on npm
- bca-mcp v0.3.0 on PyPI
- Open REST at api.blockchainacademics.com
- Docs at docs.blockchainacademics.com
- Five pricing tiers at brain.blockchainacademics.com/pricing, starting free

This is the part of the agentic stack that doesn't ship itself. Infrastructure is unglamorous. You build it because the application layer above it can't exist without it.

If you're building an AI agent, a quant workflow, or an LLM product anywhere near crypto — I'd love your feedback. Break it. Tell me what's missing. The roadmap is written by the people who ship on it.

Builder to builder.

---

**Word count:** ~330
