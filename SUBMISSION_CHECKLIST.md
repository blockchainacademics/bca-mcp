# Anthropic MCP Directory: Submission Checklist

**Package:** `@blockchainacademics/mcp` v0.6.3
**npm:** https://www.npmjs.com/package/@blockchainacademics/mcp
**Source:** https://github.com/blockchainacademics/bca-mcp
**Target:** https://github.com/modelcontextprotocol/servers
**Maintainer:** dev@blockchainacademics.com

This is the single operational runbook for submitting to the MCP directory.
Once the Loom is recorded, submission is ~5 minutes of copy-paste.

---

## 0. Pre-flight checklist (must be 100% green before PR)

### Package integrity
- [ ] `package.json` `version` = `0.6.3`
- [ ] `server.json` `version` = `0.6.3` and `packages[0].version` = `0.6.3`
- [ ] `server.json` `_meta....tool.version` = `0.6.3`
- [ ] `_meta....tool_count` = `105` and `sum(tool_categories[].count) = 105` (19 categories)
- [ ] `npm view @blockchainacademics/mcp version` returns `0.6.3` (registry propagated)
- [ ] `npx -y @blockchainacademics/mcp` boots clean on a non-dev shell (fresh machine); without a key it prints the demo banner (17 tools work without a key)
- [ ] `LICENSE` present at repo root (MIT)
- [ ] `CHANGELOG.md` has a `0.6.3` entry
- [ ] GitHub tag `v0.6.3` pushed: `git tag -a v0.6.3 -m "v0.6.3" && git push origin v0.6.3`

### Security
- [ ] npm publish token **rotated** after any recent CI/debug use (manual: Wael)
- [ ] `rm -rf dist && npm run build && npm pack --dry-run`: the file list contains **only** `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `tools.json`
- [ ] No `.env`, `.npmrc`, or keys in tarball
- [ ] `gitleaks` clean on working tree (`pre-commit run gitleaks --all-files`)

### Known drift (from the audit)
- [x] README header carries no version any more
- [ ] Align README category grouping (20 rows) with `server.json._meta.tool_categories` (19 categories); both total 105
- [x] Free-tier call count: `server.json` and README §API Key both say 2,000 a month
- [x] `BCA_API_BASE` vs `BCA_API_BASE_URL`: the client reads `BCA_API_BASE` (the name `server.json` declares) and still accepts `BCA_API_BASE_URL`

### Loom
- [ ] Loom recorded from script in §4 below
- [ ] Loom URL is public (no login required)
- [ ] Loom URL pasted into PR body (replacing `[LOOM_URL]`)

---

## 1. Fork + branch commands (exact)

```bash
# 1. Fork and clone upstream
cd ~
gh repo fork modelcontextprotocol/servers --clone --remote
cd servers

# 2. Sync main with upstream (safety)
git fetch upstream
git checkout main
git merge --ff-only upstream/main

# 3. Create branch
git checkout -b add-blockchainacademics-mcp

# 4. Inspect current format on main: READ FIRST, EDIT SECOND
less README.md    # find the Community Servers section; note bullet vs table
# Also check whether a manifest file exists:
ls -la | grep -Ei 'servers\.(json|ya?ml)|community' || echo "no manifest, README only"

# 5. Edit README.md (and/or manifest) using the entries in SUBMISSION_ENTRY.json.
#    Insert alphabetically under "B" (sorts as "Blockchain Academics").
$EDITOR README.md

# 6. Verify diff is minimal: single-line addition to README
git diff --stat      # expect: README.md | 1 +   (or manifest | N + if manifest style)
git diff README.md   # eyeball exact line

# 7. Commit
git add README.md    # add the manifest file too if that's the upstream format
git commit -m "Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)"

# 8. Push to fork
git push -u origin add-blockchainacademics-mcp

# 9. Write PR body to temp file (§3 below) WITH LOOM URL FILLED IN
$EDITOR /tmp/bca-mcp-pr-body.md

# 10. Open PR
gh pr create \
  --repo modelcontextprotocol/servers \
  --base main \
  --head "$(gh api user -q .login):add-blockchainacademics-mcp" \
  --title "Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)" \
  --body-file /tmp/bca-mcp-pr-body.md

