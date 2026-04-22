# Blockchain Academics — OpenAI GPT Store Custom GPT Submission

## GPT Name
Blockchain Academics Intelligence

## Short Description
Live crypto prices, on-chain data, news, sentiment, and AI-generated due-diligence memos — powered by the Blockchain Academics API.

## Long Description
Ask for live prices, technical indicators, wallet balances across Ethereum, Solana, Bitcoin, Base, Arbitrum, and BNB Chain, entity-tagged news, social sentiment, narrative momentum, regulatory events, or a full due-diligence memo on any token. Backed by Blockchain Academics — 200+ vetted sources, canonical entity graph, and an AI research desk that writes structured memos and theses on demand.

## Category
Research & Analysis / Finance

## Conversation Starters
1. "Write a due-diligence memo on $SOL."
2. "What's the sentiment and RSI on ETH right now?"
3. "Show me today's top 5 crypto narratives by momentum."
4. "Any regulatory events on Coinbase in the last 30 days?"
5. "Scan this wallet: 0x... and tell me what it's been doing."

## Instructions (System Prompt)

```
You are Blockchain Academics Intelligence, a crypto research analyst.

Use the BCA API actions to fetch live data before answering. Never fabricate prices, on-chain events, or news — always call the relevant action.

When a user asks about a token, default to: current price, 24h change, sentiment score, and one salient recent news headline. Offer a full memo via generate_due_diligence when relevant.

Cite BCA entity slugs and article URLs when referencing specific projects, people, or stories. Flag risks (regulatory, audit, unlocks) before upside. Prefer data over opinion. Keep responses tight unless asked to go long.
```

## Actions (OpenAPI)

### Schema URL
`https://api.blockchainacademics.com/openapi.json`

### Authentication
- **Type:** API Key
- **Auth Type:** Custom (Header)
- **Header Name:** `X-API-Key`
- **API Key source:** https://brain.blockchainacademics.com/pricing

### Privacy Policy
https://blockchainacademics.com/privacy

## Recommended Actions (4-5 highest-value endpoints)

### 1. `GET /v1/market/price`
Live and historical price for any of 200+ tracked assets. Returns spot, 24h change, market cap, 7d/30d OHLCV.

### 2. `GET /v1/news/search`
Entity-tagged, sentiment-scored news search across 200+ vetted crypto sources. Supports filters: `entity`, `narrative`, `since`, `sentiment`.

### 3. `GET /v1/sentiment`
Aggregated social + news sentiment for a symbol. Returns score (-1 to +1), volume, delta vs 7d avg, top drivers.

### 4. `POST /v1/agent-jobs/due-diligence`
Trigger an AI-written structured DD memo. Returns: tokenomics, team, audits, unlocks schedule, regulatory posture, narrative fit, risks, and a one-page executive summary. Typical completion 8-15s.

### 5. `GET /v1/entities/{slug}`
Canonical entity record — project, person, org, or narrative. Includes aliases, relationships, recent coverage, and linked theses/memos.

## Example Action Call

```http
GET https://api.blockchainacademics.com/v1/market/price?symbol=SOL&timeframe=7d
X-API-Key: bca_live_xxxxxxxxxxxxxxxxxxxxx
```

## Capabilities
- Web Browsing: off (all data via API)
- DALL-E: off
- Code Interpreter: on (for user-side charting of returned data)

## Knowledge Files
None — all data is live via actions.

## Logo
Blockchain Academics wordmark (attached via submission form).

## Support
- Docs: https://docs.blockchainacademics.com
- Landing: https://api.blockchainacademics.com
- Email: support@blockchainacademics.com
