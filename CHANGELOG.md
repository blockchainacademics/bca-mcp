# Changelog

All notable changes to `@blockchainacademics/mcp` are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] — 2026-04-21

### Fixed
- `get_editorial_premium` and `get_kol_influence` now default `window` to `30d`
  instead of `7d`. Backend only rolls these two indicators at 30d/90d today, so
  the previous default caused a 404 for any agent that didn't pass `window`.
  Supported windows noted in each tool's description. Live-verified against
  `api.blockchainacademics.com`: schema parse → runtime call → envelope data.

## [0.2.0] — 2026-04-21

### Verified against production prior to publish
- All 5 agent-job skills smoke-tested against `api.blockchainacademics.com`:
  `summarize_whitepaper`, `due_diligence`, `monitor_keyword`, `translate_contract` → done.
  `tokenomics_model` → clean SkillError until fundamentals ingester lands.
- Migration 015 (`keyword_monitors`) applied on prod Neon via `preDeployCommand`.
- Stub endpoints (Twitter social, DEXTools, bonk.fun, Bittensor) now return
  `{status: "integration_pending", reason, eta}` with an `X-BCA-Integration-Status: pending`
  header instead of 501/NotImplementedError.

## [0.2.0-draft] — 2026-04-20

### Added — 96 new tools across 13 categories (total surface: 99 tools)

Phase 3c/3d/3e expansion: wired every /v1/* endpoint the backend exposes (119
total) as an MCP tool. Matches ~100% of backend surface. A handful of spec
tools (e.g. get_nft_floor, trace_funds, get_mcp_recipe) are not wired because
their backend endpoints do not yet exist.

### Added — 26 new tools across 5 categories (initial batch)

Content & corpus:
- `get_article`, `list_entity_mentions`, `list_topics`, `get_as_of_snapshot`

Market data (CoinGecko + DexScreener free tiers):
- `get_price`, `get_ohlc`, `get_market_overview`, `get_pair_data`

On-chain (Etherscan + Helius + DefiLlama):
- `get_wallet_profile`, `get_tx`, `get_token_holders`, `get_defi_protocol`

Sentiment:
- `get_sentiment`, `get_social_pulse`, `get_fear_greed`

Proprietary indicators (Pro+ tier):
- `get_coverage_index`, `get_narrative_strength`, `get_sentiment_velocity`,
  `get_editorial_premium`, `get_kol_influence`, `get_risk_score`

Agent-backed async generation (Pro/Team tier):
- `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper`,
  `translate_contract`, `monitor_keyword`, `get_agent_job` (status poll)

### Changed
- HTTP client supports POST via new `post()` method (required for agent-job tools).
- Each tool category now lives in its own module under `src/tools/`.
- Draft version — do not publish to npm until integration-tested against prod.

## [0.1.0] — 2026-04-19

### Added
- Initial release with stdio transport.
- `search_news` tool — full-text search over the BCA editorial corpus.
- `get_entity` tool — canonical entity dossiers by slug or ticker.
- `get_explainer` tool — canonical academy lessons by slug or topic.
- Typed HTTPS client with `BCA_API_KEY` header injection and 20s timeout.
- Structured error taxonomy (`BCA_AUTH`, `BCA_RATE_LIMIT`, `BCA_UPSTREAM`, `BCA_NETWORK`, `BCA_BAD_REQUEST`).
- Attribution surfacing (`cite_url`, `as_of`, `source_hash`) on every tool response.
- Smoke test suite using `node:test` with mocked `fetch`.
