# Changelog

All notable changes to `@blockchainacademics/mcp` are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.1] — 2026-06-04

### Fixed — entry-point guard via npx symlinks

The v0.5.0 entry-point guard compared `process.argv[1]` to
`fileURLToPath(import.meta.url)` literally. That worked for direct
invocation (`node dist/index.js`) but failed for the actual launch-day
scenario: `npx -y @blockchainacademics/mcp` installs the package and
invokes the bin via a symlink at `node_modules/.bin/bca-mcp` → `dist/index.js`.
The two paths never match, so `_isEntry` was `false`, `main()` never
ran, and the MCP server appeared to start but registered zero tools.

Resolved both paths via `realpathSync` before comparing.

Verified against a published `0.5.1` symlink invocation: banner emits to
stderr, `server.connect(transport)` runs, tools list correctly.

Python sibling bumped to 0.5.1 in lockstep — no functional change there
(`__name__ == "__main__"` resolves correctly via console_scripts).

## [0.5.0] — 2026-06-04

### Added — public demo tier (zero-config first run)

When `BCA_API_KEY` is unset, `BcaClient` now falls back to a baked-in
public demo key (`bca_demo_a3e1cc71b2b32872cb32516ffc7e8ad8203acb9d`).
The backend recognises it, applies a 10-tool allowlist (price, trending,
fear-greed, market overview, news search, sentiment, entity, explainer,
recent stories, topic), and rate-limits at 100/day global + 20/day
per-IP. `npx -y @blockchainacademics/mcp` is now a true zero-config
demo instead of a `BCA_AUTH` wall on every tool call.

- `EnvelopeMeta` gains optional `tier` + `upgrade_url` (passthrough on
  both canonical and legacy-flat branches).
- `BcaErrorCode` union extends with `BCA_TIER_LOCKED`. 401/403 handler
  peeks at upstream body and surfaces the signup URL verbatim.
- New `usingDemoKey` accessor drives a one-time stderr banner from `main()`
  after the stdio handshake. Banner is byte-identical to the Python sibling.
- Build infrastructure: `scripts/demo-key.txt` (committed) +
  `scripts/gen-demo-key.mjs` write `src/demo_key.ts` at build time.
  Wired into `build`, `dev`, and `test` npm scripts.

### Fixed — latent test hang in security_v031.test.ts

