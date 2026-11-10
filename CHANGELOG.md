# Changelog

All notable changes to `@blockchainacademics/mcp` are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.6.4 (unreleased)

Directory review fixes (directory-submissions.md, section 4.6 rows A3, A5 and A10, and the package fixes of section 20), in lockstep with `bca-mcp` 0.6.4 on PyPI. Same 105 tools, same arguments and schemas.

- Tool descriptions say what each tool does, what it returns and when it applies, and no longer tell the model how to behave or sell a service. Rewritten: `search_news` (no "use this whenever" or "prefer this tool over generating claims from memory"), `get_entity`, `get_explainer` (no "teacher-vetted", no "prefer the explainer"), `get_article`, `list_entity_mentions`, `list_topics`, `get_price`, `get_market_overview`, `get_wallet_profile`, `get_token_holders`, `get_x_signals` (no "before news outlets"), `get_sentiment_velocity` (says what the sign means instead of "an early reversal signal"), `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper` and `translate_contract` (get_agent_job returns the result, instead of "poll get_agent_job"), `book_kol_campaign`, `request_custom_research` and `submit_listing` (no "free to submit", featured listing pricing or payment method), `search_academy` (site_url is the page, instead of "link with site_url") and `get_prediction_markets` ("takes a venue and a topic", instead of "pick the venue"). The `submit_listing.contact_email` description drops the featured listing pricing too, and `list_jobs.include_description` says get_job returns one role in full, instead of "use get_job". Every tier mention stays: 52 tools are on the free tier, and each paid tool still names its tier.
- The rewritten descriptions read the same in both packages, word for word (the two indicators keep each package's own `meta.status` sentence), and a test fails if any tool or parameter description tells the model what to prefer, what to use, how to link or what to buy.
- `@modelcontextprotocol/sdk` 1.29.0 to 1.32.2, pinned exactly. 1.32.2 is the newest 1.x release (2026-10-23) and clears the six GitHub advisories that cover 1.29.0 (GHSA-6qxp-vccf-f47h, GHSA-22jm-h49p-29qw, GHSA-46jr-4wx8-v453, GHSA-f897-62hf-6gxq, GHSA-rvq5-wwqv-78pq, GHSA-6prh-2h8m-c8cw). No code change was needed: the server keeps the low level `Server` class over stdio, and the build and every test pass unchanged.
- `zod` 3.25.76 to 4.6.7, pinned exactly. 4.6.7 (2026-10-12) is the newest zod 4 release published at least two weeks ago and carries the fix for advisory GHSA-mrhx-c7xc-m3w5 (high, memory use when validating oversized constrained collections, fixed in 4.6.6); the SDK accepts it (`^3.25 || ^4.0`). tools/list does not change: the converter that walked zod 3 internals gives way to zod 4's own `z.toJSONSchema` (the input side), with an override that keeps `additionalProperties: false` on every object, advertises only the bounds a tool sets (not the safe integer range `.int()` checks), keeps the `uri` format where a `.regex()` follows the URL check, leaves out the regex zod checks email addresses with, and drops `$schema`. A dump of tools/list over stdio matches the zod 3 build in every tool, property, required field, type, enum, bound, length, pattern, format, default, description and annotation; only the order of keys inside some property schemas differs. Validation errors keep their wording (`query: Required`, `limit: Number must be less than or equal to 50`). Four things change when a tool is called, all from zod 4: string lengths count Unicode code points, as JSON Schema and the API count them (an emoji is one character, not two); a URL argument is trimmed of surrounding spaces and stray tabs or line breaks before it is checked and sent; an integer beyond the safe range (9,007,199,254,740,991) is rejected before any request (an argument with a bound of its own, such as `limit`, still names only that bound); and a fractional value for an integer argument reports only that it must be an integer.
- package-lock.json: the SDK's own dependencies move to patched releases published at least two weeks ago (hono 4.13.13, @hono/node-server 2.1.5, body-parser 2.4.0, express-rate-limit 8.7.1, ip-address 10.7.4, proxy-addr 2.0.8, qs 6.16.1, fast-uri 3.1.9). The `fast-uri` override is now `^3.1.9`, the patched release of the 3.x line ajv asks for (it was `>=3.1.1`, which let npm pick 4.x). `npm audit` now reports only esbuild (low, a development dependency of tsx), and `npm audit --audit-level=high` passes.
- `server.json`: the description reads "Cited crypto news, prices, onchain data, sentiment and indicators: 105 tools. Not financial advice." (99 of the 100 characters the schema allows). The PyPI package `bca-mcp` is listed next to the npm package, with the same environment variables and `runtimeHint` uvx; the registry checks it through the `mcp-name` line in the `bca-mcp` README, so `bca-mcp` 0.6.4 must be on PyPI before this `server.json` is published. All version fields are 0.6.4.
- README: a "Not financial advice" note, a Privacy section (what each call sends, to which host, what is stored, and the policy link), "about 150 entity dossiers" (it said 150+, while `list_entities` says about 150), an opening line about the product instead of "the canonical crypto MCP server", a "Why" section without the "ground-truth" claim, and the `@elizaos/plugin-mcp` character snippet for Eliza.
- `package.json` description: the product line from the README, without "canonical".
- A read the API turns away at its per-second limit (HTTP 429) is sent again instead of failing, so a second tool call made in the same moment waits a second or two and then answers. Up to two retries, each after `Retry-After` (1 second when the header is absent) plus 100 to 300 ms of jitter, at most 4.6 seconds in all. Only GET requests are repeated, and only when the 429 is the per-second limit: a `Retry-After` of 2 seconds or less together with `X-BCA-Error-Code: BCA_RATE_LIMIT`, or no `Retry-After` and a detail that names the limit. A daily cap, the job queue cap and a vendor limit still answer `BCA_RATE_LIMIT` at once, and a `Retry-After` that is not a whole number of seconds is ignored (it gave `retryAfter` NaN).

- Every link the package shows people now points at blockchainacademics.com/crypto-api (signup, pricing, docs); brain. and docs. are permanent redirects since the one-domain consolidation (2026-10-29).
- server.json: `websiteUrl`, `docs_url` on the main site, display name "BCA Crypto Brain", and category examples now list all 105 tools (97 before).
- `tools.json` ships in the package: tool names and counts per category, generated from the registry, for sites that must never type a count by hand.
- tools/list advertises full JSON Schemas: integer and number types, enums, minimum and maximum, string lengths, patterns, email and URL formats, defaults, required fields and descriptions. `get_entity` and `get_explainer` list their inputs again (the old converter lost any schema wrapped in `.refine()`); their "exactly one of" rule is still checked when the tool is called.
- Every tool carries MCP annotations: a title ("Get price"), `openWorldHint`, and `readOnlyHint`. The eight write tools (`submit_listing`, `book_kol_campaign`, `request_custom_research`, `monitor_keyword`, `generate_due_diligence`, `generate_tokenomics_model`, `summarize_whitepaper`, `translate_contract`) set `readOnlyHint`, `destructiveHint` and `idempotentHint` to false.
- Invalid arguments answer `BCA_BAD_REQUEST` with "field: problem" pairs instead of `BCA_UNKNOWN` and a raw issue list; the webhook URL checks in `monitor_keyword` do the same. An argument the tool does not take (a typo, or a 0.6.2 name such as `objective` or `deadline_days`) is reported as `name: Unrecognized key` instead of being dropped while the call goes through, as `additionalProperties: false` in tools/list says and as `bca-mcp` on PyPI does. API 4xx errors carry the API's own detail (up to 500 characters, inside an `untrusted_content` fence); 5xx errors stay generic, and a response that is not JSON is no longer quoted in the error.
- `book_kol_campaign`, `submit_listing` and `request_custom_research` match the API request models, so real calls no longer fail with 422. `book_kol_campaign` takes `project_name`, `campaign_type` (thread, video, space, podcast, hybrid) and a `budget_usd` of at least 500. `submit_listing` takes `listing_url`, a `description` of at least 20 characters and the API's directory names (`trading_bots`, `nft_communities`, ...). `request_custom_research` takes a `topic` of at least 4 characters plus the API's `target_wordcount` and `deadline` (the ignored `deadline_days` is gone). Descriptions say these are free to submit with an API key and return `request_id`, `status` and `next_step`.
- Demo banner and README: 17 tools work without a key (the API's demo allowlist, `get_article` included, and its description says so); the other 88 answer with a clean upgrade message. The banner's second line reads "A free key opens 52 tools and paid plans open the rest" (it said a free key opened all tools), and `server.json`, the README and the submission copy say the same.
- `get_explainer` states 38 lessons in 8 courses (was 43 in 9) and uses course slugs that exist; `list_topics` names only the API's 10 taxonomy topics.
- No em dashes in tool descriptions, the README, the banner or error messages.
- Argument bounds now equal the API's wherever the client allowed more, so these calls fail locally with `BCA_BAD_REQUEST` instead of an API 422: history `days` at most 365 (was 3,650); `list_jobs.company_slug` at most 160 characters; `monitor_keyword.keyword` 2 to 200 characters; `limit` at most 100 on `list_entities` and `list_entity_mentions` and at most 200 on `list_currencies`; `search_academy.q` at least 2 characters; `get_price` at most 50 ids and `vs` (also on `get_ohlc`) 3 to 10 lowercase letters; `get_ohlc.id` and `get_defi_protocol.protocol` at most 64 characters; `get_pair_data` chain 2 to 32 and pair 32 to 66 characters; `get_wallet_profile.address` and `get_tx.hash` in the API's EVM or Solana formats; `get_token_holders.contract` exactly 42 characters; `compare_protocols` at most 5 slugs; `check_memecoin_risk.mint` 32 to 48 characters; `get_options_flow.symbol` three letters; `get_funding_rates`, `get_liquidation_heatmap` and `get_exchange_flows` symbols at least 2 characters; `track_narrative.narrative` 2 to 80 characters; `get_prediction_markets.topic` at most 64 characters; `track_sec_filings.ticker` letters only; `check_phishing_domain.domain` at least 3 characters; `list_yields` chain at most 32 characters and `min_apy` 0 to 1,000; `list_vcs.stage` letters, digits, spaces, `_` and `-`; `get_smart_contract_template.slug` at most 160 and `get_marketing_template.slug` at most 200 characters; `build_custom_indicator.formula` 3 to 256 characters; `get_bug_bounty_programs.min_payout` at least 0. `request_custom_research.topic` now allows up to 256 characters, as the API does.
- `get_regulatory_status`, `get_tax_rules` and the new `get_mica_status.country` take a two-letter ISO 3166 code only (the API answered 422 to country names); EL and UK are read as GR and GB.
- Each indicator offers only the windows the API computes: `get_coverage_index` and `get_narrative_strength` 7d, 30d, 90d; `get_sentiment_velocity` 7d, 30d; `get_editorial_premium` and `get_kol_influence` 30d, 90d. `track_narrative` takes 7d, 30d or 90d (1d was never computed, 90d is), `get_trending` adds 6h, and `list_theses.status` adds invalidated and pending (all means no filter).
- New optional arguments the API supports: `peer` is optional on `get_history_correlation`; `granularity` (hourly or daily) on `get_history_prices`; `limit` and `expiry` on `get_options_flow`; `exchange` (binance, coinbase, upbit) on `predict_listing`; `history_days` on `get_defi_protocol`; `mode` (trending or new) on `track_pumpfun`; `venue` on `get_prediction_markets`; `window` on `get_social_signals` (plus `currencies`) and `get_social_signals_detail`; `limit`, `offset` and `type` on `list_sources`; `country` on `get_mica_status`, whose `entity_slug` is now optional; `chain`, `min_usd_loss` and `limit` on `check_exploit_history`; `chain` on `get_bug_bounty_programs`; `chain` and `limit` on `list_aggregators`; `ticker` on `search_news`; `offset` on `search_news`, `list_entities`, `list_entity_mentions` and `search_academy`, whose answers set `meta.pageInfo.hasNextPage`; `unlock_shock_pct` on `generate_tokenomics_model`; `language` on `summarize_whitepaper`.
- `list_yields` sends `min_apy` under the API's name, `min_apy_pct`; `build_custom_indicator` sends only `formula` (the API has no `target`, which stays accepted and is described as not read).
- No argument was removed. Arguments the API accepts but does not apply yet stay, and their descriptions say so: `generate_due_diligence.focus`, `generate_tokenomics_model.scenarios`, `summarize_whitepaper.length` other than standard, `get_mica_status.entity_slug`, `get_exchange_flows.window`, `get_funding_rates.exchanges`. `scenarios` and `get_exchange_flows.window` lost their defaults, so they are sent only when the caller sets them.
- `get_entity` ticker lookups stay on `/v1/entities?ticker=`: the slug route resolves slugs and aliases, not tickers, so the ticker form needs an API key (the description says so; the slug form works without one).
- The per-field `untrusted_content` fences read the API's payload shapes: `data.results[].summary` (`search_news`), `data.result.summary` and `data.results[].summary` (`get_entity`), `data.result.body_md` (`get_article`), `data.results[].context_snippet` (`list_entity_mentions`) and the job `result` of `get_agent_job`, including the whitepaper summary object. The fence around the whole `data` payload is unchanged.
- `BCA_API_KEY` is trimmed of surrounding whitespace, and a blank key falls back to the demo key. A key that is not a valid header value (a line break inside it) answers `BCA_AUTH` with a fixed message instead of a `BCA_NETWORK` error that repeated the key.
- Tool descriptions say what the API returns today: `get_as_of_snapshot` is free and open without a key; `list_entities` has about 150 entities; `get_explainer` takes course and lesson slugs; `search_news` covers 3,800+ articles; `get_wallet_profile` has no address labels; `get_compute_pricing` has live Akash prices only; `check_memecoin_risk`, `get_degen_leaderboard`, `track_bonkfun`, `get_liquidation_heatmap`, `get_exchange_flows` and `get_kol_influence` answer unseeded; `monitor_keyword` saves the subscription but sends no webhook; tweet-based tools say the X reader is off; the indicators explain `meta.status`; `get_trending`, `get_options_flow`, `get_team_info`, `get_audit_reports`, `check_rugpull_risk`, `get_tokenomics`, `get_roadmap`, `compare_protocols`, the directories and the regulatory, security and service tools no longer promise fields or sources the API does not have.
- README: a Response status section (`meta.status` complete, partial, stale, unseeded and where `meta.diagnostic` puts the detail), the attribution example shows `citations[]` with `citations[0]` as the primary source, the errors section speaks of every failed tool call, one corpus count (3,800+), and the old `integration_pending` line is gone.
- `server.json` `packages[0].version` is 0.6.3.
- Submission copy (SUBMISSION_ENTRY.json, ANTHROPIC_SUBMISSION.md, SUBMISSION_CHECKLIST.md, registry/, docs/launch/, docs/submissions/) has no em dashes and states 105 tools in 19 categories, 17 tools without a key and 38 lessons in 8 courses; tool names, REST routes and parameters in it are the real ones. SECURITY.md has no em dashes either.
- `examples/research-agent.ts` reads the fenced `data` payload and its `results`, so its `get_entity` step runs (it read a `data.articles` key the tool result never had).
- `summarize_whitepaper.url` must start with http:// or https://, as the API's URL type requires; other schemes failed with a 422 from the API and now fail locally with `BCA_BAD_REQUEST`.
- `get_options_flow.expiry` is checked locally for the two forms the API reads (13NOV26 or 2026-11-13).
- `search_news.since` takes a bare ISO date such as 2026-10-01, as its description and the API do; it was refused unless it carried a time.
- `get_agent_job` fences the strings of the whitepaper summary at every depth, so the `tokenomics` object and named team entries are fenced too (only the top level was).
- Descriptions: `scan_contract` lists the fields it returns (no owner lookup), `get_audit_reports` is partial only when every audit on file is a DefiLlama link, and `get_mica_status` returns a reviewed row for a country outside the EU and EEA instead of always answering unseeded.

## [0.6.2] — 2026-10-19

### Added — live crypto jobs (1 new tool, 104 → 105)

`list_jobs` now returns real data: 1,300+ open roles at 50+ crypto companies, collected every 6 hours from the companies' own job boards, with apply links to the company's own page. Both job tools are available on the demo tier.

- `list_jobs`: inputs now match the API (keyword, role category, remote, location, employment type, company); the old `seniority` / `chain` filters were never supported upstream and are removed. Descriptions are opt-in.
- `get_job`: one role in full, with apply link and BCA job page URL.

## [0.6.1] — 2026-10-19

### Added — grants (2 new tools, 102 → 104)

The live grants directory behind blockchainacademics.com/grants: 200+ crypto, web3, AI and public-funding programs, each checked against the funder's page weekly. Expired rounds are never returned.

- `search_grants`: filter by keyword, ecosystem (web3, ai, web2_cloud, gov, edu), country, minimum award, application complexity and deadline. Soonest deadline first.
- `get_grant`: one program in full, with apply link and last verified date.

## [0.6.0] — 2026-10-09

### Added — crypto Twitter intelligence (3 new tools, 99 → 102)

BCA's read of what crypto Twitter is saying, as analysis in our own words with X post URLs as citations (never reposted post text). Pro tier.

- `get_ct_pulse`: last-24h takeaway, top stories, narratives heating or cooling, sourced numbers, notable posts. No topic = latest scheduled market snapshot.
- `get_x_signals`: breaking stories surfaced on X before news outlets, by lane (security = hacks/exploits, news = exchanges/regulators/ETF data, keyword), with confidence and on-chain evidence flags.
- `get_kol_consensus`: where credible CT voices stand on the most-covered tokens (stance, bull/bear account counts, key points, links).

### Changed

- `get_social_pulse` is now live (was returning `integration_pending`): CT sentiment score, label, mention trend, bull/bear points, narratives, notable posts.
- `get_article` works without an API key (rate-limited per IP), so agents can read any article link.

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
