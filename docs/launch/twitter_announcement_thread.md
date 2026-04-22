## Twitter/X Announcement Thread — @waelxbt

---

**1/**
Most crypto MCPs are just CoinGecko wrappers in a trench coat.

We built the opposite: an MCP backed by a proprietary editorial corpus — 3,500+ curated articles, 200+ entity dossiers, 43 academy lessons. Shipping today.

**2/**
Meet bca-mcp — 98 tools across 9 categories for AI agents that actually need to reason about crypto:

- news (6)
- market (4)
- on-chain (4)
- sentiment (5)
- indicators (6)
- fundamentals (6)
- agent-jobs (6)
- extended (61)

Not a demo. Production infra.

**3/**
The "holy shit" number:

Every tool response ships with a canonical envelope — `{data, attribution:{citations:[{cite_url, as_of, source_hash}]}, meta:{status, request_id, pageInfo}}`. Every fact your agent uses is citeable and hash-verifiable. `citations` is an array by design — multi-source ready from day one.

No more hallucinated sources. No more "where did the model get that?"

**4/**
Why this matters for agent builders:

LLMs are pattern machines. Crypto is an adversarial information environment. If your trading / research / ops agent can't prove where a fact came from, it's a liability — not a product.

Provenance-first is the only serious design.

**5/**
What's under the hood:

- Curated news pipeline (not RSS spam)
- Entity graph with alias resolution (CZ → Changpeng Zhao, etc.)
- History API for backtesting sentiment/narrative
- Memos + theses from DEXT Force Ventures
- On-chain + microstructure + regulatory + security

**6/**
Install:

```
npm i -g @blockchainacademics/mcp
# or
pip install bca-mcp
```

v0.3.0 live on npm + PyPI. Open REST at api.blockchainacademics.com. Docs at docs.blockchainacademics.com.

Free tier included. No credit card for the first 1,000 calls.

**7/**
I built DEXTools. I run DEXT Force Ventures. I've watched this market for 7 years.

The thing I kept wishing existed — a crypto knowledge layer that agents can actually trust — didn't exist. So we built it.

**8/**
5 tiers, starting free, scaling to institutional.

Pricing: brain.blockchainacademics.com/pricing

If you're shipping an agent, a quant system, or an LLM product that touches crypto — this is the substrate.

Build on it. Break it. Tell me what's missing.

---

**Reply bait (optional #9):**
What's the #1 crypto data source your agent keeps getting wrong?

Drop it below. We'll add tools for it.
