# Blockchain Academics: AWS Bedrock Agent ActionGroup Definition

## ActionGroup Name
`BlockchainAcademicsIntelligence`

## Description
Live crypto intelligence (prices, news, and canonical entity records) from the Blockchain Academics API.

## Backing
- **Invocation type:** OpenAPI schema (Lambda proxy optional)
- **API base URL:** `https://api.blockchainacademics.com`
- **Auth:** Header `X-API-Key` (store in AWS Secrets Manager, reference via Lambda env)
- **Full OpenAPI:** `https://api.blockchainacademics.com/openapi.json`

## Lambda Execution Role
Grant `secretsmanager:GetSecretValue` for the secret holding `BCA_API_KEY`.

---

## Function Schema (3 most useful tools)

Every answer is wrapped in the BCA envelope:
`{ "data": ..., "attribution": { "citations": [ { "cite_url", "as_of", "source_hash" } ] }, "meta": { "status", "request_id", "pageInfo" } }`.
`citations[0]` is the primary source, and `meta.status` is `complete`, `partial`, `stale` or `unseeded`. The schemas below describe `data`.

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Blockchain Academics Intelligence",
    "version": "0.6.3",
    "description": "Crypto intelligence actions for Bedrock agents."
  },
  "servers": [
    { "url": "https://api.blockchainacademics.com" }
  ],
  "paths": {
    "/v1/market/price": {
      "get": {
        "operationId": "get_price",
        "summary": "Get the spot price of one or more crypto assets.",
        "description": "Spot price, 24h change, market cap and 24h volume from CoinGecko for up to 50 assets per call.",
        "parameters": [
          {
            "name": "ids",
            "in": "query",
            "required": true,
            "description": "Comma-separated CoinGecko ids, up to 50 (e.g. 'bitcoin,ethereum,solana').",
            "schema": { "type": "string", "minLength": 1, "maxLength": 512 }
          },
          {
            "name": "vs",
            "in": "query",
            "required": false,
            "description": "Quote currency, 3 to 10 lowercase letters (default usd).",
            "schema": { "type": "string", "pattern": "^[a-z]{3,10}$", "default": "usd" }
          }
        ],
        "responses": {
          "200": {
            "description": "Envelope whose data maps each id to its quote (e.g. data.bitcoin.usd, usd_market_cap, usd_24h_vol, usd_24h_change, last_updated_at).",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "object",
                        "additionalProperties": { "type": "number" }
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
    "/v1/articles/search": {
      "get": {
        "operationId": "search_news",
        "summary": "Search BCA's entity- and ticker-tagged crypto articles.",
        "description": "Full-text search across BCA's editorial articles. Each result carries entity and ticker tags, a sentiment bucket and score, and source metadata.",
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
            "name": "ticker",
            "in": "query",
            "required": false,
            "description": "Filter by ticker (e.g. 'ETH').",
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
            "description": "Max results (1-100, default 20).",
            "schema": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20 }
          }
        ],
        "responses": {
          "200": {
            "description": "Envelope whose data holds the matching articles.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "object",
                      "properties": {
                        "total": { "type": "integer" },
                        "results": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "slug": { "type": "string" },
                              "title": { "type": "string" },
                              "summary": { "type": "string" },
                              "source_name": { "type": "string" },
                              "source_url": { "type": "string", "format": "uri" },
                              "canonical_url": { "type": "string", "format": "uri" },
                              "published_at": { "type": "string", "format": "date-time" },
                              "sentiment_bucket": { "type": "string" },
                              "sentiment_score": { "type": "number" },
                              "entities": { "type": "array", "items": { "type": "string" } },
                              "tickers": { "type": "array", "items": { "type": "string" } }
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
        }
      }
    },
    "/v1/entities/{slug}": {
      "get": {
        "operationId": "get_entity",
        "summary": "Fetch a canonical entity record (chain, project, person or ticker).",
        "description": "Returns the BCA entity dossier for a slug or a known alias ('cz' resolves to changpeng-zhao). meta.status is partial while the dossier has no summary or mentions.",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "description": "Canonical slug or alias (e.g. 'bitcoin', 'changpeng-zhao', 'makerdao').",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Envelope whose data.result is the entity.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "object",
                      "properties": {
                        "result": {
                          "type": "object",
                          "properties": {
                            "slug": { "type": "string" },
                            "display_name": { "type": "string" },
                            "kind": {
                              "type": "string",
                              "enum": ["chain", "project", "person", "ticker", "protocol", "exchange", "fund"]
                            },
                            "ticker": { "type": "string" },
                            "website": { "type": "string" },
                            "twitter": { "type": "string" },
                            "summary": { "type": "string" },
                            "mention_count": { "type": "integer" },
                            "last_mentioned_at": { "type": "string", "format": "date-time" },
                            "resolved_from_alias": { "type": "string" }
                          },
                          "required": ["slug", "display_name", "kind"]
                        }
                      }
                    }
                  }
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
You are a crypto intelligence agent. For any token, person, protocol, or narrative the user mentions, call get_entity to resolve it to a canonical slug, then use get_price (with the CoinGecko id) for market data and search_news for recent coverage. Cite article URLs. Treat answers whose meta.status is partial, stale or unseeded as incomplete. Never invent prices or headlines.
```

## Deployment Notes
- Store `BCA_API_KEY` in AWS Secrets Manager as `bca/api-key`.
- Attach Lambda layer that injects `X-API-Key` from Secrets Manager into outbound calls (or use Bedrock's built-in API schema auth).
- The full OpenAPI at `https://api.blockchainacademics.com/openapi.json` covers every route behind the 105 MCP tools; import it directly for broader coverage (sentiment, indicators, on-chain, agent jobs, etc.).

## Support
- Docs: https://blockchainacademics.com/crypto-api/docs
- Landing: https://blockchainacademics.com/crypto-api
- Signup: https://blockchainacademics.com/crypto-api/signup