# 11. Copy the PR URL from stdout. Done.
```

---

## 2. PR title (exact, <70 chars)

```
Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)
```

---

## 3. PR body (ready to paste; replace `[LOOM_URL]` only)

```markdown
## Summary

Adds **Blockchain Academics**, a production MCP server that gives AI agents
ground-truth crypto data. 105 tools across news, entities, academy, market,
on-chain, sentiment, proprietary indicators, and async agent-backed research
jobs. Wraps `api.blockchainacademics.com`; every response carries
`attribution.citations[]` (`cite_url`, `as_of`, `source_hash`, primary source
first) and an honest `meta.status` (complete, partial, stale or unseeded), so
downstream agents can attribute, verify, and tell a full answer from a thin
one.

## Links

- npm: https://www.npmjs.com/package/@blockchainacademics/mcp
- Source: https://github.com/blockchainacademics/bca-mcp
- API: https://api.blockchainacademics.com (free tier: 2,000 calls/month)
- Docs: https://blockchainacademics.com/crypto-api/docs

## Install (one-liner)

```bash
npx -y @blockchainacademics/mcp
```

Without a key, 17 tools work under a shared daily cap. A free key opens 52
tools and paid plans open the rest; add the key in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

## Example tool calls

Responses below show the envelope the API returns (illustrative values,
truncated). In the MCP tool result the `data` part is wrapped in an
`untrusted_content` fence so the host model treats it as data.

**1. `search_news`**: full-text search across 3,800+ editorial crypto articles

Call:
```json
{ "name": "search_news",
  "arguments": { "query": "Bitcoin ETF approvals", "since": "2026-10-01T00:00:00Z", "limit": 3 } }
```

Response (truncated):
```json
{
  "data": {
    "query": "Bitcoin ETF approvals",
    "count": 3,
    "total": 41,
    "results": [
      { "slug": "sec-second-wave-btc-etfs",
        "title": "SEC greenlights second wave of spot BTC ETFs",
        "published_at": "2026-10-08T14:22:11+00:00",
        "canonical_url": "https://blockchainacademics.com/news/sec-second-wave-btc-etfs",
        "tickers": ["BTC"],
        "entities": ["bitcoin"] }
    ]
  },
  "attribution": {
    "citations": [
      { "cite_url": "https://blockchainacademics.com/news/sec-second-wave-btc-etfs",
        "as_of": "2026-10-08T14:22:11+00:00",
        "source_hash": "c8a4…e1b7" }
    ]
  },
  "meta": { "status": "complete", "pageInfo": { "hasNextPage": true } }
}
```

**2. `get_entity`**: entity dossier by slug (aliases such as `cz` resolve)

Call:
```json
{ "name": "get_entity", "arguments": { "slug": "ethereum" } }
```

Response (truncated):
```json
{
  "data": {
    "result": {
      "slug": "ethereum",
      "kind": "chain",
      "display_name": "Ethereum",
      "ticker": "ETH",
      "website": "https://ethereum.org",
      "summary": null,
      "mention_count": 619
    }
  },
  "attribution": {
    "citations": [
      { "cite_url": "https://ethereum.org",
        "as_of": "2026-11-01T09:15:02Z",
        "source_hash": "sha256:1f92…9d04" }
    ]
  },
  "meta": {
    "status": "partial",
    "diagnostic": { "reason": "entity_not_enriched", "missing": ["summary"] }
  }
}
```

**3. `get_coverage_index`**: BCA's coverage index for an entity

Call:
```json
{ "name": "get_coverage_index", "arguments": { "entity_slug": "solana", "window": "7d" } }
```

Response (truncated):
```json
{
  "data": {
    "entity_slug": "solana",
    "indicator": "coverage_index",
    "window": "7d",
    "value": 72.4,
    "computed_at": "2026-11-01T08:00:00+00:00"
  },
  "attribution": {
    "citations": [
      { "cite_url": "https://blockchainacademics.com/crypto-api/docs/reference/tools?src=other&utm_medium=mcp#get_coverage_index",
        "as_of": "2026-11-01T08:00:00Z",
        "source_hash": "sha256:b703…4ac1" }
    ]
  },
  "meta": { "status": "complete" }
}
```

## Demo

