## Reddit Post: r/CryptoCurrency

**Rules found on 2026-11-07, before posting:**

Reddit blocks this machine, so the official rules page could not be read here. Outside rule trackers (checked between May and September 2026) report:

- Self-promotion is restricted. Posting your own product is a common removal.
- Promotion is allowed only with moderator approval or in the designated, flaired threads.
- Referral codes and promo links are banned and can cost the account.
- Posting has an account age and karma gate (one tracker gives 60+ days and 100+ karma), and the daily thread's old exemption from it has ended.
- AutoMod filters token names, and token or project shilling is removed.

**How this post fits them:**

- Read the sidebar rules first, then send this draft to the mods by modmail. Post only with their OK, under the flair they name.
- Post from an account that clears the age and karma gate, and stay to answer comments.
- The affiliation is disclosed in the first paragraph. No referral or tracking links, no price talk, no token picks, and one link (the docs, on blockchainacademics.com).
- It ends on a question for the sub.
- If the mods say no, r/mcp is the natural home for an MCP server launch: read its rules page first. Don't cross-post the same text to other subreddits.

---

**Title:**
Blockchain Academics MCP: crypto tools for AI agents where every answer cites its sources

---

**Body:**

Blockchain Academics MCP is an MIT licensed MCP server that lets an AI agent look up crypto news, prices, wallets and transactions, sentiment, grants and jobs: 105 tools in 19 categories. Disclosure: I'm the founder of Blockchain Academics, which makes it and runs the API behind it.

An agent's crypto answers are only as good as its sources, so every answer comes with them:

- `attribution.citations[]` is on every answer. `citations[0]` is the primary source, the original article or the upstream page, with a timestamp and a hash.
- `meta.status` says how complete the answer is: complete, partial (with what is missing), stale (with how old the data is) or unseeded (with why there is nothing yet). A tool with no data yet says so instead of making something up.

What's behind it:

- 3,800+ public articles, each linked to the coins and projects it mentions (bitcoin has 1,400+ linked mentions, ethereum 1,000+)
- about 150 entity dossiers ("cz" resolves to Changpeng Zhao)
- sentiment rolled up every hour, indicators recomputed every 4 hours, daily price history since April

You can try it without signing up. 17 tools work with no key in Claude Desktop, Cursor or any MCP client:

    npx -y @blockchainacademics/mcp

Python 3.11+: `uvx bca-mcp`. A free key opens 52 tools, and paid plans open the rest. Docs and the full tool list: https://blockchainacademics.com/crypto-api/docs

A question for anyone using AI for crypto research: where do agents get crypto facts wrong for you? Stale prices, invented sources, the wrong token behind a ticker? Your answers decide what we fix next.
