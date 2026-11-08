## Hacker News: Show HN

---

**Title:**
Show HN: bca-mcp, a crypto MCP server where every answer cites its sources

**URL:**
https://github.com/blockchainacademics/bca-mcp

---

**Text:**

bca-mcp is an MCP server that gives AI agents 105 crypto tools in 19 categories: news search, entity dossiers, prices, wallets and transactions, sentiment, indicators, history, grants and jobs. Every answer carries its sources and a status that says how complete it is, so an agent can cite what it says and can tell when data is partial, stale or missing.

You can try it without signing up. 17 tools work with no key of your own (the package ships a shared demo key with a daily cap):

  npx -y @blockchainacademics/mcp

or, with Python 3.11+:

  uvx bca-mcp

Add it to Claude Desktop, Cursor or any MCP client and ask about a coin, a project or a person. A free key (2,000 calls a month, no card) opens 52 tools, and the paid plans open the rest.

What the data is:

- 3,800+ public articles, each linked to the coins and projects it mentions (bitcoin has 1,400+ linked mentions, ethereum 1,000+), searchable by entity, ticker, topic and date

- about 150 entity dossiers with alias resolution ("cz" resolves to changpeng-zhao)

- sentiment rolled up hourly from the news, and indicators such as the coverage index and narrative strength recomputed every 4 hours

- daily price history since April, plus an as_of query that returns the corpus as it stood on a past date

- 38 academy lessons in 8 courses

Every response uses the same envelope:

  {data, attribution: {citations: [{cite_url, as_of, source_hash}]}, meta: {status, request_id, pageInfo}}

citations[0] is the primary source: the upstream page when there is one (the original article, the market data or block explorer page, a regulator), otherwise our page for the record or the tool's reference entry. source_hash is the record's own hash or a hash of the data, so you can tell when an answer changed between calls.

meta.status is complete, partial (meta.diagnostic.missing lists what is absent), stale (meta.diagnostic.as_of says when the data is from) or unseeded (meta.diagnostic.reason says why there is nothing yet). Some tools have no data source connected yet, such as liquidation heatmaps, exchange flows and the memecoin checks. They answer unseeded with the reason instead of making something up.

Details:

- MIT licensed, in TypeScript and Python: https://github.com/blockchainacademics/bca-mcp and https://github.com/blockchainacademics/bca-mcp-python

- 0.6.3 is on npm (with provenance), PyPI and the official MCP registry as io.github.blockchainacademics/mcp

- The same key works over REST, with an OpenAPI spec: https://blockchainacademics.com/crypto-api/docs/reference/rest-api

- Behind it: FastAPI, Postgres and Redis. The MCP servers are thin clients over the REST API.

- Docs: https://blockchainacademics.com/crypto-api/docs, and every tool with its arguments and tier: https://blockchainacademics.com/crypto-api/docs/reference/tools

I'm Wael, founder of Blockchain Academics, and I'll be in the thread. What I'd most like feedback on:

1. The envelope. Is source_hash useful to you, or noise? We made citations an array in 0.3 so clients that read citations[0] keep working as more sources are added.

2. What's missing for the agent you're building?

3. For backtesting, is the as_of corpus query plus the daily history enough, or what else would you need?

---

**Posting notes (Show HN rules: https://news.ycombinator.com/showhn.html):**
- The title starts with "Show HN", names the project first, and has no superlatives, capitals or exclamation marks. The tool count stays in the text, because HN crops gratuitous numbers from titles.
- The URL is the repo, not a signup or landing page, and people can try it with no signup (the 17 tools that need no key).
- Paste the text as it is: HN keeps the indented lines as code and needs the blank lines between list items. If HN does not show the text with the link, post it as the first comment.
- Stay in the thread to answer questions, and don't ask anyone to upvote or comment.