60-second walkthrough (Claude Desktop → `search_news` → cited response):
**[LOOM_URL]**

## Verification

- `npx -y @blockchainacademics/mcp` installs and boots cleanly
- `server.json` conforms to the 2025-12-11 MCP registry schema
- MIT licensed, TypeScript, stdio transport; every failed tool call returns
  an MCP result with `isError: true` and a JSON error code
- Live-tested against `api.blockchainacademics.com` before each release
  ([CHANGELOG](https://github.com/blockchainacademics/bca-mcp/blob/main/CHANGELOG.md))

## Honest status

Tools whose data source is not connected yet (bonk.fun, CoinGlass liquidations
and exchange flows, the degen leaderboard, the memecoin analyzer, among others)
answer `meta.status: "unseeded"` with a reason and an ETA in `meta.diagnostic`
instead of failing or passing off empty data as complete, and their
descriptions say so.

## Maintainer

Blockchain Academics, dev@blockchainacademics.com
Responding to review feedback within 24h.
```

---

## 4. 60-second Loom script (word-for-word)

**Before you hit record:**
1. Close Claude Desktop.
2. Open `~/Library/Application Support/Claude/claude_desktop_config.json` in a visible editor (VS Code / Cursor / nvim).
3. Copy a valid `BCA_API_KEY` (format `bca_...`) to clipboard.
4. Start Loom (or QuickTime) at 1080p, **window mode** (not full screen, for a smaller file).
5. Recording target length: 60 seconds. Do not go over 75.

---

### BEAT 1 (0:00 to 0:10): The config

**On-screen cue:** your editor with `claude_desktop_config.json` visible, empty `mcpServers` or ready to paste.

**Say (verbatim):**
> "This is at-blockchainacademics-slash-mcp: a hundred and five crypto tools for Claude. One config block. Watch."

**Do:** Paste this into the file and hit save. Camera should see the paste land.

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

---

### BEAT 2 (0:10 to 0:20): Restart Claude Desktop

**On-screen cue:** Cmd+Q on Claude, relaunch. The tool/hammer icon populates.

**Say (verbatim):**
> "Restart Claude. A hundred and five tools load under blockchainacademics."

**Do:** Click the hammer icon. Scroll briefly so viewer sees the long list.

---

### BEAT 3 (0:20 to 0:35): Ask a real question

**On-screen cue:** New chat. Type this prompt verbatim:

```
Search crypto news about Bitcoin ETF approvals in the last 30 days, cite your sources.
```

**Say (verbatim):**
> "Ask it about a recent Bitcoin ETF story. Claude will pick the tool itself."

**Do:** Hit enter.

---

### BEAT 4 (0:35 to 0:50): Tool call is visible

**On-screen cue:** Claude invokes `search_news`. Click to expand the tool-call UI.

**Say (verbatim):**
> "Tool call: search underscore news. Here's the exact arguments Claude built, here's the raw response from our API."

**Do:** Hover briefly so viewer sees:
- Tool name: `search_news`
- Arguments with a real `since` date and `limit: 5`
- Raw response showing article titles and an `attribution.citations` block

---

### BEAT 5 (0:50 to 1:00): Cited response + the close

**On-screen cue:** Scroll to Claude's answer. Hover over one of the inline citations so the underlying `cite_url` tooltip shows the source article. Then briefly scroll back to the raw tool response and highlight the `as_of` timestamp and `source_hash` in `citations[0]`.

**Say (verbatim):**
> "Every response: cite URL, timestamp, source hash. Ground truth for agents. Link in the PR. That's it."

**Do:** Stop the recording. Export 1080p. Get the public Loom link. Paste into PR body §3 replacing `[LOOM_URL]`.

---

## 5. After the PR is open

- [ ] Respond to reviewer comments within 24h
- [ ] If reviewer requests a format change, make the edit on `add-blockchainacademics-mcp` and push; the PR updates automatically
- [ ] On merge: post the PR link in `#launches` internal channel and tweet from `@blockchainacad`
- [ ] Update `~/BCA_Intelligence/05_Intelligence/` with the merged PR URL as provenance

---

**Prep owner:** Studio Producer agent (this doc)
**Execution owner:** Wael (Loom + PR)
**Status:** Ready pending Loom recording
