## Reddit Post — r/cryptocurrency (chosen over r/MachineLearning)

**Subreddit choice rationale:** r/MachineLearning is strict about "self-promotion" and generally hostile to anything crypto-adjacent. r/cryptocurrency allows launch posts if framed as a genuine tool release. r/AI_Agents and r/LocalLLaMA are strong secondary targets for cross-posting.

---

**Title:**
I built a crypto tool layer for AI agents — 98 tools, backed by a curated corpus instead of CoinGecko wrappers [OC]

---

**Body:**

Been lurking here for years. Finally shipping something I wish existed when I was on the DEXTools team.

Short version: most AI agents that "analyze crypto" are running on paper-thin data — CoinGecko price, maybe an Etherscan call, a Twitter scrape if they're ambitious. Then the LLM hallucinates a narrative and nobody can trace where the "facts" came from. That's fine for a demo. It's useless for anything serious.

So we built bca-mcp. 98 tools across 9 categories, for agents that need to actually reason about this market.

**What's in it:**
- news, market data, on-chain, sentiment, indicators, fundamentals, agent jobs
- 61 extended tools: narrative tracking, regulatory, security, memes, microstructure, memos, theses, history API
- Proprietary editorial corpus underneath: ~3,500 curated articles, 200+ entity dossiers with alias resolution, 43 academy lessons

**The part devs will care about:**
Every tool response ships with a canonical JSON:API-inspired envelope — `{data, attribution: {citations: [{cite_url, as_of, source_hash}]}, meta: {status, request_id, pageInfo}}`. Your agent can cite sources and verify the data hasn't drifted between calls. No more "where did the model get that?" `citations` is an array by design so single-source and multi-source responses look the same — `citations[0]` is always primary.

**How to try it:**
- `npm i -g @blockchainacademics/mcp` or `pip install bca-mcp` (v0.3.0, shipping today)
- Open REST: api.blockchainacademics.com
- Docs: docs.blockchainacademics.com
- Free tier (1,000 calls/mo, no card): brain.blockchainacademics.com/pricing

**What I'm actually asking for:**
Break it. Tell me what tools are missing. If you're building an agent, a bot, or a research workflow — what data sources do you keep fighting with? That's the roadmap.

Not trying to pitch. Trying to ship something that pulls its weight for the people building on it.

— Wael (ex-DEXTools, DEXT Force Ventures)
