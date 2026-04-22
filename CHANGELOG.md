# Changelog

All notable changes to `@blockchainacademics/mcp` are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
