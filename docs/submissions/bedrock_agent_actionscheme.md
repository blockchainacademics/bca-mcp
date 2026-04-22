# Blockchain Academics — AWS Bedrock Agent ActionGroup Definition

## ActionGroup Name
`BlockchainAcademicsIntelligence`

## Description
Live crypto intelligence — prices, news, and canonical entity records — powered by the Blockchain Academics API.

## Backing
- **Invocation type:** OpenAPI schema (Lambda proxy optional)
- **API base URL:** `https://api.blockchainacademics.com`
- **Auth:** Header `X-API-Key` (store in AWS Secrets Manager, reference via Lambda env)
- **Full OpenAPI:** `https://api.blockchainacademics.com/openapi.json`

## Lambda Execution Role
Grant `secretsmanager:GetSecretValue` for the secret holding `BCA_API_KEY`.

---

## Function Schema (3 most useful tools)

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Blockchain Academics Intelligence",
    "version": "0.2.3",
    "description": "Crypto intelligence actions for Bedrock agents."
  },
  "servers": [
    { "url": "https://api.blockchainacademics.com" }
  ],
  "paths": {
    "/v1/market/price": {
      "get": {
        "operationId": "get_price",
        "summary": "Get live and historical price for a crypto asset.",
        "description": "Returns spot price, 24h change, market cap, and optional OHLCV history for any of 200+ tracked assets.",
        "parameters": [
          {
            "name": "symbol",
            "in": "query",
            "required": true,
            "description": "Ticker symbol (e.g. BTC, ETH, SOL). Case-insensitive.",
            "schema": { "type": "string" }
          },
          {
            "name": "timeframe",
            "in": "query",
            "required": false,
            "description": "Optional history window. One of: 1h, 24h, 7d, 30d, 90d, 1y.",
            "schema": {
              "type": "string",
              "enum": ["1h", "24h", "7d", "30d", "90d", "1y"]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Price payload.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "symbol": { "type": "string" },
                    "price_usd": { "type": "number" },
                    "change_24h_pct": { "type": "number" },
                    "market_cap_usd": { "type": "number" },
                    "ohlcv": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "t": { "type": "integer", "description": "Unix ms" },
                          "o": { "type": "number" },
                          "h": { "type": "number" },
                          "l": { "type": "number" },
                          "c": { "type": "number" },
                          "v": { "type": "number" }
                        }
                      }
                    }
                  },
                  "required": ["symbol", "price_usd"]
                }
              }
            }
          }
        }
      }
    },
    "/v1/news/search": {
      "get": {
        "operationId": "search_news",
        "summary": "Search entity-tagged, sentiment-scored crypto news.",
        "description": "Full-text search across 200+ vetted crypto sources. Results include canonical entity tags, sentiment score, and source metadata.",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "Free-text query (e.g. 'ethereum ETF approval').",
            "schema": { "type": "string" }
          },
          {
            "name": "entity",
            "in": "query",
            "required": false,
            "description": "Filter by canonical BCA entity slug (e.g. 'ethereum', 'securities-and-exchange-commission').",
            "schema": { "type": "string" }
          },
          {
            "name": "since",
            "in": "query",
            "required": false,
            "description": "ISO-8601 datetime lower bound.",
            "schema": { "type": "string", "format": "date-time" }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Max results (1-50, default 10).",
            "schema": { "type": "integer", "minimum": 1, "maximum": 50, "default": 10 }
          }
        ],
        "responses": {
          "200": {
            "description": "Array of news articles.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "title": { "type": "string" },
                          "url": { "type": "string", "format": "uri" },
                          "source": { "type": "string" },
                          "published_at": { "type": "string", "format": "date-time" },
                          "sentiment": { "type": "number", "minimum": -1, "maximum": 1 },
                          "entities": {
                            "type": "array",
                            "items": { "type": "string" }
                          },
                          "summary": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/v1/entities/{slug}": {
      "get": {
        "operationId": "get_entity",
        "summary": "Fetch canonical entity record (project, person, org, narrative).",
        "description": "Returns canonical BCA entity with aliases, relationships, recent coverage, and linked research memos/theses.",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "description": "Canonical slug (e.g. 'bitcoin', 'changpeng-zhao', 'makerdao').",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Entity record.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "slug": { "type": "string" },
                    "name": { "type": "string" },
                    "type": {
                      "type": "string",
                      "enum": ["project", "person", "org", "narrative", "chain", "protocol"]
                    },
                    "aliases": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "description": { "type": "string" },
                    "relationships": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "target_slug": { "type": "string" },
                          "relation": { "type": "string" }
                        }
                      }
                    },
                    "recent_articles": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "title": { "type": "string" },
                          "url": { "type": "string" }
                        }
                      }
                    },
                    "memos": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "theses": {
                      "type": "array",
                      "items": { "type": "string" }
                    }
                  },
                  "required": ["slug", "name", "type"]
                }
              }
            }
          },
          "404": { "description": "Entity not found." }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  },
  "security": [{ "ApiKeyAuth": [] }]
}
```

---

## Sample Bedrock Agent Instruction

```
You are a crypto intelligence agent. For any token, person, protocol, or narrative the user mentions, call get_entity to resolve it to a canonical slug, then use get_price for market data and search_news for recent coverage. Cite article URLs. Never invent prices or headlines.
```

## Deployment Notes
- Store `BCA_API_KEY` in AWS Secrets Manager as `bca/api-key`.
- Attach Lambda layer that injects `X-API-Key` from Secrets Manager into outbound calls (or use Bedrock's built-in API schema auth).
- Full 98-tool OpenAPI available at `https://api.blockchainacademics.com/openapi.json` — import directly for broader coverage (sentiment, indicators, on-chain, agent-jobs, etc.).

## Support
- Docs: https://docs.blockchainacademics.com
- Landing: https://api.blockchainacademics.com
- Signup: https://brain.blockchainacademics.com/pricing
