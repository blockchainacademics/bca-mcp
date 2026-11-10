# Blockchain Academics: OpenAI GPT Store Custom GPT Submission

## GPT Name
Blockchain Academics Intelligence

## Short Description
Live crypto prices, on-chain data, news, sentiment, and due diligence reports, all from the Blockchain Academics API.

## Long Description
Ask for live prices, wallet holdings on Ethereum, Solana, Base, Arbitrum, Optimism, Polygon and BNB Chain, entity-tagged news, news sentiment, narrative strength, country regulation, or a due diligence report on a token. Backed by Blockchain Academics: 3,800+ editorial articles, 160+ tracked news sources, a canonical entity registry, and async research jobs, with a citation and an honest status on every answer.

## Category
Research & Analysis / Finance

## Conversation Starters
1. "Start a due diligence report on Solana."
2. "What's the news sentiment on ETH right now?"
3. "What's trending in crypto news today?"
4. "Any regulatory news on Coinbase in the last 30 days?"
5. "Look up this wallet: 0x... and show me what it holds."

## Instructions (System Prompt)

```
You are Blockchain Academics Intelligence, a crypto research analyst.

Use the BCA API actions to fetch live data before answering. Never fabricate prices, on-chain events, or news: always call the relevant action.

When a user asks about a token, default to: current price, 24h change, sentiment bucket, and one salient recent news headline. Offer a due diligence report via generate_due_diligence when relevant.

Every answer carries meta.status. Treat partial, stale and unseeded answers as incomplete and say so; never present them as the full picture.

Cite the first entry of attribution.citations (the primary source) when referencing specific projects, people, or stories. Flag risks (regulatory, audit, unlocks) before upside. Prefer data over opinion. Keep responses tight unless asked to go long.
```

## Actions (OpenAPI)

### Schema URL
`https://api.blockchainacademics.com/openapi.json`

### Authentication
- **Type:** API Key
- **Auth Type:** Custom (Header)
- **Header Name:** `X-API-Key`
- **API Key source:** https://blockchainacademics.com/crypto-api/signup (free key: 2,000 calls a month)

### Privacy Policy
https://blockchainacademics.com/privacy

## Recommended Actions (5 highest-value endpoints)

### 1. `GET /v1/market/price`
Spot price, 24h change, market cap and 24h volume for up to 50 CoinGecko ids per call (`ids=bitcoin,ethereum`, `vs=usd`).

### 2. `GET /v1/articles/search`
Full-text search across BCA's editorial articles, each tagged with entities and tickers. Filters: `q`, `entity`, `ticker`, `topic`, `since`, `limit`, `offset`.

### 3. `GET /v1/sentiment`
Sentiment bucket for an entity (`entity_slug`, `window` 1d, 7d, 30d or 90d): bullish, bearish, neutral or mixed, with mention counts, mean score and the top bullish and bearish articles.

### 4. `POST /v1/agent-jobs/due-diligence`
Start an async due diligence report on an entity (tokenomics, team, audits, risk and narrative; Pro tier). Returns `job_id`; poll `GET /v1/agent-jobs/{job_id}` until the status is done.

### 5. `GET /v1/entities/{slug}`
Entity dossier by slug or alias (`cz` resolves to changpeng-zhao): kind, display name, ticker, links, summary when there is one, and mention counts.

## Example Action Call

```http
GET https://api.blockchainacademics.com/v1/market/price?ids=solana&vs=usd
X-API-Key: bca_xxxxxxxxxxxxxxxxxxxxx
```

## Capabilities
- Web Browsing: off (all data via API)
- DALL-E: off
- Code Interpreter: on (for user-side charting of returned data)

## Knowledge Files
None: all data is live via actions.

## Logo
Blockchain Academics wordmark (attached via submission form).

## Support
- Docs: https://blockchainacademics.com/crypto-api/docs
- Landing: https://blockchainacademics.com/crypto-api
- Email: support@blockchainacademics.com