`test/security_v031.test.ts` imported from `src/index.js` which fired
`main()` on module load and blocked on stdio reads forever in CI. Added
an entry-point guard so `main()` runs only when this file is the entry
script. (Note: 0.5.0's guard had the npx-symlink bug — see 0.5.1.)

## [0.4.2] — 2026-06-02

### Added — MCP Registry submission prep

- `package.json` now declares `mcpName: "io.github.blockchainacademics/mcp"`.
  Required by the official MCP Registry (`registry.modelcontextprotocol.io`)
  so the npm artifact can be verified against the server metadata.
- `server.json` migrated to the 2025-12-11 schema:
  - camelCase field names (`registryType`, `environmentVariables`,
    `isRequired`, `isSecret`) replace the prior snake_case keys.
  - PyPI `bca-mcp` added as a second `packages[]` entry so the registry
    surfaces both install paths (`npx @blockchainacademics/mcp` and
    `uvx bca-mcp`).
  - `format: "string"` on env vars per schema validation.

No source change. Lockstep with `bca-mcp@0.4.2` on PyPI.

## [0.4.1] — 2026-06-02

### Fixed (lockstep with bca-mcp 0.4.1 on PyPI)

- Python sibling 0.4.0 failed to import on Python 3.10. The TS package
  has no functional change; this version bump exists only to keep TS +
  Python in lockstep on the npm + PyPI directory listings.

## [0.4.0] — 2026-06-02

Distribution release for the Anthropic MCP directory submission.

### Added — hybrid citations

- **`attribution.citations[]` now ships TWO entries when a real upstream
  source exists.** `citations[0]` is the actual upstream URL (the Bankless
  article, the CoinGecko coin page, the Etherscan tx, the SEC filing, etc.)
  with the upstream `as_of` and `source_hash`. `citations[1]` is the BCA
  editorial deep-link. LLM consumers get true provenance first; BCA still
  rides along for secondary attribution. The contract already permitted
  multi-entry `citations[]` from 0.3.0 — handlers now actively populate it.
- **44 API handlers wired** to emit upstream URLs: news + articles + market
  (CoinGecko / DexScreener) + onchain (Etherscan / Solscan / BscScan /
  Snowtrace / Basescan / Arbiscan / Polygonscan / Mempool) + sentiment
  (alternative.me Fear & Greed) + history (CoinGecko OHLC) + narrative
  (DefiLlama / DePin Ninja / RWA.xyz / Polymarket) + regulatory (SEC / ESMA /
  FCA / FSA / MAS / IRS / CRA / gov.uk) + security (rekt.news / Chainabuse /
  Immunefi) + memes (pump.fun / Solscan) + microstructure (Coinglass /
  Deribit) + compute (Akash / io.net / taostats) + directories (DefiLlama
  stablecoins/yields) + entities (per-entity homepage / mention source) +
  stories (cluster lead article) + academy (lesson external source).
- **Defensive `X-BCA-Cite-Upstream` middleware guard**: `javascript:` /
  `data:` / `file:` URLs silently dropped before reaching `citations[0]`.
- BCA-proprietary tools (indicators, memos, theses, BCA-curated directories)
  intentionally stay single-citation — BCA *is* the upstream for those.

### Fixed

- **`get_article` 500 on every slug.** Root cause: ORM `select(VaultArticle)`
  pulled the Postgres `search_vector` TSVECTOR column which SQLAlchemy can't
  materialise into Python. Switched to raw SQL with an explicit column list
  (matches `search_articles`). Surfaced by the battle-test sweep on
  2026-06-02 (20/20 errors against every real slug).
- **`translate_contract` 422 rejections.** Renamed MCP input field
  `source_code` → `code` to match the API's `TranslateContractRequest`
  schema. Backwards-incompatible only for callers that explicitly passed
  `source_code`; the field has the same semantics.
- **Empty-data handlers no longer return misleading `status="complete"`.**
  `search_articles` (zero rows with non-trivial filters), `get_sentiment`
  (no sentiment bucket), `get_kol_influence` (no KOL score), and
  `social_signals` (no signals) now return the canonical
  `integration_pending` contract, mapping to `meta.status="unseeded"` with
  a structured `meta.diagnostic.reason + .eta`. LLM consumers can branch
  on the honest signal instead of mis-parsing an empty `results` array.
- **`build_custom_indicator` 400 on missing-data formulas.** When the
  formula references a function/slug with no computed value yet, the
  handler now returns the `integration_pending` contract instead of a 400.
  Genuine syntax / unknown-function errors still 400 correctly.
- **Defensive header serialisation in `articles` + `news` handlers.** A
  `_set_upstream_headers()` helper wraps the Cite-Upstream / As-Of / Hash
  assignment in try/except so a bad annotation value (non-ASCII, bytes,
  tz-naive datetime) can never crash the handler. Coerces via `str()`,
  uses `.isoformat()` instead of hardcoded `Z` suffix.

### Verified — battle-test results

- 1,820 calls fired across 91 live tools (8 mutation endpoints skipped),
  concurrency 5, in 479 seconds against prod.
- **83 / 91 (91%) zero-error under sustained load.**
- **0 / 91 citation-count drift across calls** — hybrid envelope is
  deterministic.
- 56 / 91 passed per-category p95 SLA. The 35 slower tools are
  vendor-bound (CoinGecko free-tier rate limit on 2; DefiLlama 502/503
  on 3; Etherscan 502 intermittent on 1). Honest `meta.status="partial"`
  already communicates vendor-degraded responses.

### Roadmap

See [ROADMAP.md](ROADMAP.md) for the 14 honestly-flagged
`meta.status="unseeded"` tools and their target 0.5.0+ vendor
integrations.

## [0.3.2] — 2026-04-22

### Security

- **MCP-TS-2 — X-API-Key redirect hardening.** All upstream requests now set
  `redirect: "manual"` and explicitly reject 3xx responses rather than
  following them. Prevents a compromised or mis-configured upstream from
  301/302-redirecting the MCP client to a host that would receive the user's
  `X-API-Key` header. The allowlist on `BCA_API_BASE` (H-1, 0.3.1) already
  bounds the *initial* host; this closes the redirect-based escape from that
  bound.

## [0.3.1] — 2026-04-22

### Security

- **H-1 — `BCA_API_BASE` allowlist.** Replaced the loose `https://` prefix
  check with a strict allowlist: `https://api.blockchainacademics.com`
  (default), `https://staging-api.blockchainacademics.com`,
  `http://localhost[:port]`, `http://127.0.0.1[:port]`. An attacker who
  controlled `BCA_API_BASE` previously could redirect the user's `X-API-Key`
  to any HTTPS host; that path is closed. The `BCA_ALLOW_INSECURE_BASE=1`
  escape hatch is removed — local dev over HTTP is handled directly by the
  allowlisted loopback prefixes.
- **H-2 — Prompt-injection fencing on tool responses.** The `data` field of
  every canonical envelope is now wrapped in `<untrusted_content source="bca-api">…</untrusted_content>`
  before it is serialised into the MCP `text` content block. `attribution`
  and `meta` remain structured. Fence bytes match the Python sibling
  byte-for-byte. The per-tool fencing on `summarize_whitepaper` and
  `translate_contract` output fields is preserved as a second layer.
- **H-3 — Webhook SSRF guard on `monitor_keyword`.** `webhook_url` is now
  validated before the request is sent upstream: HTTPS only, no bare IP
  literals, and every IP that the hostname resolves to must be public
  (rejects RFC1918, loopback 127/8, link-local 169.254/16 — including IMDS
  169.254.169.254, CGNAT 100.64/10, multicast/reserved, IPv6 ULA/link-local).
  The input-schema pattern is tightened from `^https?://` to `^https://` so
  the zod parser rejects HTTP at schema time.

## [0.3.0] — 2026-04-22

### Changed — BREAKING — canonical response envelope

Blockchain Academics has locked a single JSON:API-inspired response envelope
across all surfaces (REST, MCP, CLI, SDK). The MCP server now emits that
canonical shape verbatim. Tool callers parsing envelope fields must migrate.

#### Wire shape — before (0.2.x)

```json
{
  "data": { ... },
  "status": "complete",
  "attribution": {
    "cite_url": "https://...",
    "as_of": "2026-04-21T...",
    "source_hash": "sha256:..."
  },
  "meta": null
}
```

#### Wire shape — after (0.3.0)

```json
{
  "data": { ... },
  "attribution": {
    "citations": [
      {
        "cite_url": "https://...",
        "as_of": "2026-04-22T...",
        "source_hash": "sha256:..."
      }
    ]
  },
  "meta": {
    "status": "complete",
    "request_id": "req_...",
    "pageInfo": {
      "hasNextPage": false,
      "hasPreviousPage": false,
      "startCursor": null,
      "endCursor": null
    }
  }
}
```

#### Migration — field by field

- `status` moved from envelope root → `meta.status`.
- `attribution.cite_url` / `attribution.as_of` / `attribution.source_hash`
  replaced with `attribution.citations[]` (array). The primary citation is
  always at index `0`. Access via `envelope.attribution.citations[0].cite_url`
  instead of `envelope.attribution.cite_url`.
- `meta` is now always a structured object (never `null`). Always contains
  `status`, `request_id` (string), and `pageInfo`. A `diagnostic` sub-object
  is present only on `unseeded` or `partial` responses.
- `meta.status` enum tightened: `complete | unseeded | partial | stale`. The
  old `"error"` value is removed — errors are surfaced as HTTP 4xx/5xx and
  propagate through the MCP error channel (`isError: true`), never as an
  envelope status.
- Rate-limit hints (`X-RateLimit-Remaining`, `Retry-After`) are HTTP headers
  only. The MCP server does not echo them into the response body.

#### Backward-compat shim

During the rolling REST deploy, the HTTP client will accept an upstream that
briefly emits the legacy flat shape (`{data, cite_url?, as_of?, source_hash?}`)
and auto-lift it into the canonical envelope. A one-time `console.warn` makes
the drift visible. The shim will be removed in a future release once all
BCA surfaces report canonical.

### Added
- `src/types.ts`: new exported types `Citation`, `PageInfo`, `EnvelopeMeta`,
  tightened `EnvelopeStatus` to the canonical enum (dropped `"error"`).
- `src/client.ts`: `normalizeEnvelope<T>()` helper — single source of truth
  for parsing canonical / flat / raw upstream responses.

### Removed
- The inline flat→nested transform in `src/index.ts` that rebuilt the
  envelope on every MCP tool call. The wire handler now serialises the
  envelope the client returns, verbatim.
- `resolveEnvelopeStatus()` call-site in `src/index.ts` (status is set
  upstream in the REST envelope middleware now). The helper is still
  exported from `src/types.ts` for tool authors who synthesise envelopes
  locally.

## [0.2.2] — 2026-04-21

### Fixed — 10 tool input schemas surfaced via live production audit

Live audit of 99 tools against `api.blockchainacademics.com` revealed 10
tools where the MCP-side Zod schema disagreed with the backend Pydantic
contract. Each fix below resolves an HTTP 422 that agents previously hit:

- `generate_due_diligence` — `depth` enum: `brief|standard|deep` → `light|standard|deep`
- `translate_contract` — renamed `source_lang` → `source_language`, `target_lang` → `target_language`
- `monitor_keyword` — `webhook_url` now required (was optional)
- `list_aggregators` — `kind` enum: `swap|bridge|all` → `dex|bridge|yield`, now required
- `check_rugpull_risk` — field: `contract`+`chain` → `entity_slug`
- `check_memecoin_risk` — field: `contract`+`chain` → `mint` (Solana token mint)
- `scan_contract` — field: `contract`+`chain` → `address` (0x EVM, regex-validated)
- `book_kol_campaign` — added required `contact_email`
- `request_custom_research` — added required `contact_email`; `depth` enum aligned to `light|standard|deep`
- `submit_listing` — added required `listing_name`

Tool descriptions now document required fields + enum values inline so LLM
callers can self-correct before an API roundtrip.

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
