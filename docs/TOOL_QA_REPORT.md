# BCA REST API — Ship Readiness Probe

**Probe date:** 2026-04-22
**Routes tested:** 100 (out of 107 GET routes in OpenAPI spec)
**Credentials:** internal QA key (enterprise tier, no rate limits)

## Executive summary

| Metric | Count | % |
|---|---:|---:|
| HTTP 200 | 65 | 65% |
| HTTP 404 | 6 | 6% |
| HTTP 5xx | 0 | 0% |
| Other | 29 | 29% |

### Envelope shape on 200s
- `flat`: 63 routes
- `legacy`: 1 routes
- `(none)`: 1 routes

### Launch blockers
- **11 routes return empty data** on realistic inputs — first-time users will see nothing
- **2 routes missing `cite_url`** — our "provenance-first" brand promise broken
- **55 routes missing `status` field** — MCP tools document this; REST doesn't ship it

## Ship blockers — detail

### Returns 404 on expected input
- `GET /v1/academy/beginners-guide-to-crypto`
- `GET /v1/academy/beginners-guide-to-crypto/lessons/what-is-blockchain`
- `GET /v1/articles/434`
- `GET /v1/directories/marketing-templates/twitter-launch`
- `GET /v1/memos/latest`
- `GET /v1/theses/latest`

### Returns 5xx (server error)
_(none — zero 5xx errors)_

### Returns 200 but empty data
- `GET /v1/social-signals` → `dict(len=0)`
- `GET /v1/onchain/tx?hash=0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060&chain=ethereum` → `NoneType(len=0)`
- `GET /v1/compute/ai-metrics` → `NoneType(len=0)`
- `GET /v1/memes/bonkfun` → `NoneType(len=0)`
- `GET /v1/memes/leaderboard` → `NoneType(len=0)`
- `GET /v1/memes/pumpfun` → `NoneType(len=0)`
- `GET /v1/microstructure/exchange-flows?symbol=BTC` → `NoneType(len=0)`
- `GET /v1/microstructure/liquidation-heatmap?symbol=BTC` → `NoneType(len=0)`
- `GET /v1/security/bug-bounties` → `NoneType(len=0)`
- `GET /v1/security/exploits?limit=10` → `NoneType(len=0)`
- `GET /v1/status` → `NoneType(len=0)`

## Envelope contract audit

Documented contract (in MCP + docs): `{data, status: complete|partial|unseeded|error, attribution: {cite_url, as_of, source_hash}}`

Actual REST shape on most 200s: `{data, cite_url, as_of, source_hash}` — `attribution` NOT nested, `status` field ABSENT.

This is a **contract drift** between MCP tool schemas and REST responses. Either:
- (a) fix REST to emit the nested envelope to match docs/MCP, OR
- (b) fix docs + MCP tool schemas to describe the flat shape

