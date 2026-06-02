# BCA MCP — Roadmap

Status snapshot from the 99-tool battle-test on 2026-06-02 (against prod
`api.blockchainacademics.com`, 1,820 calls fired). 87 of 99 tools are
either fully green or honestly-flagged `meta.status="unseeded"` with a
structured diagnostic. This document lists what's coming and when.

The MCP server's envelope contract guarantees that every tool response
carries a `meta.status` field; consumers branch on `complete` /
`unseeded` / `partial` / `stale` without parsing the data shape. Tools
marked unseeded below already return the canonical
`integration_pending` body — only the data layer is missing.

## v0.5.0 — Vendor integrations (target: 2026-06-15)

Higher-leverage tools first.

| Tool | Current status | Target source | Notes |
|---|---|---|---|
| `get_funding_rates` | partial (multi-venue fan-out) | Coinglass Pro API ($129/mo) | Replace per-venue scrape with single canonical Coinglass endpoint. Adds historical funding curves. |
| `get_liquidation_heatmap` | unseeded | Coinglass | Same vendor as above. Single API key unlocks both. |
| `get_exchange_flows` | unseeded | CryptoQuant or Nansen | Evaluate both for free-tier quota; CryptoQuant has more historical depth. |
| `track_pumpfun` | partial | Pump.fun on-chain ingestion (Solana RPC) | Helius-based ingestion of pump.fun program logs. |
| `track_bonkfun` | unseeded | Bonk.fun on-chain ingestion | Same Helius pipeline pattern, different program ID. |

## v0.6.0 — Sentiment + scoring layer (target: 2026-07-01)

| Tool | Current status | Target source | Notes |
|---|---|---|---|
| `get_sentiment` (broader entity coverage) | unseeded for tail entities | Run BCA sentiment-bucket job over 200 most-queried entities daily | Currently only computed for ~30 popular entities. |
| `get_kol_influence` | unseeded for tail entities | Twitter API + BCA's KOL pipeline | Need scoring model for engagement × historical pick accuracy. |
| `get_social_pulse` | unseeded | Twitter API v2 + BCA KOL CRM aggregation | Composite signal across the 88 vetted KOLs in BCA's CRM. |
| `get_social_signals` | unseeded for tail symbols | Twitter aggregation | Today only top 50 symbols are tracked. |
| `get_degen_leaderboard` | unseeded | Pump.fun + Bonk.fun trader-leaderboard aggregation | Builds on the 0.5.0 ingestion pipelines. |

## v0.7.0 — Security + AI ecosystems (target: 2026-07-15)

| Tool | Current status | Target source | Notes |
|---|---|---|---|
| `get_bug_bounty_programs` | unseeded | Immunefi public API | Scraped + cached daily. |
| `get_ai_crypto_metrics` | unseeded (only Bittensor live) | Bittensor + Ritual + Prime Intellect | Currently `taostats.io` only — add Ritual + Prime Intellect once their APIs stabilise. |
| `get_as_of_snapshot` (broader corpus) | unseeded for early dates | Backfill from BCA's news pipeline | Add historical articles ingested before 2026-01-01. |

## v0.8.0+ — Performance & resilience (target: 2026-08-01)

Not data work — these are quality multipliers that flip the SLA bar.

- **Redis caching layer** for the slow vendor passthroughs.
  - CoinGecko price/ohlc/overview → 60s TTL → cuts p95 from 2-8s to ~200ms cache-hit.
  - DefiLlama yields/stablecoins/protocols → 5 min TTL.
  - Coinglass funding/liquidations → 30s TTL.
  - Expected impact: 35 SLA-failing tools → 5 SLA-failing tools.
- **Retry-with-backoff in vendor HTTP clients** (1 retry, 250ms delay) on
  502/503 status codes. Eliminates the ~5% intermittent vendor flake rate
  surfaced by the 2026-06-02 battle-test.
- **CoinGecko Pro tier upgrade** ($129/mo) to eliminate the free-tier
  rate-limit class of error on `get_price`/`get_ohlc`/`get_market_overview`.

## Already shipped in 0.4.0

- Hybrid `citations[]` (upstream URL first, BCA deep-link second) on 44
  external-source handlers.
- Honest `meta.status="unseeded"` + `meta.diagnostic` on every empty-data
  endpoint that previously returned silent empty arrays.
- `translate_contract` field rename + `build_custom_indicator` 400 fix +
  `get_article` ORM/TSVECTOR fix.
- MCP-TS-2 redirect hardening in the Python sibling (lockstep with TS
  0.3.2).
- Battle-test harness at `audit/battle_test.mjs` + 99-tool audit matrix
  at `audit/99-matrix.md`.
- Defensive header serialisation in `articles` + `news` handlers.

## What "unseeded" means

A tool returning `meta.status="unseeded"` is **functionally healthy** —
the route exists, accepts the documented schema, returns the canonical
envelope, and emits a structured diagnostic. The DATA layer is what's
missing: BCA has not yet ingested or computed the underlying values.

For LLM consumers this is a feature, not a bug: the agent gets a clear
signal to either (a) skip this data source, (b) inform the user that
this domain is on the public roadmap, or (c) fall back to a different
tool. Versus returning empty arrays, which the LLM might present as
"there is no data" — a hallucination-adjacent failure mode.

Honest signals are reviewer-trust signals.