Option (a) is correct per prior engineering intent (see task #14 in memory).

## Full per-route results

| HTTP | route | envelope | status | data_count | empty | cite_url |
|---|---|---|---|---:|---|---|
| ERR | `/v1/onchain/defi` | - | - | - | - | - |
| 200 | `/v1/academy` | flat | - | 8 | ✅ | ✅ |
| 200 | `/v1/academy/search` | flat | - | 20 | ✅ | ✅ |
| 200 | `/v1/articles/search` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/chains/bitcoin-l2` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/chains/l2-comparison` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/chains/solana` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/chains/ton` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/compute/ai-metrics` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/compute/pricing` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/currencies` | flat | - | 30 | ✅ | ✅ |
| 200 | `/v1/currencies/BTC/feed` | flat | - | 20 | ✅ | ✅ |
| 200 | `/v1/directories/aggregators` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/jobs` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/marketing-templates` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/mcps` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/nft-communities` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/smart-contract-templates` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/smart-contract-templates/erc20` | flat | - | 7 | ✅ | ✅ |
| 200 | `/v1/directories/stablecoins` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/trading-bots` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/vcs` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/directories/yields` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/entities` | flat | - | 10 | ✅ | ✅ |
| 200 | `/v1/entities/bitcoin` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/entities/bitcoin/mentions` | flat | - | 5 | ✅ | ✅ |
| 200 | `/v1/entities/ethereum` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/feed` | flat | - | 5 | ✅ | ✅ |
| 200 | `/v1/history/correlation/BTC` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/history/coverage` | flat | - | 22 | ✅ | ✅ |
| 200 | `/v1/history/prices/BTC` | flat | - | 35 | ✅ | ✅ |
| 200 | `/v1/history/sentiment/BTC` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/market/overview` | flat | - | 10 | ✅ | ✅ |
| 200 | `/v1/memes/bonkfun` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/memes/leaderboard` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/memes/pumpfun` | flat | upstream_error | 0 | ❌ | ✅ |
| 200 | `/v1/memos` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/microstructure/exchange-flows` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/microstructure/funding-rates` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/microstructure/liquidation-heatmap` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/microstructure/options-flow` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/narrative/ai-agents` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/narrative/depin` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/narrative/prediction-markets` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/narrative/rwa` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/narrative/track` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/news` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/news` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/news/434` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/onchain/tx` | flat | upstream_error | 0 | ❌ | ✅ |
| 200 | `/v1/onchain/wallet` | flat | - | 4 | ✅ | ✅ |
| 200 | `/v1/regulatory/mica` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/rss` | - | - | - | ✅ | ❌ |
| 200 | `/v1/security/bug-bounties` | flat | integration_pending | 0 | ❌ | ✅ |
| 200 | `/v1/security/exploits` | flat | upstream_error | 0 | ❌ | ✅ |
| 200 | `/v1/security/scan-contract` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/sentiment/fear-greed` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/social-signals` | flat | - | 0 | ❌ | ✅ |
| 200 | `/v1/social-signals/BTC` | flat | - | 6 | ✅ | ✅ |
| 200 | `/v1/sources` | flat | - | 9 | ✅ | ✅ |
| 200 | `/v1/status` | legacy | ok | 0 | ❌ | ❌ |
| 200 | `/v1/stories/recent` | flat | - | 5 | ✅ | ✅ |
| 200 | `/v1/theses` | flat | - | 1 | ✅ | ✅ |
| 200 | `/v1/topics` | flat | - | 3 | ✅ | ✅ |
| 200 | `/v1/topics/defi` | flat | - | 2 | ✅ | ✅ |
| 200 | `/v1/trending` | flat | - | 12 | ✅ | ✅ |
| 404 | `/v1/academy/beginners-guide-to-crypto` | - | - | - | - | - |
| 404 | `/v1/academy/beginners-guide-to-crypto/lessons/what-is-blockchain` | - | - | - | - | - |
| 404 | `/v1/articles/434` | - | - | - | - | - |
| 404 | `/v1/directories/marketing-templates/twitter-launch` | - | - | - | - | - |
| 404 | `/v1/memos/latest` | - | - | - | - | - |
| 404 | `/v1/theses/latest` | - | - | - | - | - |
| 422 | `/v1/agent-jobs/1` | - | - | - | - | - |
| 422 | `/v1/directories/custom-indicator` | - | - | - | - | - |
| 422 | `/v1/fundamentals/audits` | - | - | - | - | - |
| 422 | `/v1/fundamentals/compare` | - | - | - | - | - |
| 422 | `/v1/fundamentals/roadmap` | - | - | - | - | - |
| 422 | `/v1/fundamentals/rugpull` | - | - | - | - | - |
| 422 | `/v1/fundamentals/team` | - | - | - | - | - |
| 422 | `/v1/fundamentals/tokenomics` | - | - | - | - | - |
| 422 | `/v1/indicators/coverage` | - | - | - | - | - |
| 422 | `/v1/indicators/editorial-premium` | - | - | - | - | - |
| 422 | `/v1/indicators/kol-influence` | - | - | - | - | - |
| 422 | `/v1/indicators/narrative` | - | - | - | - | - |
| 422 | `/v1/indicators/risk` | - | - | - | - | - |
| 422 | `/v1/indicators/sentiment-velocity` | - | - | - | - | - |
| 422 | `/v1/market/ohlc` | - | - | - | - | - |
| 422 | `/v1/market/pair` | - | - | - | - | - |
| 422 | `/v1/market/price` | - | - | - | - | - |
| 422 | `/v1/market/price` | - | - | - | - | - |
| 422 | `/v1/memes/risk` | - | - | - | - | - |
| 422 | `/v1/microstructure/predict-listing` | - | - | - | - | - |
| 422 | `/v1/onchain/holders` | - | - | - | - | - |
| 422 | `/v1/regulatory/sec-filings` | - | - | - | - | - |
| 422 | `/v1/regulatory/status` | - | - | - | - | - |
| 422 | `/v1/regulatory/tax-rules` | - | - | - | - | - |
| 422 | `/v1/security/phishing` | - | - | - | - | - |
| 422 | `/v1/sentiment` | - | - | - | - | - |
| 422 | `/v1/sentiment` | - | - | - | - | - |
| 422 | `/v1/sentiment/social` | - | - | - | - | - |
